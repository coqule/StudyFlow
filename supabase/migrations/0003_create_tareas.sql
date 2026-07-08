-- Migración: crear tabla tareas
-- Cubre: R3 (specs/base_datos/requirements.md)
-- curso_id: FK -> cursos.id (1:N cursos -> tareas)

create table if not exists public.tareas (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos (id) on delete cascade,
  titulo text not null,
  tipo text not null check (tipo in ('tarea', 'examen', 'proyecto')),
  fecha_limite date,
  duracion_estimada_h numeric,
  prioridad int2,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_progreso', 'completada'))
);

create index if not exists tareas_curso_id_idx on public.tareas (curso_id);

comment on table public.tareas is 'Tareas, exámenes y proyectos vinculados a un curso.';
