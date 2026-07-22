const horariosService = require("../services/horariosService");

function crearError(mensaje, status, code) {
  const error = new Error(mensaje);
  error.status = status;
  error.code = code;
  return error;
}

// generar(): orquesta la generación batch del horario semanal. El `usuario_id`
// viene siempre del token (`req.usuario_id`, adjuntado por `requireAuth`),
// nunca del body (R3). Responde 200 `{ bloques }` en el camino feliz (R2).
//
// Mapeo de errores:
//   - R5/R7: los throws de validación ya llegan con 422 IA_INVALID_RESPONSE.
//   - R8: los errores de persistencia llegan con 500 DB_ERROR.
//   Ambos se delegan al middleware de errores central (`next(err)`), que
//   responde con su `status`/`code`.
//   - R9 (DECISIÓN A): cualquier otro throw dentro del flujo — típicamente el
//   de `llamarGemini`, que llega sin `code` — se trata como IA no disponible
//   y se traduce a 503 IA_UNAVAILABLE.
async function generar(req, res, next) {
  try {
    const bloques = await horariosService.generarHorario(req.usuario_id); // R3
    res.status(200).json({ bloques }); // R2
  } catch (err) {
    if (err.code === "IA_INVALID_RESPONSE" || err.code === "DB_ERROR") {
      return next(err); // R5, R7, R8
    }
    return next(crearError("IA no disponible", 503, "IA_UNAVAILABLE")); // R9
  }
}

module.exports = { generar };
