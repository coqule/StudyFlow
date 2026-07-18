// Llamada a Gemini (feature 9). Este módulo forma parte del módulo IA aislado
// (docs/architecture.md §3, RNF-05): es de los ÚNICOS archivos del backend que
// pueden importar el SDK de Gemini. NO valida la respuesta (feature 10) ni
// maneja el error HTTP (feature 13): solo llama a Gemini y propaga el texto
// crudo o la excepción.
const { GoogleGenAI } = require("@google/genai");

// R9 — la clave se lee únicamente de la variable de entorno, sin hardcodear.
// El cliente se instancia una sola vez a nivel de módulo (docs/conventions.md
// §7: env vars solo al inicio del módulo). El constructor no hace I/O, así que
// con GEMINI_API_KEY vacía (p. ej. en tests con el SDK mockeado) no falla aquí.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

/**
 * Llama a Gemini con el contexto reducido y devuelve el texto crudo de la
 * respuesta (JSON sin parsear). NO valida ni transforma la respuesta ni captura
 * excepciones: la validación es de `validarRespuesta` (feature 10) y el manejo
 * del error HTTP es del endpoint que la invoque (feature 13).
 * @param {object} contexto  contexto de `construirContexto` (docs/reglas-ia.md)
 * @param {string} [promptAdicional=""]  reglas extra que se anexan al prompt del
 *   sistema (p. ej. modo ajuste, feature 12). Se concatena literalmente.
 * @returns {Promise<string|undefined>} el texto crudo de la respuesta.
 */
async function llamarGemini(contexto, promptAdicional = "") {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash", // R3
    contents: `Contexto:\n${JSON.stringify(contexto)}`, // R5 — solo los datos
    config: {
      systemInstruction: PROMPT_SISTEMA + promptAdicional, // R4, R8
      responseMimeType: "application/json", // R2 — JSON mode OBLIGATORIO
    },
  });

  return response.text; // R6 — texto crudo (string | undefined), sin parsear
}

module.exports = { llamarGemini };