import { render, screen, within } from "@testing-library/react";

import { CalendarioSemanal } from "./CalendarioSemanal";
import type { BloqueHorario } from "../../types";

// 2026-07-06 es lunes; 2026-07-08 es miércoles.
const bloqueLunesIa: BloqueHorario = {
  id: "b1",
  tarea_id: "t1",
  tarea_titulo: "Examen Cálculo II",
  tarea_tipo: "examen",
  tarea_prioridad: 5,
  curso_nombre: "Cálculo II",
  curso_color: "#3B82F6",
  fecha: "2026-07-06",
  hora_inicio: "18:00",
  hora_fin: "21:00",
  generado_por_ia: true,
  justificacion: "Fecha límite más próxima.",
};

const bloqueMiercolesManual: BloqueHorario = {
  id: "b2",
  tarea_id: "t2",
  tarea_titulo: "TP Física",
  tarea_tipo: "tarea",
  tarea_prioridad: 2,
  curso_nombre: "Física",
  curso_color: "#EF4444",
  fecha: "2026-07-08",
  hora_inicio: "14:00",
  hora_fin: "16:00",
  generado_por_ia: false,
  justificacion: "Movido manualmente.",
};

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

describe("<CalendarioSemanal />", () => {
  it("renderiza los 7 días de la semana como estructura navegable (R8, R11)", () => {
    render(<CalendarioSemanal bloques={[]} />);

    for (const dia of DIAS) {
      expect(screen.getByRole("region", { name: dia })).toBeInTheDocument();
    }
  });

  it("muestra un estado vacío navegable cuando no hay bloques (R11)", () => {
    render(<CalendarioSemanal bloques={[]} />);

    // La grilla sigue en pie (7 regiones) y comunica el vacío sin romperse.
    expect(screen.getByRole("region", { name: "lunes" })).toBeInTheDocument();
    expect(screen.getAllByText(/sin bloques/i).length).toBeGreaterThan(0);
  });

  it("ubica cada bloque bajo el día que le corresponde según su fecha (R8)", () => {
    render(<CalendarioSemanal bloques={[bloqueLunesIa, bloqueMiercolesManual]} />);

    const lunes = screen.getByRole("region", { name: "lunes" });
    expect(within(lunes).getByText("Cálculo II")).toBeInTheDocument();

    const miercoles = screen.getByRole("region", { name: "miercoles" });
    expect(within(miercoles).getByText("Física")).toBeInTheDocument();

    // El bloque del lunes no aparece bajo el martes.
    const martes = screen.getByRole("region", { name: "martes" });
    expect(within(martes).queryByText("Cálculo II")).not.toBeInTheDocument();
  });

  it("muestra nombre del curso, tipo y título de tarea en cada bloque (R9)", () => {
    render(<CalendarioSemanal bloques={[bloqueLunesIa]} />);

    expect(screen.getByText("Cálculo II")).toBeInTheDocument();
    expect(screen.getByText("examen")).toBeInTheDocument();
    expect(screen.getByText("Examen Cálculo II")).toBeInTheDocument();
  });

  it("colorea cada bloque según curso_color (R9)", () => {
    render(<CalendarioSemanal bloques={[bloqueLunesIa]} />);

    const bloque = screen.getByTestId("bloque-b1");
    // El color del curso se aplica inline (color arbitrario del usuario, no cabe
    // en un token estático). jsdom normaliza el hex a rgb.
    expect(bloque).toHaveStyle({ borderLeftColor: "rgb(59, 130, 246)" });
  });

  it("muestra un indicador de prioridad alta solo cuando la prioridad es >= 4 (R9)", () => {
    render(<CalendarioSemanal bloques={[bloqueLunesIa, bloqueMiercolesManual]} />);

    // El bloque de prioridad 5 lo tiene; el de prioridad 2 no.
    const altaEnBloqueIa = within(screen.getByTestId("bloque-b1")).queryByLabelText(
      /prioridad alta/i
    );
    const altaEnBloqueManual = within(screen.getByTestId("bloque-b2")).queryByLabelText(
      /prioridad alta/i
    );
    expect(altaEnBloqueIa).toBeInTheDocument();
    expect(altaEnBloqueManual).not.toBeInTheDocument();
  });

  it("distingue visualmente los bloques generados por IA de los movidos manualmente (R10)", () => {
    render(<CalendarioSemanal bloques={[bloqueLunesIa, bloqueMiercolesManual]} />);

    expect(
      within(screen.getByTestId("bloque-b1")).getByLabelText(/generado por ia/i)
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("bloque-b2")).getByLabelText(/movido manualmente/i)
    ).toBeInTheDocument();
  });

  it("muestra un mensaje de error cuando se le pasa uno, sin romper la grilla (R12)", () => {
    render(<CalendarioSemanal bloques={[]} error="No se pudo cargar el horario" />);

    expect(screen.getByText("No se pudo cargar el horario")).toBeInTheDocument();
    // La grilla sigue presente pese al error.
    expect(screen.getByRole("region", { name: "lunes" })).toBeInTheDocument();
  });
});
