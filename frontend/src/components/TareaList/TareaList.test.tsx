import { render, screen } from "@testing-library/react";

import { TareaList } from "./TareaList";
import type { Curso, Tarea } from "../../types";

const cursosDePrueba: Curso[] = [
  { id: "curso-1", usuario_id: "u1", nombre: "Cálculo II", color: "#3B82F6", dificultad: 5 },
];

const tareasDePrueba: Tarea[] = [
  {
    id: "1",
    curso_id: "curso-1",
    titulo: "Examen parcial",
    tipo: "examen",
    fecha_limite: "2099-01-01",
    duracion_estimada_h: 3,
    prioridad: 5,
    estado: "pendiente",
  },
  {
    id: "2",
    curso_id: "curso-1",
    titulo: "Tarea de práctica",
    tipo: "tarea",
    fecha_limite: "2099-02-01",
    duracion_estimada_h: 1,
    prioridad: 2,
    estado: "pendiente",
  },
];

describe("<TareaList />", () => {
  it("renderiza la lista de tareas recibida por props (R16)", () => {
    render(
      <TareaList
        tareas={tareasDePrueba}
        cursos={cursosDePrueba}
        actualizar={jest.fn()}
        eliminar={jest.fn()}
        error={null}
      />
    );

    expect(screen.getByText("Examen parcial")).toBeInTheDocument();
    expect(screen.getByText("Tarea de práctica")).toBeInTheDocument();
  });

  it("muestra un estado vacío cuando no hay tareas (R16)", () => {
    render(
      <TareaList tareas={[]} cursos={cursosDePrueba} actualizar={jest.fn()} eliminar={jest.fn()} error={null} />
    );

    expect(screen.getByText("Aún no tienes tareas.")).toBeInTheDocument();
  });

  it("muestra los botones 'Editar' y 'Eliminar' por cada tarea (R18, R26)", () => {
    render(
      <TareaList
        tareas={tareasDePrueba}
        cursos={cursosDePrueba}
        actualizar={jest.fn()}
        eliminar={jest.fn()}
        error={null}
      />
    );

    expect(screen.getAllByText("Editar")).toHaveLength(tareasDePrueba.length);
    expect(screen.getAllByText("Eliminar")).toHaveLength(tareasDePrueba.length);
  });
});
