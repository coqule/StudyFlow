// Validación de la respuesta de Gemini (features 10 y 12). Verifica que la
// respuesta cumpla el contrato esperado: campos obligatorios, formatos,
// coherencia horaria, solapamientos, y disponibilidad declarada.
// Responsabilidad única: validar y devolver los datos listos para consumir.
//
// - `validarRespuesta` (feature 10): modo generar — formato `{ bloques }`.
// - `validarRespuestaAjuste` (feature 12): modo ajuste — formato
//   `{ bloques_eliminados, bloques_creados }`.
// Ambas comparten los helpers internos de schema, solapes y disponibilidad
// (extraídos en la feature 12 SIN cambiar el comportamiento del modo generar).

const DIAS_SEMANA = [
  "domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado",
];

/**
 * Parsea una fecha YYYY-MM-DD como cadena (sin zona horaria) y devuelve
 * el nombre del día de la semana en español (minúsculas, sin acento).
 */
function diaSemanaDesdeFecha(fechaStr) {
  const [y, m, d] = fechaStr.split("-").map(Number);
  const dia = new Date(y, m - 1, d).getDay();
  return DIAS_SEMANA[dia];
}

/**
 * Parsea el texto crudo devuelto por Gemini; lanza si no es JSON válido.
 */
function parsearJson(respuestaRaw) {
  try {
    return JSON.parse(respuestaRaw);
  } catch {
    throw new Error("Gemini devolvió un JSON inválido.");
  }
}

/**
 * Valida el schema de un bloque individual: campos obligatorios presentes y
 * no vacíos, formatos de fecha (YYYY-MM-DD) y hora (HH:MM), coherencia
 * horaria (hora_inicio < hora_fin) y tipos de tarea_id/justificacion.
 */
function validarSchemaBloque(bloque, index) {
  if (typeof bloque !== "object" || bloque === null) {
    throw new Error(`El bloque ${index} no es un objeto válido.`);
  }

  const camposObligatorios = [
    "tarea_id",
    "fecha",
    "hora_inicio",
    "hora_fin",
    "justificacion",
  ];

  for (const campo of camposObligatorios) {
    if (
      !Object.prototype.hasOwnProperty.call(bloque, campo) ||
      bloque[campo] === null ||
      bloque[campo] === ""
    ) {
      throw new Error(
        `El bloque ${index} no contiene el campo obligatorio '${campo}'.`
      );
    }
  }

  const regexFecha = /^\d{4}-\d{2}-\d{2}$/;
  if (!regexFecha.test(bloque.fecha)) {
    throw new Error(
      `La fecha del bloque ${index} tiene un formato inválido.`
    );
  }

  const regexHora = /^\d{2}:\d{2}$/;

  if (!regexHora.test(bloque.hora_inicio)) {
    throw new Error(
      `La hora_inicio del bloque ${index} tiene un formato inválido.`
    );
  }

  if (!regexHora.test(bloque.hora_fin)) {
    throw new Error(
      `La hora_fin del bloque ${index} tiene un formato inválido.`
    );
  }

  if (bloque.hora_inicio >= bloque.hora_fin) {
    throw new Error(
      `La hora_inicio debe ser menor que la hora_fin en el bloque ${index}.`
    );
  }

  if (typeof bloque.tarea_id !== "string") {
    throw new Error(`'tarea_id' del bloque ${index} debe ser un string.`);
  }

  if (typeof bloque.justificacion !== "string") {
    throw new Error(
      `'justificacion' del bloque ${index} debe ser un string.`
    );
  }
}

/**
 * Verifica que ningún par de bloques del arreglo se solape en la misma fecha.
 */
function validarSinSolapes(bloques) {
  for (let i = 0; i < bloques.length; i++) {
    for (let j = i + 1; j < bloques.length; j++) {
      const a = bloques[i];
      const b = bloques[j];
      if (a.fecha === b.fecha && a.hora_inicio < b.hora_fin && b.hora_inicio < a.hora_fin) {
        throw new Error(`Choque de horario entre bloques ${a.tarea_id} y ${b.tarea_id}`);
      }
    }
  }
}

/**
 * Verifica que cada bloque cae dentro de la disponibilidad declarada del
 * usuario: mismo día de la semana (SIN tilde: miercoles, sabado) y dentro de
 * alguno de los rangos horarios de ese día. Si `disponibilidad` está vacía,
 * no valida (mismo comportamiento que la feature 10).
 */
