-- Migración: crear tabla cursos
-- Cubre: R2 (specs/base_datos/requirements.md)
-- usuario_id: FK -> usuarios.id (1:N usuarios -> cursos)

create table if not exists public.cursos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  nombre text not null,
  color text,
  dificultad int2,
  profesor text,
  creditos int2
);

create index if not exists cursos_usuario_id_idx on public.cursos (usuario_id);

comment on table public.cursos is 'Cursos académicos registrados por el usuario.';
