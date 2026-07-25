// Tests unitarios de validarRespuestaAjuste (feature 12 — modo ajuste).
// Función pura: SIN mocks de red ni de módulos (mismo criterio que la feature
// 10). Se importa por la interfaz pública del módulo IA (R14).
const { validarRespuestaAjuste } = require("../src/services/ia");

describe("validarRespuestaAjuste — specs/ia_endpoint_ajustar (R5, R6, R7)", () => {
  // 2026-07-06 es lunes; 2026-07-07 es martes; 2026-07-08 es miercoles.
  const DISPONIBILIDAD = [
    { dia: "lunes", inicio: "09:00", fin: "12:00" },
    { dia: "martes", inicio: "14:00", fin: "18:00" },
  ];

  // Horario vigente del usuario, con el formato normalizado del service.
  const HORARIO_VIGENTE = [
    {
      id: "bloque-vigente-1",
      tarea_id: "t9",
      fecha: "2026-07-06",
      hora_inicio: "09:00",
      hora_fin: "11:00",
      generado_por_ia: true,
    },
  ];

  function bloqueCreado(extra = {}) {
    return {
      tarea_id: "t1",
      fecha: "2026-07-07",
      hora_inicio: "14:00",
      hora_fin: "16:00",
      justificacion: "Se reubica la tarea según la instrucción.",
      ...extra,
    };
  }

  function respuesta(eliminados, creados) {
    return JSON.stringify({
      bloques_eliminados: eliminados,
      bloques_creados: creados,
    });
  }

  // ---------- R5a — JSON inválido ----------

  it("lanza un error si la respuesta no es un JSON válido (R5a)", () => {
    expect(() => validarRespuestaAjuste("esto no es json")).toThrow(
      "Gemini devolvió un JSON inválido."
    );
  });

  // ---------- R5b — bloques_eliminados ----------

  it("lanza un error si falta bloques_eliminados (R5b)", () => {
    const json = JSON.stringify({ bloques_creados: [] });
    expect(() => validarRespuestaAjuste(json)).toThrow(
      "'bloques_eliminados' debe ser un arreglo de ids (strings no vacíos)."
    );
  });

  it("lanza un error si bloques_eliminados no es un arreglo (R5b)", () => {
    const json = JSON.stringify({ bloques_eliminados: "b1", bloques_creados: [] });
    expect(() => validarRespuestaAjuste(json)).toThrow(
      "'bloques_eliminados' debe ser un arreglo de ids (strings no vacíos)."
    );
  });

  it("lanza un error si bloques_eliminados contiene elementos que no son strings (R5b)", () => {
    const json = respuesta([123], []);
    expect(() => validarRespuestaAjuste(json)).toThrow(
      "'bloques_eliminados' debe ser un arreglo de ids (strings no vacíos)."
    );
  });

  it("lanza un error si bloques_eliminados contiene strings vacíos (R5b)", () => {
    const json = respuesta([""], []);
    expect(() => validarRespuestaAjuste(json)).toThrow(
      "'bloques_eliminados' debe ser un arreglo de ids (strings no vacíos)."
    );
  });

  // ---------- R5c — bloques_creados ----------

  it("lanza un error si falta bloques_creados (R5c)", () => {
    const json = JSON.stringify({ bloques_eliminados: [] });
    expect(() => validarRespuestaAjuste(json)).toThrow(
      "'bloques_creados' debe ser un arreglo."
    );
  });

  it("lanza un error si bloques_creados no es un arreglo (R5c)", () => {
    const json = JSON.stringify({ bloques_eliminados: [], bloques_creados: {} });
    expect(() => validarRespuestaAjuste(json)).toThrow(
      "'bloques_creados' debe ser un arreglo."
    );
  });

  // ---------- R5d — campos obligatorios por bloque creado ----------

  const CAMPOS = ["tarea_id", "fecha", "hora_inicio", "hora_fin", "justificacion"];

  for (const campo of CAMPOS) {
    it(`lanza un error si un bloque creado no tiene '${campo}' (R5d)`, () => {
      const bloque = bloqueCreado();
      delete bloque[campo];
      expect(() => validarRespuestaAjuste(respuesta([], [bloque]))).toThrow(
        `El bloque 0 no contiene el campo obligatorio '${campo}'.`
      );
    });

    it(`lanza un error si '${campo}' de un bloque creado es null (R5d)`, () => {
      const bloque = bloqueCreado({ [campo]: null });
      expect(() => validarRespuestaAjuste(respuesta([], [bloque]))).toThrow(
        `El bloque 0 no contiene el campo obligatorio '${campo}'.`
      );
    });
  }

  it("lanza un error si tarea_id no es un string (R5d)", () => {
    const bloque = bloqueCreado({ tarea_id: 42 });
    expect(() => validarRespuestaAjuste(respuesta([], [bloque]))).toThrow(
      "'tarea_id' del bloque 0 debe ser un string."
    );
  });

  it("lanza un error si justificacion no es un string (R5d)", () => {
    const bloque = bloqueCreado({ justificacion: 42 });
    expect(() => validarRespuestaAjuste(respuesta([], [bloque]))).toThrow(
      "'justificacion' del bloque 0 debe ser un string."
    );
  });

  // ---------- R5e — formatos de fecha y hora ----------

  it("lanza un error si la fecha no cumple YYYY-MM-DD (R5e)", () => {
    const bloque = bloqueCreado({ fecha: "07/07/2026" });
    expect(() => validarRespuestaAjuste(respuesta([], [bloque]))).toThrow(
      "La fecha del bloque 0 tiene un formato inválido."
    );
  });

  it("lanza un error si hora_inicio no cumple HH:MM (R5e)", () => {
    const bloque = bloqueCreado({ hora_inicio: "9am" });
    expect(() => validarRespuestaAjuste(respuesta([], [bloque]))).toThrow(
      "La hora_inicio del bloque 0 tiene un formato inválido."
    );
  });

  it("lanza un error si hora_fin no cumple HH:MM (R5e)", () => {
    const bloque = bloqueCreado({ hora_fin: "16:00:00" });
    expect(() => validarRespuestaAjuste(respuesta([], [bloque]))).toThrow(
      "La hora_fin del bloque 0 tiene un formato inválido."
    );
  });

  // ---------- R5f — coherencia horaria ----------

  it("lanza un error si hora_fin es igual a hora_inicio (R5f)", () => {
    const bloque = bloqueCreado({ hora_inicio: "14:00", hora_fin: "14:00" });
    expect(() => validarRespuestaAjuste(respuesta([], [bloque]))).toThrow(
      "La hora_inicio debe ser menor que la hora_fin en el bloque 0."
    );
  });

  it("lanza un error si hora_fin es anterior a hora_inicio (R5f)", () => {
    const bloque = bloqueCreado({ hora_inicio: "16:00", hora_fin: "14:00" });
    expect(() => validarRespuestaAjuste(respuesta([], [bloque]))).toThrow(
      "La hora_inicio debe ser menor que la hora_fin en el bloque 0."
    );
  });

  // ---------- R6 — disponibilidad (días SIN tilde) ----------

  it("lanza un error si un bloque creado cae en un día sin disponibilidad (miercoles, sin tilde) (R6)", () => {
    // 2026-07-08 es miercoles; la disponibilidad solo cubre lunes y martes.
    const bloque = bloqueCreado({ fecha: "2026-07-08" });
    expect(() =>
      validarRespuestaAjuste(respuesta([], [bloque]), DISPONIBILIDAD, [])
    ).toThrow(/fuera de la disponibilidad/);
  });

  it("lanza un error si un bloque creado excede el rango de disponibilidad del día (R6)", () => {
    // Martes disponible 14:00-18:00; el bloque termina 19:00.
    const bloque = bloqueCreado({ hora_inicio: "17:00", hora_fin: "19:00" });
    expect(() =>
      validarRespuestaAjuste(respuesta([], [bloque]), DISPONIBILIDAD, [])
    ).toThrow(/excede los rangos de disponibilidad/);
  });

  // ---------- R7 — solapes en el horario resultante ----------

  it("lanza un error si dos bloques creados se solapan entre sí (R7a)", () => {
    const a = bloqueCreado({ hora_inicio: "14:00", hora_fin: "16:00" });
    const b = bloqueCreado({ tarea_id: "t2", hora_inicio: "15:00", hora_fin: "17:00" });
    expect(() =>
      validarRespuestaAjuste(respuesta([], [a, b]), DISPONIBILIDAD, [])
    ).toThrow(/Choque de horario/);
  });

  it("lanza un error si un bloque creado choca con un vigente NO eliminado (R7b)", () => {
    // El vigente ocupa lunes 09:00-11:00 y NO está en bloques_eliminados.
    const creado = bloqueCreado({
      fecha: "2026-07-06",
      hora_inicio: "10:00",
      hora_fin: "12:00",
    });
    expect(() =>
      validarRespuestaAjuste(respuesta([], [creado]), DISPONIBILIDAD, HORARIO_VIGENTE)
    ).toThrow(/Choque de horario/);
  });

  it("acepta un bloque creado que ocupa el hueco de un vigente SÍ eliminado y devuelve { eliminados, creados } (R7c)", () => {
    const creado = bloqueCreado({
      fecha: "2026-07-06",
      hora_inicio: "09:00",
      hora_fin: "11:00",
    });
    const resultado = validarRespuestaAjuste(
      respuesta(["bloque-vigente-1"], [creado]),
      DISPONIBILIDAD,
      HORARIO_VIGENTE
    );

    expect(resultado).toEqual({
      eliminados: ["bloque-vigente-1"],
      creados: [creado],
    });
  });

  it("acepta una respuesta sin cambios (arrays vacíos) (R5/R7)", () => {
    const resultado = validarRespuestaAjuste(
      respuesta([], []),
      DISPONIBILIDAD,
      HORARIO_VIGENTE
    );
    expect(resultado).toEqual({ eliminados: [], creados: [] });
  });
});
