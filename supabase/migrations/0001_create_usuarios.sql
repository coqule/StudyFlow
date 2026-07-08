-- Migración: crear tabla usuarios
-- Cubre: R1 (specs/base_datos/requirements.md)
-- id: uuid PK, generado por Supabase Auth (referencia auth.users.id)

create table if not exists public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  correo text unique,
  fecha_creacion timestamptz not null default now(),
  zona_horaria text
);

comment on table public.usuarios is 'Perfil de aplicación de cada usuario autenticado vía Supabase Auth.';
