import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TareaListItem } from "./TareaListItem";
import type { Curso, Tarea } from "../../types";

const cursosDePrueba: Curso[] = [
  { id: "curso-1", usuario_id: "u1", nombre: "Cálculo II", color: "#3B82F6", dificultad: 5 },
  { id: "curso-2", usuario_id: "u1", nombre: "Física I", color: "#EF4444", dificultad: 3 },
];

const tareaDePrueba: Tarea = {
  id: "1",
  curso_id: "curso-1",
  titulo: "Examen parcial",
  tipo: "examen",
  fecha_limite: "2099-01-01",
  duracion_estimada_h: 3,
  prioridad: 5,
  estado: "pendiente",
};

function fechaPasada(dias = 1): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha.toISOString().slice(0, 10);
}

// MOCK: backend desactivado en este test (docs/conventions.md §8) —
// `actualizar`/`eliminar` llegan mockeadas por props, TareaListItem nunca
// llama a tareasApi/fetch real. `window.confirm` también se mockea.
describe("<TareaListItem />", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("muestra un botón 'Editar' por tarea (R18)", () => {
    render(
      <TareaListItem
        tarea={tareaDePrueba}
        cursos={cursosDePrueba}
        actualizar={jest.fn()}
        eliminar={jest.fn()}
        error={null}
      />
    );

    expect(screen.getByText("Editar")).toBeInTheDocument();
  });

  it("muestra un botón 'Eliminar' por tarea (R26)", () => {
    render(
      <TareaListItem
        tarea={tareaDePrueba}
        cursos={cursosDePrueba}
        actualizar={jest.fn()}
        eliminar={jest.fn()}
        error={null}
      />
    );

    expect(screen.getByText("Eliminar")).toBeInTheDocument();
  });

  it("al activar 'Editar' muestra campos prellenados con los valores actuales (R19)", async () => {
    const user = userEvent.setup();
    render(
      <TareaListItem
        tarea={tareaDePrueba}
        cursos={cursosDePrueba}
        actualizar={jest.fn()}
        eliminar={jest.fn()}
        error={null}
      />
    );

    await user.click(screen.getByText("Editar"));

    expect(screen.getByLabelText("Título")).toHaveValue("Examen parcial");
    expect(screen.getByLabelText("Tipo")).toHaveValue("examen");
    expect(screen.getByLabelText("Fecha límite")).toHaveValue("2099-01-01");
    expect(screen.getByLabelText("Duración estimada (h)")).toHaveValue(3);
    expect(screen.getByLabelText("Prioridad")).toHaveValue("5");
    expect(screen.getByLabelText("Curso")).toHaveValue("curso-1");
  });

  it("la edición válida invoca actualizar() con los datos correctos y sale de modo edición (R20, R23)", async () => {
    const mockActualizar = jest.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(
      <TareaListItem
        tarea={tareaDePrueba}
        cursos={cursosDePrueba}
        actualizar={mockActualizar}
        eliminar={jest.fn()}
        error={null}
      />
    );

    await user.click(screen.getByText("Editar"));
    await user.clear(screen.getByLabelText("Título"));
    await user.type(screen.getByLabelText("Título"), "Examen final");
    await user.click(screen.getByText("Guardar"));

    expect(mockActualizar).toHaveBeenCalledWith("1", {
      curso_id: "curso-1",
      titulo: "Examen final",
      tipo: "examen",
      fecha_limite: "2099-01-01",
      duracion_estimada_h: 3,
      prioridad: 5,
    });
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument();
    expect(screen.getByText("Editar")).toBeInTheDocument();
  });

  it("con título vacío muestra un error en la fila y no invoca actualizar() (R21)", async () => {
    const mockActualizar = jest.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(
      <TareaListItem
        tarea={tareaDePrueba}
        cursos={cursosDePrueba}
        actualizar={mockActualizar}
        eliminar={jest.fn()}
        error={null}
      />
    );

    await user.click(screen.getByText("Editar"));
    await user.clear(screen.getByLabelText("Título"));
    await user.click(screen.getByText("Guardar"));

    expect(screen.getByRole("alert")).toHaveTextContent(/título/i);
    expect(mockActualizar).not.toHaveBeenCalled();
  });

  it("con fecha_limite pasada muestra un error en la fila y no invoca actualizar() (R22)", async () => {
    const mockActualizar = jest.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(
      <TareaListItem
        tarea={tareaDePrueba}
        cursos={cursosDePrueba}
        actualizar={mockActualizar}
        eliminar={jest.fn()}
        error={null}
      />
    );

    await user.click(screen.getByText("Editar"));
    await user.clear(screen.getByLabelText("Fecha límite"));
    await user.type(screen.getByLabelText("Fecha límite"), fechaPasada());
    await user.click(screen.getByText("Guardar"));

    expect(screen.getByRole("alert")).toHaveTextContent(/fecha límite/i);
    expect(mockActualizar).not.toHaveBeenCalled();
  });

  it("si actualizar() falla muestra el error en la fila y permanece en modo edición (R24)", async () => {
    const mockActualizar = jest.fn().mockResolvedValue(false);
    const user = userEvent.setup();
    render(
      <TareaListItem
        tarea={tareaDePrueba}
        cursos={cursosDePrueba}
        actualizar={mockActualizar}
        eliminar={jest.fn()}
        error="No se pudo actualizar la tarea"
      />
    );

    await user.click(screen.getByText("Editar"));
    await user.click(screen.getByText("Guardar"));

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo actualizar la tarea");
    expect(screen.getByLabelText("Título")).toBeInTheDocument();
  });

  it("'Cancelar' descarta los cambios locales y no invoca actualizar() (R25)", async () => {
    const mockActualizar = jest.fn();
    const user = userEvent.setup();
    render(
      <TareaListItem
        tarea={tareaDePrueba}
        cursos={cursosDePrueba}
        actualizar={mockActualizar}
        eliminar={jest.fn()}
        error={null}
      />
    );

    await user.click(screen.getByText("Editar"));
    await user.clear(screen.getByLabelText("Título"));
    await user.type(screen.getByLabelText("Título"), "Cambio descartado");
    await user.click(screen.getByText("Cancelar"));

    expect(mockActualizar).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument();
    expect(screen.getByText("Examen parcial")).toBeInTheDocument();
  });

  it("'Eliminar' pide confirmación y solo invoca eliminar() si se confirma (R27, R29)", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const mockEliminar = jest.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(
      <TareaListItem
        tarea={tareaDePrueba}
        cursos={cursosDePrueba}
        actualizar={jest.fn()}
        eliminar={mockEliminar}
        error={null}
      />
    );

    await user.click(screen.getByText("Eliminar"));

    expect(window.confirm).toHaveBeenCalledWith('¿Eliminar la tarea "Examen parcial"?');
    expect(mockEliminar).toHaveBeenCalledWith("1");
  });

  it("si el usuario no confirma la eliminación no invoca eliminar() (R28)", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    const mockEliminar = jest.fn();
    const user = userEvent.setup();
    render(
      <TareaListItem
        tarea={tareaDePrueba}
        cursos={cursosDePrueba}
        actualizar={jest.fn()}
        eliminar={mockEliminar}
        error={null}
      />
    );

    await user.click(screen.getByText("Eliminar"));

    expect(mockEliminar).not.toHaveBeenCalled();
  });

  it("si eliminar() falla muestra un error en la fila y la tarea permanece (R31)", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const mockEliminar = jest.fn().mockResolvedValue(false);
    const user = userEvent.setup();
    render(
      <TareaListItem
        tarea={tareaDePrueba}
        cursos={cursosDePrueba}
        actualizar={jest.fn()}
        eliminar={mockEliminar}
        error="No se pudo eliminar la tarea"
      />
    );

    await user.click(screen.getByText("Eliminar"));

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo eliminar la tarea");
    expect(screen.getByText("Examen parcial")).toBeInTheDocument();
  });
});
