const supabase = require("./supabase");

// Validación manual (sin librería nueva) — mismo patrón que
// `authService.js` (specs/cursos_crud/design.md §3 "Validación de
// esquema"). Funciones puras, reutilizables por el controller para
// responder 400 sin llamar a Supabase (R4, R5, R6).
const COLOR_HEX_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function validarNombre(nombre) {
  return typeof nombre === "string" && nombre.trim().length > 0;
}

function validarDificultad(dificultad) {
  return Number.isInteger(dificultad) && dificultad >= 1 && dificultad <= 5;
}

function validarColorHex(color) {
  return typeof color === "string" && COLOR_HEX_REGEX.test(color);
}

function crearError(mensaje, status, code) {
  const error = new Error(mensaje);
  error.status = status;
  error.code = code;
  return error;
}

/**
 * Devuelve únicamente los cursos del usuario autenticado. El cliente de
 * `services/supabase.js` usa la service role key y por lo tanto bypassa RLS
 * (specs/cursos_crud/design.md §1) — el filtrado explícito por
 * `usuario_id` aquí es la protección real de aislamiento por usuario.
 * Cubre R1, R2.
 */
async function listarCursos(usuario_id) {
  const { data, error } = await supabase
    .from("cursos")
    .select("*")
    .eq("usuario_id", usuario_id);

  if (error) {
    throw crearError("No se pudieron obtener los cursos", 500, "DB_ERROR");
  }

  return data ?? [];
}

/**
 * Crea un curso asociado al `usuario_id` recibido (siempre del token, nunca
 * del body — R3). El controller valida `nombre`/`dificultad`/`color` antes
 * de llamar aquí.
 */
async function crearCurso({ usuario_id, nombre, color, dificultad, profesor, creditos }) {
  const { data, error } = await supabase
    .from("cursos")
    .insert({
      usuario_id,
      nombre,
      color,
      dificultad,
      profesor: profesor ?? null,
      creditos: creditos ?? null,
    })
    .select()
    .single();

  if (error) {
    throw crearError("No se pudo crear el curso", 500, "DB_ERROR");
  }

  return data;
}

/**
 * Actualiza un curso solo si pertenece al `usuario_id` recibido. Usa
 * `UPDATE ... WHERE id = :id AND usuario_id = :usuario_id` en una sola
 * query (evita condición de carrera entre chequeo y update,
 * specs/cursos_crud/design.md §3). Si no hay fila afectada, lanza 403
 * `FORBIDDEN` sin distinguir "no existe" de "es de otro usuario" (R8).
 * Cubre R7, R8.
 */
async function actualizarCurso({ usuario_id, curso_id, cambios }) {
  const { data, error } = await supabase
    .from("cursos")
    .update(cambios)
    .eq("id", curso_id)
    .eq("usuario_id", usuario_id)
    .select()
    .maybeSingle();

  if (error) {
    throw crearError("No se pudo actualizar el curso", 500, "DB_ERROR");
  }

  if (!data) {
    throw crearError("No tienes permiso sobre este curso", 403, "FORBIDDEN");
  }

  return data;
}

/**
 * Elimina un curso solo si pertenece al `usuario_id` recibido. Mismo
 * patrón que `actualizarCurso`: 403/`FORBIDDEN` si 0 filas afectadas (R11),
 * éxito si 1 fila (R10).
 */
async function eliminarCurso({ usuario_id, curso_id }) {
  const { data, error } = await supabase
    .from("cursos")
    .delete()
    .eq("id", curso_id)
    .eq("usuario_id", usuario_id)
    .select()
    .maybeSingle();

  if (error) {
    throw crearError("No se pudo eliminar el curso", 500, "DB_ERROR");
  }

  if (!data) {
    throw crearError("No tienes permiso sobre este curso", 403, "FORBIDDEN");
  }

  return data;
}

module.exports = {
  validarNombre,
  validarDificultad,
  validarColorHex,
  listarCursos,
  crearCurso,
  actualizarCurso,
  eliminarCurso,
};
