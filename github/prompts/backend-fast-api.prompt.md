---
description: Genera la estructura completa del servidor FastAPI compatible con AWS Lambda y DynamoDB para el triaje médico.
---

Crea la aplicación FastAPI en Python para el backend de QuickTriage con los siguientes requerimientos:

1. **Importaciones:** `fastapi`, `mangum`, `pydantic`, `boto3`, `uuid`, `datetime` y `os`.
2. **Configuración CORS:** Habilita `CORSMiddleware` para permitir peticiones desde cualquier origen (`allow_origins=["*"]`).
3. **Modelo Pydantic:** Define `PacienteInput` con el campo `sintomas_texto: str` y `notas_opcionales: Optional[str]`.
4. **Integración DynamoDB:** 
   - Conéctate a la tabla DynamoDB `Triajes` en la región `us-east-1` con `boto3`.
5. **Endpoint `/api/triaje` (POST):**
   - Recibe `PacienteInput`.
   - Simula o conecta la llamada a la API de IA (OpenAI/Gemini) inyectando la regla ESI (1 a 5).
   - Genera un objeto JSON con `triaje_id` (UUID4) y `timestamp` ISO.
   - Guarda el registro en DynamoDB mediante `table.put_item()`.
   - Retorna el objeto JSON del triaje.
6. **Adaptador Serverless:** Incluye `handler = Mangum(app)` para despliegue automático en AWS Lambda.

Escribe código limpio, listo para producción en hackathon y sin código explicativo innecesario.