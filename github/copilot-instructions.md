# QuickTriage - GitHub Copilot Instructions

## Contexto del Proyecto
Estamos en un **Hackathon de 90 minutos** construyendo **QuickTriage**: un sistema de triaje médico de emergencia accionado por voz e Inteligencia Artificial que clasifica la urgencia de pacientes según la escala ESI (Emergency Severity Index).

- **Prioridad:** Velocidad de desarrollo, código limpio sin sobreingeniería, cero dependencias innecesarias y apego estricto al contrato de datos.

---

## Stack Tecnológico

### Frontend
- **Framework:** React 18+ (Vite)
- **Styling:** Tailwind CSS
- **Audio:** Web Speech API (`webkitSpeechRecognition` nativo del navegador)
- **Deployment:** AWS Amplify

### Backend
- **Framework:** Python 3.11 + FastAPI
- **Adaptador Serverless:** `Mangum` (para ejecución en AWS Lambda)
- **AWS SDK:** `boto3` (integración con Amazon DynamoDB)
- **AI Integración:** OpenAI API / Google Gemini API (salida estructurada JSON)

---

## Contrato de Datos Obligatorio (JSON)

Toda interacción con la IA y respuesta de las APIs DEBE cumplir con la siguiente estructura de datos exacta:

```json
{
  "nivel": 1 | 2 | 3 | 4 | 5,
  "color": "Rojo" | "Naranja" | "Amarillo" | "Verde" | "Azul",
  "prioridad": "string",
  "razonamiento": "string (máximo 2 oraciones clínicas)",
  "alerta_critica": boolean
}
```

---

## Reglas de Codificación para Copilot

### Frontend (React)
1. **Sin librerías complejas de UI:** Usa utilidades de Tailwind CSS directamente.
2. **Web Speech API:** Implementa soporte defensivo para `window.SpeechRecognition` y `window.webkitSpeechRecognition`.
3. **Manejo de Estados ESI:** Define mapeos visuales para los colores ESI:
   - `1 (Rojo)` -> `bg-red-600 text-white`
   - `2 (Naranja)` -> `bg-orange-500 text-white`
   - `3 (Amarillo)` -> `bg-yellow-400 text-black`
   - `4 (Verde)` -> `bg-green-600 text-white`
   - `5 (Azul)` -> `bg-blue-500 text-white`
4. **Resistencia a fallos:** Incluye estados de carga (`loading`) y captura de errores en los `fetch`.

### Backend (FastAPI + AWS)
1. **Mangum mandatory:** Exporta siempre el handler `handler = Mangum(app)` al final del archivo principal (`main.py`).
2. **CORS:** Incluye middleware `CORSMiddleware` permitiendo orígenes `*` para evitar bloqueos con React/Amplify durante la demo.
3. **DynamoDB:** Usa `boto3.resource('dynamodb')` apuntando a la tabla `Triajes`. Mapea la clave primaria `triaje_id` como un `uuid.uuid4()`.
4. **Pydantic Schemas:** Usa modelos de Pydantic para validar los payloads de entrada y salida.

---

## Prompt del Sistema Médico (Para LLMs)

Al generar prompts para la IA en el backend, utiliza la siguiente directiva:

> "Actúas como un sistema médico de triaje bajo la escala ESI. Analiza el síntoma y responde ÚNICAMENTE en formato JSON válido con los campos: nivel (1-5), color ('Rojo','Naranja','Amarillo','Verde','Azul'), prioridad, razonamiento y alerta_critica (boolean)."