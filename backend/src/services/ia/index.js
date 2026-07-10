// Interfaz pública del módulo IA (aislado — docs/architecture.md §3). Este es
// el ÚNICO módulo del backend que puede importar el SDK de Gemini (features
// 9/10); esta feature (8) solo re-exporta `construirContexto`, que NO llama a
// Gemini. Los consumidores del módulo importan desde aquí, no desde los
// archivos internos.
const { construirContexto } = require("./contexto");

module.exports = {
  construirContexto,
};
