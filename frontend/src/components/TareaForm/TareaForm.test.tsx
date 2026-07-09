import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TareaForm } from "./TareaForm";
import type { Curso } from "../../types";

// MOCK: backend desactivado en este test (docs/conventions.md §8) —
// `crear`/`cursos` se pasan por props (specs/tareas_crud/design.md §5),
// TareaForm nunca llama useTareas()/useCursos() por su cuenta.
const mockCrear = jest.fn();

const cursosDePrueba: Curso[] = [
  { id: "curso-1", usuario_id: "u1", nombre: "Cálculo II", color: "#3B82F6", dificultad: 5 },
];

function fechaFutura(dias = 7): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function fechaPasada(dias = 1): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha.toISOString().slice(0, 10);
}

describe("<TareaForm />", () => {
  beforeEach(() => {
    mockCrear.mockClear();
  });

  it("llama a crear() con los datos correctos al enviar el formulario con datos válidos (R13, R14)", async () => {
    const user = userEvent.setup();
    render(<TareaForm crear={mockCrear} cursos={cursosDePrueba} />);

    await user.type(screen.getByLabelText("Título"), "Examen parcial");
    await user.selectOptions(screen.getByLabelText("Tipo"), "examen");
    await user.type(screen.getByLabelText("Fecha límite"), fechaFutura());
    await user.selectOptions(screen.getByLabelText("Prioridad"), "5");
    await user.click(screen.getByText("Guardar"));

    expect(mockCrear).toHaveBeenCalledWith({
      curso_id: "curso-1",
      titulo: "Examen parcial",
      tipo: "examen",
      fecha_limite: fechaFutura(),
      duracion_estimada_h: expect.any(Number),
      prioridad: 5,
    });
  });

  it("muestra un error y no llama a crear() si la fecha límite no es futura (R15)", async () => {
    const user = userEvent.setup();
    render(<TareaForm crear={mockCrear} cursos={cursosDePrueba} />);

    await user.type(screen.getByLabelText("Título"), "Examen parcial");
    await user.type(screen.getByLabelText("Fecha límite"), fechaPasada());
    await user.click(screen.getByText("Guardar"));

    expect(screen.getByRole("alert")).toHaveTextContent(/fecha límite/i);
    expect(mockCrear).not.toHaveBeenCalled();
  });
});
