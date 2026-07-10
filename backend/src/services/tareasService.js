const supabase = require("./supabase");

// Validación manual (sin librería nueva) — mismo patrón que
// `cursosService.js` (specs/tareas_crud/design.md §4 "Validación de
// esquema"). Funciones puras, reutilizables por el controller para
// responder 400 sin llamar a Supabase (R4, R5, R6).
const TIPOS_VALIDOS = ["tarea", "examen", "proyecto"];
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validarTipo(tipo) {
  return TIPOS_VALIDOS.includes(tipo);
}

function validarPrioridad(prioridad) {
  return Number.isInteger(prioridad) && prioridad >= 1 && prioridad <= 5;
}

// Comparación por fecha calendario (sin hora) en UTC, formato YYYY-MM-DD —
// el orden lexicográfico coincide con el cronológico en ese formato
// (specs/tareas_crud/design.md §4). No resuelve zona horaria del usuario
// (fuera de alcance de `acceptance`).
function validarFechaLimite(fecha_limite) {
  if (typeof fecha_limite !== "string" || !FECHA_REGEX.test(fecha_limite)) {
    return false;
  }
  const hoy = new Date().toISOString().slice(0, 10);
  return fecha_limite > hoy;
}

function crearError(mensaje, status, code) {
  const error = new Error(mensaje);
  error.status = status;
  error.code = code;
  return error;
}

/**
 * Devuelve los ids de los cursos que pertenecen al `usuario_id` recibido.
 * Reutilizada por `create` (vía `perteneceUsuario`), `actualizarTarea` y
 * `eliminarTarea` (specs/tareas_crud/design.md §1).
 */
async function idsCursosDeUsuario(usuario_id) {
  const { data, error } = await supabase
    .from("cursos")
    .select("id")
    .eq("usuario_id", usuario_id);

  if (error) {
    throw crearError("No se pudieron obtener los cursos del usuario", 500, "DB_ERROR");
  }

  return (data ?? []).map((curso) => curso.id);
}

/**
 * Verifica si `curso_id` pertenece a `usuario_id`. Cubre la verificación de
 * R7.
 */
async function perteneceUsuario(curso_id, usuario_id) {
  const { data, error } = await supabase
    .from("cursos")
    .select("id")
    .eq("id", curso_id)
    .eq("usuario_id", usuario_id)
    .maybeSingle();

  if (error) {
    throw crearError("No se pudo verificar la propiedad del curso", 500, "DB_ERROR");
  }

  return Boolean(data);
}

/**
 * `tareas` no tiene columna `usuario_id` — la propiedad se determina por la
 * cadena `tareas.curso_id → cursos.usuario_id` (specs/tareas_crud/design.md
 * §1). Usa el join embebido de PostgREST (`cursos!inner(usuario_id)`)
 * filtrado por la columna del recurso embebido, y despoja el campo `cursos`
 * antes de devolver para que la forma coincida con `interface Tarea`.
 * Cubre R1, R2.
 */
async function listarTareas(usuario_id) {
  const { data, error } = await supabase
    .from("tareas")
    .select("*, cursos!inner(usuario_id)")
    .eq("cursos.usuario_id", usuario_id);

  if (error) {
    throw crearError("No se pudieron obtener las tareas", 500, "DB_ERROR");
  }

  return (data ?? []).map(({ cursos, ...tarea }) => tarea);
}

/**
 * Crea una tarea con `estado: "pendiente"` fijo (R3). El controller ya
 * verificó `perteneceUsuario(curso_id, usuario_id)` antes de llamar aquí
 * (R7) — este service no repite ese chequeo (responsabilidad única:
 * verificación de propiedad vs. inserción).
 */
async function crearTarea({ curso_id, titulo, tipo, fecha_limite, duracion_estimada_h, prioridad }) {
  const { data, error } = await supabase
    .from("tareas")
    .insert({
      curso_id,
      titulo,
      tipo,
      fecha_limite,
      duracion_estimada_h: duracion_estimada_h ?? null,
      prioridad,
      estado: "pendiente",
    })
    .select()
    .single();

  if (error) {
    throw crearError("No se pudo crear la tarea", 500, "DB_ERROR");
  }

  return data;
}

/**
 * Actualiza una tarea solo si su curso pertenece al `usuario_id` recibido.
 * Resuelve primero `idsCursosDeUsuario` y la usa como
 * `WHERE curso_id IN (...)` en la misma query de `UPDATE` — reduce la
 * ventana de condición de carrera (specs/tareas_crud/design.md §1). Si
 * `idsCursosDeUsuario` es vacío, lanza 403 sin más queries (evita depender
 * del comportamiento de `.in()` con array vacío en PostgREST). Si
 * `cambios.curso_id` viene en el body, verifica que el nuevo curso también
 * sea del usuario (evita "adoptar" una tarea hacia un curso ajeno). Cubre
 * R8, R9.
 */
async function actualizarTarea({ usuario_id, tarea_id, cambios }) {
  const idsCursos = await idsCursosDeUsuario(usuario_id);

  if (idsCursos.length === 0) {
    throw crearError("No tienes permiso sobre esta tarea", 403, "FORBIDDEN");
  }

  if (cambios.curso_id !== undefined) {
    const esPropio = await perteneceUsuario(cambios.curso_id, usuario_id);
    if (!esPropio) {
      throw crearError("No tienes permiso sobre esta tarea", 403, "FORBIDDEN");
    }
  }

  const { data, error } = await supabase
    .from("tareas")
    .update(cambios)
    .eq("id", tarea_id)
    .in("curso_id", idsCursos)
    .select()
    .maybeSingle();

  if (error) {
    throw crearError("No se pudo actualizar la tarea", 500, "DB_ERROR");
  }

  if (!data) {
    throw crearError("No tienes permiso sobre esta tarea", 403, "FORBIDDEN");
  }

  return data;
}

/**
 * Elimina una tarea solo si su curso pertenece al `usuario_id` recibido.
 * Mismo patrón que `actualizarTarea` (pasos de resolución de propiedad y
 * `WHERE curso_id IN (...)`), 403/`FORBIDDEN` si 0 filas afectadas (R12),
 * éxito si 1 fila (R11).
 */
async function eliminarTarea({ usuario_id, tarea_id }) {
  const idsCursos = await idsCursosDeUsuario(usuario_id);

  if (idsCursos.length === 0) {
    throw crearError("No tienes permiso sobre esta tarea", 403, "FORBIDDEN");
  }

  const { data, error } = await supabase
    .from("tareas")
    .delete()
    .eq("id", tarea_id)
    .in("curso_id", idsCursos)
    .select()
    .maybeSingle();

  if (error) {
    throw crearError("No se pudo eliminar la tarea", 500, "DB_ERROR");
  }

  if (!data) {
    throw crearError("No tienes permiso sobre esta tarea", 403, "FORBIDDEN");
  }

  return data;
}

module.exports = {
  validarTipo,
  validarPrioridad,
  validarFechaLimite,
  idsCursosDeUsuario,
  perteneceUsuario,
  listarTareas,
  crearTarea,
  actualizarTarea,
  eliminarTarea,
};
