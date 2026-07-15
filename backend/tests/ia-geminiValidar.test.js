const { validarRespuesta } = require("../src/services/ia");

describe("validarRespuesta", () => {

  const respuestaValida = JSON.stringify({
    bloques: [
      {
        tarea_id: "1",
        fecha: "2026-07-06",
        hora_inicio: "09:00",
        hora_fin: "11:00",
        justificacion: "Se asigna la tarea."
      }
    ]
  });

  it("devuelve el objeto cuando el JSON es válido", () => {
    const resultado = validarRespuesta(respuestaValida);

    expect(resultado).toEqual(JSON.parse(respuestaValida));
  });

  it("lanza un error si la respuesta no es un JSON válido", () => {
    expect(() =>
      validarRespuesta("esto no es json")
    ).toThrow("Gemini devolvió un JSON inválido.");
  });

  it("lanza un error si falta la propiedad bloques", () => {
    const json = JSON.stringify({});

    expect(() =>
      validarRespuesta(json)
    ).toThrow("La respuesta no contiene la propiedad 'bloques'.");
  });

  it("lanza un error si bloques no es un arreglo", () => {
    const json = JSON.stringify({
      bloques: {}
    });

    expect(() =>
      validarRespuesta(json)
    ).toThrow("'bloques' debe ser un arreglo.");
  });

  it("lanza un error si falta tarea_id", () => {
    const json = JSON.stringify({
      bloques: [
        {
          fecha: "2026-07-06",
          hora_inicio: "09:00",
          hora_fin: "11:00",
          justificacion: "..."
        }
      ]
    });

    expect(() =>
      validarRespuesta(json)
    ).toThrow("El bloque 0 no contiene el campo obligatorio 'tarea_id'.");
  });

  it("lanza un error si la fecha tiene un formato inválido", () => {
    const json = JSON.stringify({
      bloques: [
        {
          tarea_id: "1",
          fecha: "06/07/2026",
          hora_inicio: "09:00",
          hora_fin: "11:00",
          justificacion: "..."
        }
      ]
    });

    expect(() =>
      validarRespuesta(json)
    ).toThrow("La fecha del bloque 0 tiene un formato inválido.");
  });

  it("lanza un error si hora_inicio es mayor o igual que hora_fin", () => {
    const json = JSON.stringify({
      bloques: [
        {
          tarea_id: "1",
          fecha: "2026-07-06",
          hora_inicio: "11:00",
          hora_fin: "09:00",
          justificacion: "..."
        }
      ]
    });

    expect(() =>
      validarRespuesta(json)
    ).toThrow("La hora_inicio debe ser menor que la hora_fin en el bloque 0.");
  });

});