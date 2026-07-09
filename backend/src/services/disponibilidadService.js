const supabase = require("./supabase");

// Validación manual (sin librería nueva) — mismo patrón que
// `cursosService.js`/`tareasService.js` (specs/disponibilidad_crud/design.md
// §4 "Validación de esquema"). Funciones puras, reutilizables por el
// controller para responder 400 sin llamar a Supabase (R4, R5, R6, R9).

// Conjunto canónico de días SIN tilde — coincide con el tipo
// `Disponibilidad.dia_semana` de `frontend/src/types/index.ts`
// (specs/disponibilidad_crud/design.md §4). Cubre R4 (y R9).
const DIAS_VALIDOS = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

// Formato `HH:MM` de 24 horas. Cubre R5 (y R9).
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function validarDiaSemana(dia) {
  return typeof dia === "string" && DIAS_VALIDOS.includes(dia);
}

function validarHora(hora) {
  return typeof hora === "string" && HORA_REGEX.test(hora);
}

// `hora_fin` estrictamente mayor que `hora_inicio`. La comparación es
// lexicográfica de cadenas `HH:MM` (válida porque el orden lexicográfico de
// `HH:MM` de 24 h coincide con el cronológico — design.md §2). Cubre R6 (R9).
function rangoValido(hora_inicio, hora_fin) {
  return hora_fin > hora_inicio;
}

// Dos rangos `[aIni, aFin)` y `[bIni, bFin)` se solapan si `aIni < bFin &&
// bIni < aFin`. Los bloques adyacentes (`fin` de uno == `inicio` de otro) NO
// se consideran solape. Función pura, testeable de forma unitaria
// (design.md §2). Base de R7/R10.
function seSolapan(aIni, aFin, bIni, bFin) {
  return aIni < bFin && bIni < aFin;
}

// Postgres `time` devuelve las horas como `HH:MM:SS`; se normaliza a `HH:MM`
// para que las comparaciones lexicográficas frente al body (`HH:MM`) sean
// consistentes tanto en igualdad (adyacencia) como en orden.
function normalizarHora(hora) {
  return typeof hora === "string" ? hora.slice(0, 5) : hora;
}

function crearError(mensaje, status, code) {
  const error = new Error(mensaje);
  error.status = status;
  error.code = code;
  return error;
}

/**
 * Devuelve únicamente los bloques de disponibilidad del usuario autenticado.
 * El cliente de `services/supabase.js` usa la service role key y por lo tanto
 * bypassa RLS (design.md §1, §5) — el filtrado explícito por `usuario_id`
 * aquí es la protección real de aislamiento por usuario. Cubre R1, R2.
 */
async function listarDisponibilidad(usuario_id) {
  const { data, error } = await supabase
    .from("disponibilidad")
    .select("*")
    .eq("usuario_id", usuario_id);

  if (error) {
    throw crearError("No se pudo obtener la disponibilidad", 500, "DB_ERROR");
  }

  return data ?? [];
}

/**
 * Helper interno: devuelve los bloques del mismo `usuario_id` y `dia_semana`,
 * con las horas normalizadas a `HH:MM`. Si `excluir_id` viene, filtra ese id
 * (para `PUT`, R10). Reutilizado por `crearBloque` y `actualizarBloque`.
 */
async function bloquesDelDia(usuario_id, dia_semana, excluir_id) {
  const { data, error } = await supabase
    .from("disponibilidad")
    .select("id, hora_inicio, hora_fin")
    .eq("usuario_id", usuario_id)
    .eq("dia_semana", dia_semana);

  if (error) {
    throw crearError("No se pudo verificar el solapamiento", 500, "DB_ERROR");
  }

  return (data ?? [])
    .filter((bloque) => bloque.id !== excluir_id)
    .map((bloque) => ({
      id: bloque.id,
      hora_inicio: normalizarHora(bloque.hora_inicio),
      hora_fin: normalizarHora(bloque.hora_fin),
    }));
}

/**
 * Crea un bloque asociado al `usuario_id` recibido (siempre del token, nunca
 * del body — R3). Antes de insertar comprueba que no se solape con ningún
 * bloque del mismo día (409 `OVERLAP_CONFLICT` — R7). El controller ya validó
 * `dia_semana`/formato de horas/rango.
 */
