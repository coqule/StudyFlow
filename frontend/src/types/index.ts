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
  tarea_titulo?: string;
  curso_nombre?: string;
  curso_color?: string;
}
