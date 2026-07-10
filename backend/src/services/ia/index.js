// Módulo IA — interfaz pública (docs/architecture.md §3, RNF-05).
// Único punto de contacto con Gemini en todo el backend. Los consumidores
// futuros (p. ej. horarios.controller.js) importan siempre desde aquí,
// nunca desde los archivos internos (contexto.js, gemini.js, validacion.js).

const { construirContexto } = require("./contexto");
const { llamarGemini } = require("./gemini");
const { validarRespuesta } = require("./validacion");

module.exports = { construirContexto, llamarGemini, validarRespuesta };
