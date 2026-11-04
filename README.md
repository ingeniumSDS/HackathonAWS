# 🚑 QuickTriage — Triaje Médico por Voz asistido por IA

> **Proyecto de Hackathon (90 Minutos)** | Creado para transformar el proceso de clasificación de emergencias médicas en salas de urgencias mediante captura de voz, Inteligencia Artificial y arquitectura Serverless en AWS.

---

## 💡 El Problema y la Solución

- **El Problema:** En una sala de urgencias saturada, el personal de enfermería invierte entre 3 y 7 minutos llenando formularios manuales por cada paciente. Además, la fatiga del personal puede generar errores en la asignación de prioridad.
- **La Solución:** **QuickTriage** reduce el tiempo de triaje a **menos de 10 segundos**. El enfermero dictado los síntomas y constantes vitales; el sistema transcribe en tiempo real, procesa la información clínica con un modelo de IA entrenado bajo el estándar **ESI (Emergency Severity Index)** y guarda el expediente directamente en la nube.

---

## 🏗️ Arquitectura del Sistema (AWS Stack)

El proyecto está diseñado sobre una arquitectura 100% **Serverless** nativa en AWS, garantizando escalabilidad masiva y bajo costo operativo.

```
┌─────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐      ┌──────────────────┐
│  React (Vite)   │ ───► │  AWS API Gateway /      │ ───► │ AWS Lambda (FastAPI)    │ ───► │ Amazon DynamoDB  │
│  + Tailwind CSS │      │  AWS Amplify            │      │ + Mangum Adapter        │      │ (Tabla: Triajes) │
└────────┬────────┘      └─────────────────────────┘      └────────────┬────────────┘      └──────────────────┘
         │                                                             │
         ▼                                                             ▼
 Web Speech API (Voz)                                            LLM API (ESI Classifier)
```

- **Frontend:** React 18 (Vite) + Tailwind CSS + Web Speech API, desplegado en **AWS Amplify**.
- **Backend:** Python 3.11 + FastAPI + Mangum (Adaptador Serverless para AWS Lambda).
- **Base de Datos:** **Amazon DynamoDB** (Tabla `Triajes` NoSQL *On-Demand*).
- **IA:** Integración con API de LLM (Gemini / OpenAI) con salida estricta en formato JSON.

---

## 📊 Escala ESI (Emergency Severity Index)

El sistema clasifica las emergencias en 5 niveles estándar:

| Nivel ESI | Color | Prioridad | Ejemplo Clínico |
| :---: | :---: | :--- | :--- |
| **1** | 🔴 Rojo | **Reanimación Inmediata** | Paro cardiorrespiratorio, shock anafiláctico, trauma severo. |
| **2** | 🟠 Naranja | **Emergencia / Alto Riesgo** | Sospecha de ACV, dolor torácico agudo, disnea grave. |
| **3** | 🟡 Amarillo | **Urgencia** | Dolor abdominal agudo, necesidad de múltiples estudios/médicos. |
| **4** | 🟢 Verde | **Urgencia Menor** | Lesión superficial, esguince cerrado, sutura simple. |
| **5** | 🔵 Azul | **No Urgente** | Expedición de recetas, curación menor, consulta general. |

---

## 📋 Contrato de Datos (JSON Schema)

Todas las respuestas del backend y las salidas de la IA cumplen el siguiente contrato estricto:

```json
{
  "triaje_id": "uuid-v4-generated",
  "timestamp": "2026-11-04T13:30:00Z",
  "nivel": 2,
  "color": "Naranja",
  "prioridad": "Emergencia / Alto Riesgo",
  "razonamiento": "Sospecha de Síndrome Coronario Agudo por dolor opresivo y diaforesis.",
  "alerta_critica": true
}
```

---

## 🚀 Instalación y Desarrollo Local

### Prerrequisitos

- Node.js 18+
- Python 3.11+
- Credenciales de AWS en entorno local (`aws configure` o variables de entorno)
- API Key de OpenAI / Google Gemini

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/quick-triage.git
cd quick-triage
```

### 2. Configurar y ejecutar el Backend (FastAPI)

```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Variables de entorno
export AWS_REGION="us-east-1"
export AI_API_KEY="tu_api_key_aqui"

# Ejecutar en modo desarrollo
uvicorn main:app --reload --port 8000
```

### 3. Configurar y ejecutar el Frontend (React)

```bash
cd frontend

# Instalar dependencias
npm install

# Variables de entorno (.env)
VITE_API_URL="http://localhost:8000"

# Ejecutar el servidor de desarrollo
npm run dev
```

---

## 🛠️ Estructura del Repositorio

```
.
├── .github/
│   ├── copilot-instructions.md       # Reglas y contexto para GitHub Copilot
│   └── prompts/                      # Prompts optimizados para desarrollo rápido
├── backend/
│   ├── main.py                       # App FastAPI con soporte Mangum para Lambda
│   └── requirements.txt              # Dependencias del servidor
├── frontend/
│   ├── src/
│   │   ├── App.jsx                   # UI Principal con dictado de voz
│   │   └── index.css                 # Configuración de Tailwind CSS
│   └── package.json
└── README.md
```

---

## 📄 Licencia

Este proyecto fue desarrollado bajo la licencia **MIT** con fines educativos y de demostración durante el Hackathon.
