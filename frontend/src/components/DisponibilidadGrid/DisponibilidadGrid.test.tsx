import { render, screen, within } from "@testing-library/react";

import { DisponibilidadGrid } from "./DisponibilidadGrid";
import type { Disponibilidad } from "../../types";

const bloquesDePrueba: Disponibilidad[] = [
  {
    id: "1",
    usuario_id: "u1",
    dia_semana: "lunes",
    hora_inicio: "08:00",
    hora_fin: "10:00",
  },
  {
    id: "2",
    usuario_id: "u1",
    dia_semana: "miercoles",
    hora_inicio: "14:00",
    hora_fin: "16:00",
  },
];

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

describe("<DisponibilidadGrid />", () => {
  it("renderiza los 7 días de la semana (R14)", () => {
    render(
      <DisponibilidadGrid
        bloques={[]}
        actualizar={jest.fn()}
        eliminar={jest.fn()}
        error={null}
      />
    );

    for (const dia of DIAS) {
      expect(screen.getByRole("region", { name: dia })).toBeInTheDocument();
    }
  });

  it("ubica cada bloque bajo el día correspondiente a su dia_semana (R15)", () => {
    render(
      <DisponibilidadGrid
        bloques={bloquesDePrueba}
        actualizar={jest.fn()}
        eliminar={jest.fn()}
        error={null}
      />
    );

    const lunes = screen.getByRole("region", { name: "lunes" });
    expect(within(lunes).getByText("08:00–10:00")).toBeInTheDocument();

    const miercoles = screen.getByRole("region", { name: "miercoles" });
    expect(within(miercoles).getByText("14:00–16:00")).toBeInTheDocument();

    // El bloque del lunes NO aparece bajo el martes (estado vacío por día).
    const martes = screen.getByRole("region", { name: "martes" });
    expect(within(martes).getByText("Sin bloques")).toBeInTheDocument();
  });

  it("muestra botones 'Editar' y 'Eliminar' por cada bloque (R21, R28)", () => {
    render(
      <DisponibilidadGrid
        bloques={bloquesDePrueba}
        actualizar={jest.fn()}
        eliminar={jest.fn()}
        error={null}
      />
    );

    expect(screen.getAllByText("Editar")).toHaveLength(bloquesDePrueba.length);
    expect(screen.getAllByText("Eliminar")).toHaveLength(bloquesDePrueba.length);
  });
});
