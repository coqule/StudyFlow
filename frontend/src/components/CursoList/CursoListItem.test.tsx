import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CursoListItem } from "./CursoListItem";
import type { Curso } from "../../types";

const cursoDePrueba: Curso = {
  id: "1",
  usuario_id: "u1",
  nombre: "Cálculo II",
  color: "#3B82F6",
  dificultad: 5,
};

// MOCK: backend desactivado en este test (docs/conventions.md §8) —
// `actualizar`/`eliminar` llegan mockeadas por props, CursoListItem nunca
// llama a cursosApi/fetch real. `window.confirm` también se mockea.
describe("<CursoListItem />", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("muestra un botón 'Editar' por curso (R17)", () => {
    render(
      <CursoListItem curso={cursoDePrueba} actualizar={jest.fn()} eliminar={jest.fn()} error={null} />
    );

    expect(screen.getByText("Editar")).toBeInTheDocument();
  });

  it("muestra un botón 'Eliminar' por curso (R24)", () => {
    render(
      <CursoListItem curso={cursoDePrueba} actualizar={jest.fn()} eliminar={jest.fn()} error={null} />
    );

    expect(screen.getByText("Eliminar")).toBeInTheDocument();
  });

  it("al activar 'Editar' muestra campos prellenados con los valores actuales (R18)", async () => {
    const user = userEvent.setup();
    render(
      <CursoListItem curso={cursoDePrueba} actualizar={jest.fn()} eliminar={jest.fn()} error={null} />
    );

    await user.click(screen.getByText("Editar"));

    expect(screen.getByLabelText("Nombre")).toHaveValue("Cálculo II");
    expect(screen.getByLabelText("Dificultad")).toHaveValue("5");
  });

  it("confirma la edición válida invocando actualizar() con los datos correctos y sale de modo edición (R19, R21)", async () => {
    const mockActualizar = jest.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(
      <CursoListItem curso={cursoDePrueba} actualizar={mockActualizar} eliminar={jest.fn()} error={null} />
    );

    await user.click(screen.getByText("Editar"));
    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "Cálculo III");
    await user.click(screen.getByText("Guardar"));

    expect(mockActualizar).toHaveBeenCalledWith("1", {
      nombre: "Cálculo III",
      color: "#3B82F6",
      dificultad: 5,
    });
    expect(screen.queryByLabelText("Nombre")).not.toBeInTheDocument();
    expect(screen.getByText("Editar")).toBeInTheDocument();
  });

  it("con nombre vacío muestra un error en la fila y no invoca actualizar() (R20)", async () => {
    const mockActualizar = jest.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(
      <CursoListItem curso={cursoDePrueba} actualizar={mockActualizar} eliminar={jest.fn()} error={null} />
    );

    await user.click(screen.getByText("Editar"));
    await user.clear(screen.getByLabelText("Nombre"));
    await user.click(screen.getByText("Guardar"));

    expect(screen.getByRole("alert")).toHaveTextContent(/nombre/i);
    expect(mockActualizar).not.toHaveBeenCalled();
  });

  it("'Cancelar' descarta los cambios locales y no invoca actualizar() (R23)", async () => {
    const mockActualizar = jest.fn();
    const user = userEvent.setup();
    render(
      <CursoListItem curso={cursoDePrueba} actualizar={mockActualizar} eliminar={jest.fn()} error={null} />
    );

    await user.click(screen.getByText("Editar"));
    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "Cambio descartado");
    await user.click(screen.getByText("Cancelar"));

    expect(mockActualizar).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Nombre")).not.toBeInTheDocument();
    expect(screen.getByText("Cálculo II")).toBeInTheDocument();
  });

  it("si actualizar() falla muestra el error en la fila y permanece en modo edición (R22)", async () => {
    const mockActualizar = jest.fn().mockResolvedValue(false);
    const user = userEvent.setup();
    render(
      <CursoListItem
        curso={cursoDePrueba}
        actualizar={mockActualizar}
        eliminar={jest.fn()}
        error="No se pudo actualizar el curso"
      />
    );

    await user.click(screen.getByText("Editar"));
    await user.click(screen.getByText("Guardar"));

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo actualizar el curso");
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
  });

  it("'Eliminar' pide confirmación y solo invoca eliminar() si se confirma (R25, R27)", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const mockEliminar = jest.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(
      <CursoListItem curso={cursoDePrueba} actualizar={jest.fn()} eliminar={mockEliminar} error={null} />
    );

    await user.click(screen.getByText("Eliminar"));

    expect(window.confirm).toHaveBeenCalledWith('¿Eliminar el curso "Cálculo II"?');
    expect(mockEliminar).toHaveBeenCalledWith("1");
  });

  it("si el usuario no confirma la eliminación no invoca eliminar() (R26)", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    const mockEliminar = jest.fn();
    const user = userEvent.setup();
    render(
      <CursoListItem curso={cursoDePrueba} actualizar={jest.fn()} eliminar={mockEliminar} error={null} />
    );

    await user.click(screen.getByText("Eliminar"));

    expect(mockEliminar).not.toHaveBeenCalled();
  });

  it("si eliminar() falla muestra un error en la fila y el curso permanece (R29)", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const mockEliminar = jest.fn().mockResolvedValue(false);
    const user = userEvent.setup();
    render(
      <CursoListItem
        curso={cursoDePrueba}
        actualizar={jest.fn()}
        eliminar={mockEliminar}
        error="No se pudo eliminar el curso"
      />
    );

    await user.click(screen.getByText("Eliminar"));

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo eliminar el curso");
    expect(screen.getByText("Cálculo II")).toBeInTheDocument();
  });
});
