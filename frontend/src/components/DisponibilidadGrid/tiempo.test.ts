import { VENTANA_DIA, marcasHorarias, posicionBloque } from "./tiempo";
import type { Disponibilidad } from "../../types";

describe("VENTANA_DIA", () => {
  it("cubre el día completo, de 00:00 a 24:00", () => {
    expect(VENTANA_DIA).toEqual({ inicio: 0, fin: 24 * 60 });
  });
});

describe("marcasHorarias", () => {
  it("genera una marca por cada hora del día, de 00:00 a 24:00", () => {
    const marcas = marcasHorarias(VENTANA_DIA);

    expect(marcas).toHaveLength(25);
    expect(marcas[0]).toEqual({ hora: 0, top: 0 });
    expect(marcas[marcas.length - 1]).toEqual({ hora: 24, top: 100 });
  });

  it("distribuye las marcas de forma pareja (cada hora ocupa el mismo % de altura)", () => {
    const marcas = marcasHorarias(VENTANA_DIA);

    expect(marcas[1].top).toBeCloseTo(100 / 24, 5);
    expect(marcas[12].top).toBeCloseTo(50, 5);
  });
});

describe("posicionBloque", () => {
  it("un bloque de 08:00 a 10:00 arranca exactamente en el mismo % que la marca de las 08:00", () => {
    const bloque: Disponibilidad = {
      id: "1",
      usuario_id: "u1",
      dia_semana: "lunes",
      hora_inicio: "08:00",
      hora_fin: "10:00",
    };

    const posicion = posicionBloque(bloque, VENTANA_DIA);
    const marcaOcho = marcasHorarias(VENTANA_DIA).find((m) => m.hora === 8)!;

    expect(parseFloat(posicion.top)).toBeCloseTo(marcaOcho.top, 5);
    expect(parseFloat(posicion.height)).toBeCloseTo((2 / 24) * 100, 5);
  });
});
