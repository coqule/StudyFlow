import { render, screen } from "@testing-library/react";

import { CursoList } from "./CursoList";
import type { Curso } from "../../types";

const cursosDePrueba: Curso[] = [
  {
    id: "1",
    usuario_id: "u1",
    nombre: "Cálculo II",
    color: "#3B82F6",
    dificultad: 5,
  },
  {
    id: "2",
    usuario_id: "u1",
    nombre: "Programación I",
    color: "#10B981",
    dificultad: 2,
  },
];

describe("<CursoList />", () => {
  it("renderiza la lista de cursos recibida por props (R15)", () => {
    render(
      <CursoList cursos={cursosDePrueba} actualizar={jest.fn()} eliminar={jest.fn()} error={null} />
    );

    expect(screen.getByText("Cálculo II")).toBeInTheDocument();
    expect(screen.getByText("Programación I")).toBeInTheDocument();
  });

  it("muestra un estado vacío cuando no hay cursos (R15)", () => {
    render(<CursoList cursos={[]} actualizar={jest.fn()} eliminar={jest.fn()} error={null} />);

    expect(screen.getByText("Aún no tienes cursos.")).toBeInTheDocument();
  });

  it("muestra los botones 'Editar' y 'Eliminar' por cada curso (R17, R24)", () => {
    render(
      <CursoList cursos={cursosDePrueba} actualizar={jest.fn()} eliminar={jest.fn()} error={null} />
    );

    expect(screen.getAllByText("Editar")).toHaveLength(cursosDePrueba.length);
    expect(screen.getAllByText("Eliminar")).toHaveLength(cursosDePrueba.length);
  });
});
