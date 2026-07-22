const supabase = require("./supabase");
// El endpoint consume el módulo IA ÚNICAMENTE por su interfaz pública
// (docs/architecture.md §3, R10) — nunca importa los archivos internos del
// módulo IA (gemini, contexto, validacion) ni el SDK de Gemini directamente.
const { construirContexto, llamarGemini, validarRespuesta } = require("./ia");

function crearError(mensaje, status, code) {
  const error = new Error(mensaje);
  error.status = status;
  error.code = code;
  return error;
}

// R7 (DECISIÓN B) — Todo `tarea_id` devuelto por Gemini debe corresponder a una
// tarea pendiente del contexto del usuario. `construirContexto` ya filtró las
// tareas por usuario (`cursos!inner(... usuario_id)`), así que basta comparar
// contra ese conjunto (como String, para no depender del tipo del id). Un id
// alucinado o ajeno → 422 IA_INVALID_RESPONSE, sin persistir. Función pura.
function verificarPropiedad(bloques, tareasPendientes) {
  const idsValidos = new Set(tareasPendientes.map((t) => String(t.id)));
  const intruso = bloques.find((b) => !idsValidos.has(String(b.tarea_id)));
  if (intruso) {
    throw crearError("Respuesta de IA inválida", 422, "IA_INVALID_RESPONSE");
  }
}

// R6 — Mapea un bloque validado a la fila de `bloques_horario`. El sistema NO
// inventa ni sobrescribe la `justificacion` del modelo; solo fija
// `generado_por_ia: true`. Función pura.
function aFila(bloque) {
  return {
    tarea_id: bloque.tarea_id,
    fecha: bloque.fecha,
    hora_inicio: bloque.hora_inicio,
    hora_fin: bloque.hora_fin,
    generado_por_ia: true,
    justificacion: bloque.justificacion,
  };
}

// R11 (DECISIÓN C) — Antes de insertar, elimina los bloques generados por IA
// (`generado_por_ia = true`) de las tareas del usuario, para que reinvocar el
// endpoint (botón "Generar horario") no acumule duplicados. Los bloques movidos
// manualmente (`generado_por_ia = false`) NO se tocan.
async function borrarBloquesIaPrevios(idsTareas) {
  if (idsTareas.length === 0) return;
  const { error } = await supabase
    .from("bloques_horario")
    .delete()
    .eq("generado_por_ia", true)
    .in("tarea_id", idsTareas);
  if (error) {
    throw crearError("No se pudieron limpiar los bloques previos", 500, "DB_ERROR");
  }
}

// R6, R8 — Inserta las filas y devuelve las persistidas (con el `id` que asigna
// Postgres). Ante un error de Supabase propaga 500 DB_ERROR.
async function insertarBloques(filas) {
  if (filas.length === 0) return [];
  const { data, error } = await supabase
    .from("bloques_horario")
    .insert(filas)
    .select("id, tarea_id, fecha, hora_inicio, hora_fin, generado_por_ia, justificacion");
  if (error) {
    throw crearError("No se pudieron guardar los bloques", 500, "DB_ERROR");
  }
  return data ?? [];
}

// R3, R4, R8 — Orquesta el flujo completo. El `usuario_id` proviene siempre del
// token (lo pasa el controller desde `req.usuario_id`), nunca del body. No se
// envuelve `llamarGemini` en try/catch aquí: su throw (Error plano, sin `code`)
// se traduce a 503 IA_UNAVAILABLE en el controller (R9). Ninguna escritura
// ocurre antes de que la validación completa (schema + propiedad) haya pasado
// (R8).
//
// NOTA (desviación menor respecto a design §4/§5): `validarRespuesta` lanza
// Errores PLANOS sin `status`/`code` (verificado en ia-validacion.test.js), no
// errores ya codificados como asume design §5. Para que R5 devuelva 422
// (y no caiga en el branch 503 del controller, que es para llamarGemini) se
// envuelve SOLO `validarRespuesta` y se le adjunta el 422 IA_INVALID_RESPONSE.
// `llamarGemini` sigue sin envolver (T6), preservando la distinción 422 vs 503.
async function generarHorario(usuario_id) {
  const contexto = await construirContexto(usuario_id); // R3
  const raw = await llamarGemini(contexto); // R3 (throw → controller: 503)

  let bloques;
  try {
    bloques = validarRespuesta(raw, contexto.disponibilidad); // R3, R4
  } catch (err) {
    throw crearError("Respuesta de IA inválida", 422, "IA_INVALID_RESPONSE"); // R5
  }

  verificarPropiedad(bloques, contexto.tareas_pendientes); // R7

  const idsTareas = contexto.tareas_pendientes.map((t) => t.id);
  await borrarBloquesIaPrevios(idsTareas); // R11
  const filas = await insertarBloques(bloques.map(aFila)); // R6, R8

  return filas; // R2
}

module.exports = {
  generarHorario,
  verificarPropiedad,
  aFila,
};
