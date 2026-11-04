import { useEffect, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const LEVEL_STYLES = {
  1: {
    label: "Rojo",
    card: "border-red-300 bg-red-50",
    badge: "bg-red-700 text-white",
    marker: "bg-red-600",
  },
  2: {
    label: "Naranja",
    card: "border-orange-300 bg-orange-50",
    badge: "bg-orange-500 text-white",
    marker: "bg-orange-500",
  },
  3: {
    label: "Amarillo",
    card: "border-yellow-300 bg-yellow-50",
    badge: "bg-yellow-300 text-slate-950",
    marker: "bg-yellow-400",
  },
  4: {
    label: "Verde",
    card: "border-green-300 bg-green-50",
    badge: "bg-green-700 text-white",
    marker: "bg-green-600",
  },
  5: {
    label: "Azul",
    card: "border-blue-300 bg-blue-50",
    badge: "bg-blue-600 text-white",
    marker: "bg-blue-500",
  },
};

const RESULT_FIELDS = [
  "nivel",
  "color",
  "prioridad",
  "razonamiento",
  "alerta_critica",
];

const DEMO_SCENARIO_TEXT =
  "ESCENARIO SINTETICO DEMO: persona ficticia con una molestia leve de tobillo tras caminar. Texto inventado para probar la interfaz; no es un caso real ni contiene signos vitales.";

function isTriageResult(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  const expectedKeys = [...RESULT_FIELDS].sort();
  return (
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index]) &&
    Number.isInteger(value.nivel) &&
    LEVEL_STYLES[value.nivel]?.label === value.color &&
    typeof value.prioridad === "string" &&
    typeof value.razonamiento === "string" &&
    typeof value.alerta_critica === "boolean" &&
    value.alerta_critica === (value.nivel <= 2)
  );
}

