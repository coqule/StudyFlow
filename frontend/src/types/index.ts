// Interfaces de dominio — mapeo 1:1 con las 5 tablas de docs/modelo-datos.md.
// Tipos Postgres → TS: uuid -> string, timestamptz/date/time -> string,
// int2/numeric -> number, boolean -> boolean, campos nullable -> opcionales (?).

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  fecha_creacion: string;
  zona_horaria: string;
}

export interface Curso {
  id: string;
  usuario_id: string;
  nombre: string;
  color: string;
  dificultad: number; // 1-5
  profesor?: string;
  creditos?: number;
}

// Payload para crear/actualizar un curso (specs/cursos_crud/design.md §4):
// `id` y `usuario_id` nunca los envía el cliente — `id` lo genera la BD,
// `usuario_id` lo obtiene el backend del JWT (nunca del body, R3).
export type NuevoCurso = Omit<Curso, "id" | "usuario_id">;

export interface Tarea {
  id: string;
  curso_id: string;
  titulo: string;
  tipo: "tarea" | "examen" | "proyecto";
  fecha_limite: string;
  duracion_estimada_h: number;
  prioridad: number; // 1-5
  estado: "pendiente" | "en_progreso" | "completada";
}

// Payload para crear/actualizar una tarea (specs/tareas_crud/design.md §5):
// `id` y `estado` nunca los envía el cliente — `id` lo genera la BD,
// `estado` lo fija el backend a "pendiente" en la creación (R3), mismo
// criterio que `usuario_id` se excluye de `NuevoCurso`.
export type NuevaTarea = Omit<Tarea, "id" | "estado">;

export interface Disponibilidad {
  id: string;
  usuario_id: string;
  dia_semana:
    | "lunes"
    | "martes"
    | "miercoles"
    | "jueves"
    | "viernes"
    | "sabado"
    | "domingo";
  hora_inicio: string;
  hora_fin: string;
}

// Payload para crear/actualizar un bloque de disponibilidad
// (specs/disponibilidad_crud/design.md §6): `id` lo genera la BD y
// `usuario_id` lo fija el backend desde el JWT (nunca del body), mismo
// criterio que `NuevoCurso`.
export type NuevaDisponibilidad = Omit<Disponibilidad, "id" | "usuario_id">;

export interface BloqueHorario {
  id: string;
  tarea_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  generado_por_ia: boolean;
  justificacion: string;
  // Campos extendidos del JOIN que devuelve GET /api/horarios
  // (ver docs/api-contratos.md) — no persistidos en la tabla bloques_horario.
  // `tarea_tipo` y `tarea_prioridad` son una extensión aditiva del contrato
  // documentado: la vista semanal (feature 14, R9) necesita mostrar el tipo de
  // tarea y un indicador de prioridad alta. Opcionales porque solo existen en
  // la respuesta enriquecida, no en la fila cruda de bloques_horario.
  tarea_titulo?: string;
  tarea_tipo?: Tarea["tipo"];
  tarea_prioridad?: number; // 1-5
  curso_nombre?: string;
  curso_color?: string;
}
