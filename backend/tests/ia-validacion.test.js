const { validarRespuesta } = require("../src/services/ia");

describe("validarRespuesta", () => {
  const DISPONIBILIDAD = [
    { dia: "lunes", inicio: "09:00", fin: "11:00" },
    { dia: "martes", inicio: "14:00", fin: "16:00" },
  ];

  const respuestaValida = JSON.stringify({
    bloques: [
      {
        tarea_id: "1",
        fecha: "2026-07-06",
        hora_inicio: "09:00",
        hora_fin: "11:00",
        justificacion: "Se asigna la tarea.",
      },
    ],
  });

  it("devuelve el array de bloques cuando el JSON es válido", () => {
    const resultado = validarRespuesta(respuestaValida, DISPONIBILIDAD);
    expect(Array.isArray(resultado)).toBe(true);
    expect(resultado[0].tarea_id).toBe("1");
  });

  it("lanza un error si la respuesta no es un JSON válido", () => {
    expect(() => validarRespuesta("esto no es json")).toThrow(
      "Gemini devolvió un JSON inválido."
    );
  });

  it("lanza un error si falta la propiedad bloques", () => {
    expect(() => validarRespuesta(JSON.stringify({}))).toThrow(
      "La respuesta no contiene la propiedad 'bloques'."
    );
  });

  it("lanza un error si bloques no es un arreglo", () => {
    expect(() =>
      validarRespuesta(JSON.stringify({ bloques: {} }))
    ).toThrow("'bloques' debe ser un arreglo.");
  });

  it("lanza un error si falta tarea_id", () => {
    const json = JSON.stringify({
      bloques: [
        {
          fecha: "2026-07-06",
          hora_inicio: "09:00",
          hora_fin: "11:00",
          justificacion: "...",
        },
      ],
    });
    expect(() => validarRespuesta(json)).toThrow(
      "El bloque 0 no contiene el campo obligatorio 'tarea_id'."
    );
  });

  it("lanza un error si la fecha tiene un formato inválido", () => {
    const json = JSON.stringify({
      bloques: [
        {
          tarea_id: "1",
          fecha: "06/07/2026",
          hora_inicio: "09:00",
          hora_fin: "11:00",
          justificacion: "...",
        },
      ],
    });
    expect(() => validarRespuesta(json)).toThrow(
      "La fecha del bloque 0 tiene un formato inválido."
    );
  });

  it("lanza un error si hora_inicio es mayor o igual que hora_fin", () => {
    const json = JSON.stringify({
      bloques: [
        {
          tarea_id: "1",
          fecha: "2026-07-06",
          hora_inicio: "11:00",
          hora_fin: "09:00",
          justificacion: "...",
        },
      ],
    });
    expect(() => validarRespuesta(json)).toThrow(
      "La hora_inicio debe ser menor que la hora_fin en el bloque 0."
    );
  });

  it("lanza un error si hay solapamiento entre bloques", () => {
    const json = JSON.stringify({
      bloques: [
        {
          tarea_id: "1",
          fecha: "2026-07-06",
          hora_inicio: "09:00",
          hora_fin: "11:00",
          justificacion: "Primer bloque.",
        },
        {
          tarea_id: "2",
          fecha: "2026-07-06",
          hora_inicio: "10:00",
          hora_fin: "12:00",
          justificacion: "Segundo bloque solapado.",
        },
      ],
    });
    expect(() => validarRespuesta(json, DISPONIBILIDAD)).toThrow(
      "Choque de horario entre bloques 1 y 2"
    );
  });

  it("lanza un error si un bloque está fuera de la disponibilidad", () => {
    const json = JSON.stringify({
      bloques: [
        {
          tarea_id: "1",
          fecha: "2026-07-06",
          hora_inicio: "12:00",
          hora_fin: "13:00",
          justificacion: "Fuera del rango disponible.",
        },
      ],
    });
    expect(() => validarRespuesta(json, DISPONIBILIDAD)).toThrow(
      "excede el rango de disponibilidad"
    );
  });

  it("lanza un error si el día no está en la disponibilidad", () => {
    const json = JSON.stringify({
      bloques: [
        {
          tarea_id: "1",
          fecha: "2026-07-08",
          hora_inicio: "09:00",
          hora_fin: "11:00",
          justificacion: "Miércoles no disponible.",
        },
      ],
    });
    expect(() => validarRespuesta(json, DISPONIBILIDAD)).toThrow(
      "está fuera de la disponibilidad declarada"
    );
  });

  it("no valida disponibilidad si no se pasa el parámetro", () => {
    const json = JSON.stringify({
      bloques: [
        {
          tarea_id: "1",
          fecha: "2026-07-06",
          hora_inicio: "12:00",
          hora_fin: "13:00",
          justificacion: "Sin disponibilidad declarada.",
        },
      ],
    });
    expect(() => validarRespuesta(json)).not.toThrow();
    const resultado = validarRespuesta(json);
    expect(resultado.length).toBe(1);
  });
});
