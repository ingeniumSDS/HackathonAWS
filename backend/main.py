from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Literal, Protocol

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

logger = logging.getLogger(__name__)


class PatientInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sintomas_texto: str = Field(min_length=1)
    notas_opcionales: str | None = None


class TriageResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nivel: Literal[1, 2, 3, 4, 5]
    color: Literal["Rojo", "Naranja", "Amarillo", "Verde", "Azul"]
    prioridad: str = Field(min_length=1)
    razonamiento: str = Field(min_length=1)
    alerta_critica: bool

    @model_validator(mode="after")
    def validate_esi_consistency(self) -> TriageResult:
        expected_colors = {
            1: "Rojo",
            2: "Naranja",
            3: "Amarillo",
            4: "Verde",
            5: "Azul",
        }
        if self.color != expected_colors[self.nivel]:
            raise ValueError("color must match nivel")
        if self.alerta_critica != (self.nivel in (1, 2)):
            raise ValueError("alerta_critica must be true only for niveles 1 and 2")
        return self


class Classifier(Protocol):
    def classify(self, patient: PatientInput) -> object: ...


class DynamoTable(Protocol):
    def put_item(self, *, Item: dict[str, object]) -> object: ...


class ClassificationError(Exception):
    pass


DEMO_SCENARIO_TEXT = (
    "ESCENARIO SINTETICO DEMO: persona ficticia con una molestia leve de tobillo "
    "tras caminar. Texto inventado para probar la interfaz; no es un caso real "
    "ni contiene signos vitales."
)


class DemoClassifier:
    def classify(self, patient: PatientInput) -> object:
        if patient.sintomas_texto != DEMO_SCENARIO_TEXT:
            raise HTTPException(
                status_code=400,
                detail="El modo demo solo acepta el escenario sintético predefinido",
            )
        return {
            "nivel": 4,
            "color": "Verde",
            "prioridad": "DEMO — resultado simulado",
            "razonamiento": (
                "Resultado fijo para comprobar la interfaz; no deriva de una evaluación clínica "
                "y no debe usarse para tomar decisiones."
            ),
            "alerta_critica": False,
        }


def get_classifier() -> Classifier | None:
    return None


def demo_mode_enabled() -> bool:
    return os.getenv("QUICKTRIAGE_DEMO_MODE", "").strip().lower() == "true"


def get_dynamodb_table() -> DynamoTable:
    dynamodb = boto3.resource(
        "dynamodb",
        region_name=os.getenv("AWS_REGION", "us-east-1"),
    )
    return dynamodb.Table(os.getenv("DYNAMODB_TABLE", "Triajes"))


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/triaje", response_model=TriageResult)
def process_triage(
    patient: PatientInput,
    classifier: Classifier | None = Depends(get_classifier),
) -> TriageResult:
    if demo_mode_enabled():
        result = TriageResult.model_validate(DemoClassifier().classify(patient))
        return result

    if classifier is None:
        raise HTTPException(status_code=503, detail="Clasificador de IA no configurado")

    try:
        result = TriageResult.model_validate(classifier.classify(patient))
    except ClassificationError as exc:
        logger.exception("La clasificación de IA falló")
        raise HTTPException(status_code=502, detail="No se pudo clasificar el triaje") from exc
    except ValidationError as exc:
        logger.exception("El resultado de IA no cumple el contrato ESI")
        raise HTTPException(status_code=502, detail="Respuesta de IA inválida") from exc

    item: dict[str, object] = {
        "triaje_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sintomas_texto": patient.sintomas_texto,
        "notas_opcionales": patient.notas_opcionales or "",
        **result.model_dump(),
    }

    try:
        get_dynamodb_table().put_item(Item=item)
    except (BotoCoreError, ClientError) as exc:
        logger.exception("No se pudo guardar el triaje en DynamoDB")
        raise HTTPException(status_code=503, detail="No se pudo guardar el triaje") from exc

    return result


handler = Mangum(app)
