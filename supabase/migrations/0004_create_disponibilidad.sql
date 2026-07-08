-- Migración: crear tabla disponibilidad
-- Cubre: R4 (specs/base_datos/requirements.md)
-- usuario_id: FK -> usuarios.id
-- Nota: la validación de solapamiento de horarios es responsabilidad del
-- backend (ver docs/modelo-datos.md), no de esta migración.

create table if not exists public.disponibilidad (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  dia_semana text not null check (
    dia_semana in (
      'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'
    )
  ),
  hora_inicio time not null,
  hora_fin time not null
);

create index if not exists disponibilidad_usuario_id_idx on public.disponibilidad (usuario_id);

comment on table public.disponibilidad is 'Bloques de tiempo disponibles declarados por el usuario, por día de la semana.';