async function crearBloque({ usuario_id, dia_semana, hora_inicio, hora_fin }) {
  const existentes = await bloquesDelDia(usuario_id, dia_semana);

  const solapa = existentes.some((bloque) =>
    seSolapan(hora_inicio, hora_fin, bloque.hora_inicio, bloque.hora_fin)
  );
  if (solapa) {
    throw crearError(
      "El bloque se solapa con otro del mismo día",
      409,
      "OVERLAP_CONFLICT"
    );
  }

  const { data, error } = await supabase
    .from("disponibilidad")
    .insert({ usuario_id, dia_semana, hora_inicio, hora_fin })
    .select()
    .single();

  if (error) {
    throw crearError("No se pudo crear el bloque", 500, "DB_ERROR");
  }

  return data;
}

/**
 * Actualiza un bloque solo si pertenece al `usuario_id` recibido. Primero
 * lee el bloque propio (404 `NOT_FOUND` sin distinguir "no existe" de "es de
 * otro usuario" — R11), combina los valores efectivos con el body parcial,
 * comprueba solapamiento excluyendo su propio id (409 `OVERLAP_CONFLICT` —
 * R10) y persiste con `UPDATE ... WHERE id AND usuario_id RETURNING *` (R8).
 */
async function actualizarBloque({ usuario_id, bloque_id, cambios }) {
  const { data: actual, error: errorLectura } = await supabase
    .from("disponibilidad")
    .select("*")
    .eq("id", bloque_id)
    .eq("usuario_id", usuario_id)
    .maybeSingle();

  if (errorLectura) {
    throw crearError("No se pudo actualizar el bloque", 500, "DB_ERROR");
  }
  if (!actual) {
    throw crearError("Bloque de disponibilidad no encontrado", 404, "NOT_FOUND");
  }

  // Valores efectivos: los del body parcial cuando vienen, si no los actuales.
  const diaEfectivo = cambios.dia_semana ?? actual.dia_semana;
  const iniEfectivo = normalizarHora(cambios.hora_inicio ?? actual.hora_inicio);
  const finEfectivo = normalizarHora(cambios.hora_fin ?? actual.hora_fin);

  const existentes = await bloquesDelDia(usuario_id, diaEfectivo, bloque_id);
  const solapa = existentes.some((bloque) =>
    seSolapan(iniEfectivo, finEfectivo, bloque.hora_inicio, bloque.hora_fin)
  );
  if (solapa) {
    throw crearError(
      "El bloque se solapa con otro del mismo día",
      409,
      "OVERLAP_CONFLICT"
    );
  }

  const { data, error } = await supabase
    .from("disponibilidad")
    .update(cambios)
    .eq("id", bloque_id)
    .eq("usuario_id", usuario_id)
    .select()
    .maybeSingle();

  if (error) {
    throw crearError("No se pudo actualizar el bloque", 500, "DB_ERROR");
  }
  if (!data) {
    throw crearError("Bloque de disponibilidad no encontrado", 404, "NOT_FOUND");
  }

  return data;
}

/**
 * Elimina un bloque solo si pertenece al `usuario_id` recibido. Usa
 * `DELETE ... WHERE id AND usuario_id RETURNING *` en una sola query: 404
 * `NOT_FOUND` si 0 filas (R13), éxito si 1 fila (R12).
 */
async function eliminarBloque({ usuario_id, bloque_id }) {
  const { data, error } = await supabase
    .from("disponibilidad")
    .delete()
    .eq("id", bloque_id)
    .eq("usuario_id", usuario_id)
    .select()
    .maybeSingle();

  if (error) {
    throw crearError("No se pudo eliminar el bloque", 500, "DB_ERROR");
  }
  if (!data) {
    throw crearError("Bloque de disponibilidad no encontrado", 404, "NOT_FOUND");
  }

  return data;
}

module.exports = {
  DIAS_VALIDOS,
  validarDiaSemana,
  validarHora,
  rangoValido,
  seSolapan,
  listarDisponibilidad,
  bloquesDelDia,
  crearBloque,
  actualizarBloque,
  eliminarBloque,
};
