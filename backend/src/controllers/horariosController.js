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

// ajustar(): reorganización conversacional incremental (feature 12). Valida la
// `instruccion` del body (DECISIÓN A — R2): si falta, no es string o queda
// vacía tras trim → 400 VALIDATION_ERROR SIN invocar el módulo IA ni la BD.
// El `usuario_id` viene siempre del token (`req.usuario_id`), nunca del body
// (R3). Responde 200 `{ bloques_eliminados, bloques_creados }` (R12).
//
// Mapeo de errores (mismo patrón que generar):
//   - R2: VALIDATION_ERROR llega con 400 → middleware central.
//   - R10 (R5–R9): los throws de validación llegan con 422 IA_INVALID_RESPONSE.
//   - R11: los errores de persistencia llegan con 500 DB_ERROR.
//   - R13: cualquier otro throw — típicamente el de `llamarGemini`, que llega
//     sin `code` — se traduce a 503 IA_UNAVAILABLE.
async function ajustar(req, res, next) {
  try {
    const { instruccion } = req.body ?? {};
    if (typeof instruccion !== "string" || instruccion.trim() === "") {
      throw crearError("La instruccion es obligatoria", 400, "VALIDATION_ERROR"); // R2
    }
    const resultado = await horariosService.ajustarHorario(
      req.usuario_id,
      instruccion.trim()
    );
    res.status(200).json(resultado); // R12
  } catch (err) {
    if (
      err.code === "VALIDATION_ERROR" ||
      err.code === "IA_INVALID_RESPONSE" ||
      err.code === "DB_ERROR"
    ) {
      return next(err); // R2, R10, R11
    }
    return next(crearError("IA no disponible", 503, "IA_UNAVAILABLE")); // R13
  }
}

// listar(): vista del calendario semanal (feature 14). Sin IA — a diferencia de
// generar/ajustar, aquí no se traduce nada a 503. El `usuario_id` viene siempre
// del token (`req.usuario_id`), nunca del body/query (R7). Responde 200
// `{ bloques }` (R2, R4). Un error de DB llega con `code: "DB_ERROR"` y lo
// formatea el middleware central (R5).
async function listar(req, res, next) {
  try {
    const bloques = await horariosService.listarHorario(req.usuario_id); // R1, R7
    res.status(200).json({ bloques }); // R2, R4
  } catch (err) {
    return next(err); // R5
  }
}

module.exports = { generar, ajustar, listar };
