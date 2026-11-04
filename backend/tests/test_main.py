from fastapi.testclient import TestClient

from backend import main


class FakeClassifier:
    def __init__(self, result: object) -> None:
        self.result = result

    def classify(self, patient: main.PatientInput) -> object:
        return self.result


class FakeTable:
    def __init__(self) -> None:
        self.items: list[dict[str, object]] = []

    def put_item(self, *, Item: dict[str, object]) -> None:
        self.items.append(Item)


def setup_function() -> None:
    main.app.dependency_overrides.clear()


def teardown_function() -> None:
    main.app.dependency_overrides.clear()


def test_returns_exact_esi_contract_and_stores_metadata(monkeypatch) -> None:
    table = FakeTable()
    result = {
        "nivel": 2,
        "color": "Naranja",
        "prioridad": "Alta",
        "razonamiento": "Caso de prueba.",
        "alerta_critica": True,
    }
    main.app.dependency_overrides[main.get_classifier] = lambda: FakeClassifier(result)
    monkeypatch.setattr(main, "get_dynamodb_table", lambda: table)

    response = TestClient(main.app).post(
        "/api/triaje",
        json={"sintomas_texto": "dolor torácico"},
    )

    assert response.status_code == 200
    assert response.json() == result
    assert set(response.json()) == {
        "nivel",
        "color",
        "prioridad",
        "razonamiento",
        "alerta_critica",
    }
    assert len(table.items) == 1
    assert table.items[0]["sintomas_texto"] == "dolor torácico"
    assert table.items[0]["nivel"] == 2
    assert table.items[0]["triaje_id"]
    assert table.items[0]["timestamp"]


def test_returns_explicit_error_when_classifier_is_not_configured() -> None:
    response = TestClient(main.app).post(
        "/api/triaje",
        json={"sintomas_texto": "dolor torácico"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Clasificador de IA no configurado"


def test_rejects_inconsistent_esi_response_without_persisting(monkeypatch) -> None:
    table = FakeTable()
    invalid_result = {
        "nivel": 1,
        "color": "Azul",
        "prioridad": "Baja",
        "razonamiento": "Caso de prueba.",
        "alerta_critica": False,
    }
    main.app.dependency_overrides[main.get_classifier] = lambda: FakeClassifier(invalid_result)
    monkeypatch.setattr(main, "get_dynamodb_table", lambda: table)

    response = TestClient(main.app).post(
        "/api/triaje",
        json={"sintomas_texto": "síntoma"},
    )

    assert response.status_code == 502
    assert table.items == []
