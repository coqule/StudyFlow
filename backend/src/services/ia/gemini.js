// Módulo IA — llamada al SDK de Gemini.
// Implementación real: feature 9 (ia_llamar_gemini).
//
// NO importar el paquete del SDK de Gemini (ver docs/reglas-ia.md) aquí
// todavía: esa dependencia aún no está instalada en backend/package.json.
// Importarla a nivel superior haría fallar `require("./services/ia")` con
// MODULE_NOT_FOUND y rompería `npm run dev` (ver R8, R9 y design.md §4).
// El import real se añade junto con la dependencia en la feature
// ia_llamar_gemini.

function llamarGemini(contexto, promptAdicional = "") {
  throw new Error(
    "llamarGemini no implementado (feature ia_llamar_gemini)"
  );
}

module.exports = { llamarGemini };
