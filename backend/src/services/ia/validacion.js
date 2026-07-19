// Validación de la respuesta de Gemini (feature 10). Verifica que la respuesta
// cumpla el contrato esperado: campos obligatorios, formatos, coherencia
// horaria, solapamientos, y disponibilidad declarada. Responsabilidad única:
// validar y devolver el array de bloques listo para consumir.

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
 * Valida la respuesta generada por Gemini contra el contrato acordado y la
 * disponibilidad del usuario.
 *
 * @param {string} respuestaRaw Texto JSON devuelto por Gemini.
 * @param {object[]} [disponibilidad=[]] Array de disponibilidad del usuario:
 *   `{ dia: "lunes", inicio: "09:00", fin: "11:00" }`.
 * @returns {object[]} Array de bloques validados.
 * @throws {Error} Si la respuesta no cumple el contrato.
 */
function validarRespuesta(respuestaRaw, disponibilidad = []) {
  let parsed;

  // 1. Parsear JSON
  try {
    parsed = JSON.parse(respuestaRaw);
  } catch {
    throw new Error("Gemini devolvió un JSON inválido.");
  }

  // Debe existir la propiedad "bloques"
  if (!Object.prototype.hasOwnProperty.call(parsed, "bloques")) {
    throw new Error("La respuesta no contiene la propiedad 'bloques'.");
  }

  // Debe ser un arreglo
  if (!Array.isArray(parsed.bloques)) {
    throw new Error("'bloques' debe ser un arreglo.");
  }

  // Validar cada bloque
  parsed.bloques.forEach((bloque, index) => {
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
  });

  // 2. Verificar que ningún bloque se solape con otro
  for (let i = 0; i < parsed.bloques.length; i++) {
    for (let j = i + 1; j < parsed.bloques.length; j++) {
      const a = parsed.bloques[i];
      const b = parsed.bloques[j];
      if (a.fecha === b.fecha && a.hora_inicio < b.hora_fin && b.hora_inicio < a.hora_fin) {
        throw new Error(`Choque de horario entre bloques ${a.tarea_id} y ${b.tarea_id}`);
      }
    }
  }

  // 3. Verificar que los bloques caen dentro de la disponibilidad declarada
  if (disponibilidad.length > 0) {
    for (const bloque of parsed.bloques) {
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

  return parsed.bloques;
}

module.exports = { validarRespuesta };
