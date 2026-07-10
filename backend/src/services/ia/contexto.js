const supabase = require("../supabase");

// Construcción del contexto reducido que se envía a Gemini. Este módulo NO
// llama a Gemini ni valida su respuesta (features 9/10): solo transforma los
// datos de la BD al objeto JSON definido en docs/reglas-ia.md
// (§ "Contexto enviado a Gemini"). Nunca envía filas completas de la BD ni
// campos de auditoría.
//
// El cliente de `services/supabase.js` usa la service role key y por lo tanto
// bypassa RLS (design.md §1) — el filtrado explícito por `usuario_id` aquí es
// la protección real de aislamiento por usuario (R8), mismo criterio que
// `disponibilidadService.js` y `tareasService.js`.

// Postgres `time` devuelve las horas como `HH:MM:SS`; se normaliza a `HH:MM`
// (formato de 24 h sin segundos) para calcar el ejemplo de docs/reglas-ia.md.
// Mismo criterio que `disponibilidadService.normalizarHora`. Función pura.
// Cubre R3.
function normalizarHora(hora) {
  return typeof hora === "string" ? hora.slice(0, 5) : hora;
}

function crearError(mensaje, status, code) {
  const error = new Error(mensaje);
  error.status = status;
  error.code = code;
  return error;
}

// Mapea una fila de `disponibilidad` (con las columnas dia_semana/hora_inicio/
// hora_fin) a la forma exacta del contexto: `{ dia, inicio, fin }` con las
// horas normalizadas a `HH:MM`. Sin `id` ni `usuario_id` (R6). Función pura.
function mapearDisponibilidad(fila) {
  return {
    dia: fila.dia_semana,
    inicio: normalizarHora(fila.hora_inicio),
    fin: normalizarHora(fila.hora_fin),
  };
}

// Mapea una fila de `tareas` con su curso embebido (`cursos!inner(...)`) a la
// forma exacta del contexto. `curso`/`dificultad` provienen del curso;
// `prioridad_usuario` de `tareas.prioridad` (docs/modelo-datos.md: `dificultad`
// es campo de `cursos`, `prioridad` es campo de `tareas`). Las claves se
// construyen en el orden del ejemplo de docs/reglas-ia.md. Sin `titulo`,
// `tipo`, `estado`, `curso_id` ni `usuario_id` (R6). Función pura.
// Cubre R4, R5, R6.
function mapearTarea(fila) {
  return {
    id: fila.id,
    curso: fila.cursos.nombre,
    dificultad: fila.cursos.dificultad,
    fecha_limite: fila.fecha_limite,
    duracion_estimada_h: fila.duracion_estimada_h,
    prioridad_usuario: fila.prioridad,
  };
}

/**
 * Construye el contexto reducido que se enviará a Gemini para un usuario.
 * NUNCA envía filas completas de la BD ni campos de auditoría.
 * @param {string} usuario_id  id (uuid) del usuario autenticado
 * @returns {Promise<{fecha_actual: string, disponibilidad: Array, tareas_pendientes: Array}>}
 */
async function construirContexto(usuario_id) {
  // R2 — fecha de calendario actual en formato YYYY-MM-DD (UTC). La zona
  // horaria del usuario queda fuera de alcance (design.md §4.1), mismo
  // criterio que `tareasService.validarFechaLimite`.
  const fecha_actual = new Date().toISOString().slice(0, 10);

  // R3, R6, R8, R9 — bloques de disponibilidad del usuario. El `select`
  // explícito omite `id`/`usuario_id`, de modo que nunca llegan al contexto.
  const { data: dispData, error: dispError } = await supabase
    .from("disponibilidad")
    .select("dia_semana, hora_inicio, hora_fin")
    .eq("usuario_id", usuario_id);

  if (dispError) {
    throw crearError("No se pudo obtener la disponibilidad", 500, "DB_ERROR");
  }

  const disponibilidad = (dispData ?? []).map(mapearDisponibilidad);

  // R4, R5, R6, R7, R8, R9 — tareas pendientes/en progreso del usuario. El
  // join embebido `cursos!inner(...)` resuelve el curso dueño de la tarea y
  // filtra por `cursos.usuario_id` (aislamiento, R8), mismo patrón que
  // `tareasService.listarTareas`. `.in("estado", ...)` limita a pendientes/en
  // progreso (R7). El `select` no pide titulo/tipo/estado/curso_id (R6).
  const { data: tareasData, error: tareasError } = await supabase
    .from("tareas")
    .select(
      "id, fecha_limite, duracion_estimada_h, prioridad, cursos!inner(nombre, dificultad, usuario_id)"
    )
    .eq("cursos.usuario_id", usuario_id)
    .in("estado", ["pendiente", "en_progreso"]);

  if (tareasError) {
    throw crearError("No se pudieron obtener las tareas", 500, "DB_ERROR");
  }

  const tareas_pendientes = (tareasData ?? []).map(mapearTarea);

  // R1 — exactamente estas tres claves de primer nivel, en el orden del
  // ejemplo de docs/reglas-ia.md.
  return { fecha_actual, disponibilidad, tareas_pendientes };
}

module.exports = {
  construirContexto,
  // Helpers puros exportados para tests unitarios de la transformación (T15).
  normalizarHora,
  mapearDisponibilidad,
  mapearTarea,
};
