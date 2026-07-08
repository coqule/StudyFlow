-- Migración: crear tabla bloques_horario
-- Cubre: R5 (specs/base_datos/requirements.md)
-- tarea_id: FK -> tareas.id (1:N tareas -> bloques_horario)
-- Salida persistida de cada llamada a la IA (generación o ajuste).

create table if not exists public.bloques_horario (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references public.tareas (id) on delete cascade,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  generado_por_ia boolean not null default false,
  justificacion text
);

create index if not exists bloques_horario_tarea_id_idx on public.bloques_horario (tarea_id);

comment on table public.bloques_horario is 'Bloques de horario de estudio, generados por IA o movidos manualmente.';
