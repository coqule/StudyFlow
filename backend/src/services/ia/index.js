// Interfaz pública del módulo IA (aislado — docs/architecture.md §3). Este es
// el ÚNICO módulo del backend que puede importar el SDK de Gemini (features
// 9/10). Los consumidores del módulo importan desde aquí (require("../services/
// ia")), no desde los archivos internos (./gemini, ./contexto).
const { construirContexto } = require("./contexto");
const { llamarGemini } = require("./gemini");
const { validarRespuesta } = require("./validacion");

module.exports = {
  construirContexto,
  llamarGemini,
  validarRespuesta,
};
