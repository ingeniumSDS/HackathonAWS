---
description: Genera el componente React para captura de voz y visualización dinámica de la tarjeta de triaje ESI.
---

Crea un componente principal en React (`App.jsx`) utilizando Tailwind CSS para QuickTriage:

1. **Estado:**
   - `isListening` (boolean)
   - `transcript` (string)
   - `triajeResult` (object | null)
   - `loading` (boolean)

2. **Captura de Voz (Web Speech API):**
   - Configura `webkitSpeechRecognition` en idioma español (`es-ES`).
   - Botón grande de micrófono que active/desactive la grabación.
   - Muestra el texto transcrito en tiempo real en un cuadro de texto editable.

3. **Acción de Envío:**
   - Botón "Evaluar Triaje" que envíe `transcript` mediante `fetch` POST al endpoint `/api/triaje` de FastAPI.

4. **Tarjeta de Resultado Dinámica (ESI):**
   - Muestra el resultado de triaje renderizando colores según la gravedad:
     - Nivel 1: Fondo Rojo con parpadeo o alerta de "EMERGENCIA CRÍTICA".
     - Nivel 2: Fondo Naranja.
     - Nivel 3: Fondo Amarillo.
     - Nivel 4: Fondo Verde.
     - Nivel 5: Fondo Azul.
   - Muestra el Nivel, Prioridad y el Razonamiento Clínico proporcionado por el backend.

Asegúrate de que la interfaz sea limpia, con alto contraste y optimizada para pantallas táctiles de emergencia.