function getErrorMessage(error, responseStatus) {
  if (responseStatus === 503) {
    return "El servicio de clasificación aún no está configurado. No se generó ni guardó un resultado.";
  }
  if (responseStatus === 502) {
    return "El servicio no pudo validar una clasificación. Inténtalo más tarde; no se guardó un resultado.";
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servicio. Verifica la conexión y la URL de la API.";
  }
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [resultIsDemo, setResultIsDemo] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef(null);
  const recognitionBaseRef = useRef("");

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setErrorMessage("No se pudo capturar la voz. Puedes escribir los síntomas.");
      }
    };
    recognition.onresult = (event) => {
      const finalParts = [];
      const interimParts = [];
      for (let index = 0; index < event.results.length; index += 1) {
        const text = event.results[index][0].transcript.trim();
        if (!text) continue;
        if (event.results[index].isFinal) finalParts.push(text);
        else interimParts.push(text);
      }
      const capturedText = [
        recognitionBaseRef.current,
        ...finalParts,
        ...interimParts,
      ]
        .filter(Boolean)
        .join(" ");
      setTranscript(capturedText);
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  function toggleListening() {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setErrorMessage("Este navegador no admite dictado por voz. Escribe los síntomas.");
      return;
    }
    setErrorMessage("");
    if (isListening) {
      recognition.stop();
      return;
    }
    recognitionBaseRef.current = transcript.trim();
    try {
      recognition.start();
    } catch {
      setErrorMessage("No se pudo iniciar el micrófono. Revisa los permisos del navegador.");
    }
  }

  async function submitTriage(event) {
    event.preventDefault();
    const symptoms = transcript.trim();
    if (!symptoms || loading) return;

    setLoading(true);
    setErrorMessage("");
    setResult(null);
    setResultIsDemo(false);
    const isDemoRequest = symptoms === DEMO_SCENARIO_TEXT;

    let responseStatus = 0;
    try {
      const response = await fetch(`${API_BASE_URL}/api/triaje`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sintomas_texto: symptoms }),
      });
      responseStatus = response.status;

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const detail =
          typeof body?.detail === "string" ? body.detail : "La solicitud no pudo completarse.";
        throw new Error(detail);
      }
      if (!isTriageResult(body)) {
        throw new Error("La respuesta del servicio no cumple el contrato ESI.");
      }
      setResult(body);
      setResultIsDemo(isDemoRequest);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, responseStatus));
    } finally {
      setLoading(false);
    }
  }

  const levelStyle = result ? LEVEL_STYLES[result.nivel] : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a className="flex items-center gap-3" href="/" aria-label="QuickTriage inicio">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-700 text-lg font-bold text-white">
              Q
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight">QuickTriage</span>
              <span className="block text-xs text-slate-500">Apoyo al registro de triaje</span>
            </span>
          </a>
          <span className="hidden rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:inline-flex">
            Prototipo · ESI
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 max-w-3xl">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-teal-800">
            Captura rápida
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Registra los síntomas para solicitar una clasificación
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Dicta o escribe el relato. Revisa el texto antes de enviarlo y verifica cualquier
            resultado con el personal clínico responsable.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(350px,0.92fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Relato del paciente</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Incluye solo la información necesaria para esta evaluación.
                </p>
              </div>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                ES
              </span>
            </div>

            <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-sm font-bold text-sky-950">Prueba rápida de presentación</p>
              <p className="mt-1 text-sm leading-6 text-sky-900">
                Carga un escenario completamente ficticio. El resultado estará marcado como
                simulado y no es una evaluación clínica.
              </p>
              <button
                type="button"
                onClick={() => {
                  setTranscript(DEMO_SCENARIO_TEXT);
                  setResult(null);
                  setErrorMessage("");
                }}
                disabled={loading}
                className="mt-3 min-h-10 rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm font-bold text-sky-950 hover:bg-sky-100 focus:outline-none focus:ring-4 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cargar escenario simulado
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleListening}
                disabled={!voiceSupported || loading}
                aria-pressed={isListening}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isListening
                    ? "bg-red-700 text-white hover:bg-red-800"
                    : "bg-teal-800 text-white hover:bg-teal-900"
                }`}
              >
                <span aria-hidden="true">{isListening ? "■" : "●"}</span>
                {isListening ? "Detener dictado" : "Dictar síntomas"}
              </button>
              <span
                className={`text-sm font-medium ${isListening ? "text-red-700" : "text-slate-500"}`}
                aria-live="polite"
              >
                {isListening ? "Escuchando… puedes detener cuando termines." : "El texto se puede editar."}
              </span>
            </div>

            {!voiceSupported && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                El dictado no está disponible en este navegador. Escribe los síntomas manualmente.
              </p>
            )}

            <form onSubmit={submitTriage}>
              <label className="sr-only" htmlFor="symptoms">
                Transcripción de síntomas
              </label>
              <textarea
                id="symptoms"
                value={transcript}
                onChange={(event) => {
                  setTranscript(event.target.value);
                  setResult(null);
                  setResultIsDemo(false);
                  setErrorMessage("");
                }}
                placeholder="Ej.: Describe aquí el síntoma principal, cuándo comenzó y cualquier dato relevante…"
                rows={8}
                maxLength={5000}
                disabled={loading}
                className="w-full resize-y rounded-xl border border-slate-300 bg-slate-50 p-4 text-base leading-7 text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:opacity-60"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Evita incluir datos personales que no sean necesarios.</span>
                <span>{transcript.length}/5000</span>
              </div>
              <button
                type="submit"
                disabled={!transcript.trim() || loading}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto sm:min-w-48"
              >
                {loading && (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden="true"
                  />
                )}
                {loading ? "Enviando solicitud…" : "Solicitar clasificación"}
              </button>
            </form>

            {errorMessage && (
              <div
                className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900"
                role="alert"
              >
                <p className="font-bold">No se obtuvo una clasificación</p>
                <p>{errorMessage}</p>
              </div>
            )}
          </section>

          <section
            aria-labelledby="result-heading"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
                  Resultado
                </p>
                <h2 id="result-heading" className="mt-1 text-xl font-bold text-slate-950">
                  Clasificación ESI
                </h2>
              </div>
              {result && levelStyle && (
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${levelStyle.badge}`}
                >
                  Nivel {result.nivel} · {result.color}
                </span>
              )}
            </div>

            {result && levelStyle ? (
              <div
                className={`mt-6 rounded-xl border p-5 ${levelStyle.card}`}
                aria-live="polite"
              >
                {resultIsDemo && (
                  <div className="mb-4 rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-sm font-bold text-sky-950">
                    DEMOSTRACIÓN SIMULADA · NO ES UNA EVALUACIÓN CLÍNICA
                  </div>
                )}
                {result.alerta_critica && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-current/20 bg-white/70 px-3 py-2 text-sm font-bold">
                    <span className={`h-2.5 w-2.5 rounded-full ${levelStyle.marker}`} />
                    Requiere atención prioritaria
                  </div>
                )}
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
                  Prioridad
                </p>
                <p className="mt-1 text-xl font-bold text-slate-950">{result.prioridad}</p>
                <div className="my-5 border-t border-slate-900/10" />
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
                  Razonamiento informado
                </p>
                <p className="mt-2 text-base leading-7 text-slate-900">{result.razonamiento}</p>
              </div>
            ) : (
              <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
                <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-white text-xl text-slate-400 shadow-sm">
                  —
                </span>
                <p className="font-semibold text-slate-700">Aún no hay resultado</p>
                <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                  La clasificación aparecerá aquí solo cuando el servicio confirme una respuesta
                  válida.
                </p>
              </div>
            )}

            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <p className="font-bold">Aviso clínico</p>
              <p className="mt-1">
                Prototipo de apoyo; no sustituye la valoración de un profesional ni los protocolos
                del centro. Ante una urgencia, activa los procedimientos locales de emergencia.
              </p>
            </div>
          </section>
        </div>

        <footer className="mt-8 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
          El envío requiere conexión con la API QuickTriage. La ausencia de una respuesta no implica
          que el caso sea de baja prioridad.
        </footer>
      </main>
    </div>
  );
}