function validarDisponibilidad(bloques, disponibilidad) {
  if (disponibilidad.length === 0) return;
  for (const bloque of bloques) {
    const dia = diaSemanaDesdeFecha(bloque.fecha);
    const rangosDelDia = disponibilidad.filter((d) => d.dia === dia);
    if (rangosDelDia.length === 0) {
      throw new Error(
        `El bloque ${bloque.tarea_id} del ${bloque.fecha} (${dia}) está fuera de la disponibilidad declarada.`
      );
    }
    const cabeEnAlguno = rangosDelDia.some(
      (r) => bloque.hora_inicio >= r.inicio && bloque.hora_fin <= r.fin
    );
    if (!cabeEnAlguno) {
      throw new Error(
        `El bloque ${bloque.tarea_id} del ${bloque.fecha} excede los rangos de disponibilidad.`
      );
    }
  }
}

/**
 * Valida la respuesta generada por Gemini contra el contrato acordado y la
 * disponibilidad del usuario (modo generar, feature 10).
 *
 * @param {string} respuestaRaw Texto JSON devuelto por Gemini.
 * @param {object[]} [disponibilidad=[]] Array de disponibilidad del usuario:
 *   `{ dia: "lunes", inicio: "09:00", fin: "11:00" }`.
 * @returns {object[]} Array de bloques validados.
 * @throws {Error} Si la respuesta no cumple el contrato.
 */
function validarRespuesta(respuestaRaw, disponibilidad = []) {
  // 1. Parsear JSON
  const parsed = parsearJson(respuestaRaw);

  // Debe existir la propiedad "bloques"
  if (!Object.prototype.hasOwnProperty.call(parsed, "bloques")) {
    throw new Error("La respuesta no contiene la propiedad 'bloques'.");
  }

  // Debe ser un arreglo
  if (!Array.isArray(parsed.bloques)) {
    throw new Error("'bloques' debe ser un arreglo.");
  }

  // Validar cada bloque
  parsed.bloques.forEach((bloque, index) => validarSchemaBloque(bloque, index));

  // 2. Verificar que ningún bloque se solape con otro
  validarSinSolapes(parsed.bloques);

  // 3. Verificar que los bloques caen dentro de la disponibilidad declarada
  validarDisponibilidad(parsed.bloques, disponibilidad);

  return parsed.bloques;
}

/**
 * Valida la respuesta del modo ajuste (feature 12, R5–R7): formato
 * `{ bloques_eliminados, bloques_creados }`. Reutiliza los helpers de schema,
 * disponibilidad y solapes del modo generar. Además de validar los bloques
 * creados entre sí, verifica que el horario RESULTANTE (vigentes no eliminados
 * + creados) quede libre de choques (R7).
 *
 * @param {string} respuestaRaw Texto JSON devuelto por Gemini.
 * @param {object[]} [disponibilidad=[]] Disponibilidad declarada del usuario.
 * @param {object[]} [horarioVigente=[]] Bloques actuales del usuario, con
 *   `id`, `tarea_id`, `fecha`, `hora_inicio`, `hora_fin` (horas HH:MM).
 * @returns {{ eliminados: string[], creados: object[] }}
 * @throws {Error} Si la respuesta no cumple el contrato.
 */
function validarRespuestaAjuste(respuestaRaw, disponibilidad = [], horarioVigente = []) {
  // R5a — parseo JSON
  const parsed = parsearJson(respuestaRaw);

  // R5b — bloques_eliminados: arreglo de ids (strings no vacíos)
  const eliminados = parsed.bloques_eliminados;
  if (
    !Array.isArray(eliminados) ||
    eliminados.some((id) => typeof id !== "string" || id === "")
  ) {
    throw new Error(
      "'bloques_eliminados' debe ser un arreglo de ids (strings no vacíos)."
    );
  }

  // R5c — bloques_creados: arreglo
  const creados = parsed.bloques_creados;
  if (!Array.isArray(creados)) {
    throw new Error("'bloques_creados' debe ser un arreglo.");
  }

  // R5d-f — schema por bloque creado (campos, tipos, regex, coherencia horaria)
  creados.forEach((bloque, index) => validarSchemaBloque(bloque, index));

  // R6 — disponibilidad declarada (días SIN tilde)
  validarDisponibilidad(creados, disponibilidad);

  // R7 — el horario resultante (vigentes no eliminados + creados) queda libre
  // de choques: creados entre sí y contra los vigentes que permanecen.
  const setEliminados = new Set(eliminados);
  const restantes = horarioVigente.filter((b) => !setEliminados.has(String(b.id)));
  validarSinSolapes([...restantes, ...creados]);

  return { eliminados, creados };
}

module.exports = { validarRespuesta, validarRespuestaAjuste };
