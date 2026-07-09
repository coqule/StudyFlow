-- Migración: auto-provisión de public.usuarios para cualquier alta en auth.users
-- Cubre: R13 (specs/auth/requirements.md), decisión en specs/auth/design.md §1.1
-- (addendum post-review 2026-07-08).
--
-- Motivo: el flujo real de la UI (frontend/src/context/AuthContext.tsx#register)
-- llama a supabase.auth.signUp() directamente y nunca inserta en `usuarios`.
-- Esa inserción solo vivía en backend/src/services/authService.js#registrar(),
-- que la UI no invoca. Como cursos.usuario_id es NOT NULL REFERENCES
-- public.usuarios(id), cualquier usuario real registrado por la UI rompería
-- cursos_crud (feature 4) con una violación de FK.
--
-- Este trigger cubre CUALQUIER consumidor de Supabase Auth (frontend directo,
-- authService.js del backend, futuros clientes) sin duplicar lógica
-- cliente por cliente — docs/architecture.md §6: "Supabase es la última
-- línea de defensa".

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, correo, nombre, zona_horaria)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    'America/Costa_Rica'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'Auto-provisiona la fila de public.usuarios cuando se crea un registro en '
  'auth.users, sin importar el origen (frontend signUp directo, '
  'authService.js del backend, u otro consumidor de Supabase Auth). '
  'Cubre R13 de specs/auth/requirements.md.';

-- Nota: esta función es un trigger function (returns trigger), no se puede
-- invocar directamente vía RPC/SELECT desde anon/authenticated — Postgres
-- exige contexto de trigger para ejecutarla. SECURITY DEFINER es necesario
-- porque el rol que inserta en auth.users (supabase_auth_admin) no tiene
-- permiso de escritura en public.usuarios.

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_auth_user();
