// Llamada a Gemini (feature 9). Este módulo forma parte del módulo IA aislado
// (docs/architecture.md §3, RNF-05): es de los ÚNICOS archivos del backend que
// pueden importar el SDK de Gemini. NO valida la respuesta (feature 10) ni
// maneja el error HTTP (feature 13): solo llama a Gemini y propaga el texto
// crudo o la excepción.
//
// RNF-03, ADR-004: incorpora timeout explícito y retry con backoff ante
// errores transitorios (503/UNAVAILABLE). El timeout se configura vía la
// variable de entorno GEMINI_TIMEOUT_MS (por defecto 10000 ms). Tras agotar
// reintentos o ante error no transitorio, propaga la excepción tal cual — el
// controller la traduce a 503 IA_UNAVAILABLE.
const { GoogleGenAI } = require("@google/genai");

// R9 — la clave se lee únicamente de la variable de entorno, sin hardcodear.
// El cliente se instancia una sola vez a nivel de módulo (docs/conventions.md
// §7: env vars solo al inicio del módulo). El constructor no hace I/O, así que
// con GEMINI_API_KEY vacía (p. ej. en tests con el SDK mockeado) no falla aquí.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ADR-004 — Timeout en milisegundos para cada llamada a Gemini. Configurable
// vía entorno; 10 s por defecto.
const TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS, 10) || 10000;

// ADR-004 — Número máximo de reintentos ante errores transitorios.
const MAX_RETRIES = 1;

// ADR-004 — Espera base entre reintentos (ms). Se duplica en cada intento.
const RETRY_BASE_MS = 1000;

// R4 — Prompt del sistema LITERAL (docs/reglas-ia.md § "Prompt del sistema").
// El bloque del doc está envuelto a ~60 columnas por legibilidad; los saltos de
// línea NO son significativos (parten palabras a mitad), así que las líneas se
// unen con espacios simples para reconstruir la prosa exacta, palabra por
// palabra. No parafrasear, abreviar, traducir ni añadir texto.
const PROMPT_SISTEMA =
  "Eres el motor de planificación de un sistema experto de " +
  "organización académica. Tu única tarea es distribuir las " +
  "tareas_pendientes dentro de los bloques de disponibilidad, " +
  "siguiendo este orden de prioridad: 1) fecha_limite más " +
  "cercana primero (camino crítico), 2) mayor dificultad recibe " +
  "bloques más largos y en horas de mayor concentración, " +
  "3) prioridad_usuario como desempate. Nunca asignes dos " +
  "tareas al mismo bloque horario ni excedas la duracion del " +
  "bloque de disponibilidad. Responde EXCLUSIVAMENTE con un " +
  'objeto JSON con la forma: { "bloques": [ { "tarea_id", ' +
  '"fecha", "hora_inicio", "hora_fin", "justificacion" } ] }';

// Feature 12 (R4) — Anexo del modo ajuste LITERAL (docs/reglas-ia.md § "Para el
// modo ajuste, agregar al final del prompt"). Igual que PROMPT_SISTEMA: el
// bloque del doc está envuelto a ~60 columnas y los saltos de línea NO son
// significativos, así que las líneas se unen con espacios simples, palabra por
// palabra, sin parafrasear. El espacio inicial separa el anexo del final de
// PROMPT_SISTEMA al concatenarse en `config.systemInstruction` (llamarGemini
// NO se modifica: ya acepta `promptAdicional`).
const ANEXO_MODO_AJUSTE =
  " El horario vigente está en horario_vigente. La instrucción " +
  "del usuario está en instruccion_usuario. Devuelve SOLO los " +
  'bloques que cambian: { "bloques_eliminados": ["id1", "id2"], ' +
  '"bloques_creados": [ { "tarea_id", "fecha", "hora_inicio", ' +
  '"hora_fin", "justificacion" } ] }';

// ADR-004 — Detecta si un error de Gemini es transitorio (503/UNAVAILABLE)
// y por tanto candidato a reintento. NO reintenta AbortError (timeout).
function esErrorTransitorio(err) {
  if (err.name === "AbortError") return false;
  if (err.status === 503) return true;
  if (err.message && err.message.includes("UNAVAILABLE")) return true;
  return false;
}

// ADR-004 — Espera async con backoff exponencial simple (base * intento).
function esperar(intento) {
  return new Promise((r) => setTimeout(r, RETRY_BASE_MS * (intento + 1)));
}

/**
 * Llama a Gemini con el contexto reducido y devuelve el texto crudo de la
 * respuesta (JSON sin parsear). NO valida ni transforma la respuesta: la
 * validación es de `validarRespuesta` (feature 10) y el manejo del error HTTP
 * es del endpoint que la invoque (feature 13).
 *
 * ADR-004: aplica timeout explícito (`TIMEOUT_MS`) via AbortController y
 * reintenta hasta `MAX_RETRIES` veces ante errores transitorios (503). El
 * timeout NO se reintenta para no superar el umbral de respuesta rápida
 * (RNF-03). Tras agotar reintentos, propaga la última excepción tal cual — el
 * controller la traduce a 503 IA_UNAVAILABLE (RNF-03).
 *
 * @param {object} contexto  contexto de `construirContexto` (docs/reglas-ia.md)
 * @param {string} [promptAdicional=""]  reglas extra que se anexan al prompt del
 *   sistema (p. ej. modo ajuste, feature 12). Se concatena literalmente.
 * @returns {Promise<string|undefined>} el texto crudo de la respuesta.
 */
async function llamarGemini(contexto, promptAdicional = "") {
  let ultimoError;

  for (let intento = 0; intento <= MAX_RETRIES; intento++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash", // R3
          contents: `Contexto:\n${JSON.stringify(contexto)}`, // R5
          config: {
            systemInstruction: PROMPT_SISTEMA + promptAdicional, // R4, R8
            responseMimeType: "application/json", // R2
            abortSignal: controller.signal,
          },
        });

        return response.text; // R6
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      ultimoError = err;

      if (intento < MAX_RETRIES && esErrorTransitorio(err)) {
        await esperar(intento);
        continue;
      }

      throw err;
    }
  }
}

module.exports = { llamarGemini, ANEXO_MODO_AJUSTE };