// Type-check de objetos de ejemplo contra cada una de las 5 interfaces.
// Si algún campo no coincide con docs/modelo-datos.md, `tsc` (vía ts-jest)
// falla en tiempo de compilación antes de que el test llegue a ejecutarse.
import type {
  Usuario,
  Curso,
  Tarea,
  Disponibilidad,
  BloqueHorario,
} from "./index";

describe("Interfaces de dominio (docs/modelo-datos.md)", () => {
  it("Usuario acepta un objeto con los campos exactos de la tabla usuarios", () => {
    const usuario: Usuario = {
      id: "u1",
      nombre: "Leonel Cortés",
      correo: "leo@example.com",
      fecha_creacion: "2026-07-07T00:00:00Z",
      zona_horaria: "America/Costa_Rica",
    };
    expect(usuario.correo).toBe("leo@example.com");
  });

  it("Curso acepta un objeto con los campos exactos de la tabla cursos", () => {
    const curso: Curso = {
      id: "c1",
      usuario_id: "u1",
      nombre: "Cálculo II",
      color: "#3B82F6",
      dificultad: 5,
      profesor: "Dr. García",
      creditos: 4,
    };
    expect(curso.dificultad).toBe(5);
  });

  it("Tarea acepta un objeto con los campos exactos de la tabla tareas", () => {
    const tarea: Tarea = {
      id: "t1",
      curso_id: "c1",
      titulo: "Examen parcial",
      tipo: "examen",
      fecha_limite: "2025-07-10",
      duracion_estimada_h: 3,
      prioridad: 5,
      estado: "pendiente",
    };
    expect(tarea.tipo).toBe("examen");
  });

  it("Disponibilidad acepta un objeto con los campos exactos de la tabla disponibilidad", () => {
    const disponibilidad: Disponibilidad = {
      id: "d1",
      usuario_id: "u1",
      dia_semana: "lunes",
      hora_inicio: "18:00",
      hora_fin: "21:00",
    };
    expect(disponibilidad.dia_semana).toBe("lunes");
  });

  it("BloqueHorario acepta un objeto con los campos exactos de la tabla bloques_horario", () => {
    const bloque: BloqueHorario = {
      id: "b1",
      tarea_id: "t1",
      fecha: "2025-07-07",
      hora_inicio: "18:00",
      hora_fin: "21:00",
      generado_por_ia: true,
      justificacion: "Examen con fecha límite más próxima",
    };
    expect(bloque.generado_por_ia).toBe(true);
  });
});
