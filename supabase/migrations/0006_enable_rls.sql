-- Migración: habilitar Row Level Security en las 5 tablas + políticas
-- Cubre: R6, R7, R8 (specs/base_datos/requirements.md)
-- Políticas copiadas literalmente de docs/modelo-datos.md §Row Level Security

-- usuarios: un usuario solo ve/modifica su propia fila (id = auth.uid())
alter table public.usuarios enable row level security;

create policy "usuarios ven solo su propio registro"
on public.usuarios
for all
using (id = auth.uid());

-- cursos: un usuario solo ve/modifica sus propios cursos
alter table public.cursos enable row level security;

create policy "usuarios ven solo sus cursos"
on public.cursos
for all
using (usuario_id = auth.uid());

-- disponibilidad: un usuario solo ve/modifica su propia disponibilidad
alter table public.disponibilidad enable row level security;

create policy "usuarios ven solo su disponibilidad"
on public.disponibilidad
for all
using (usuario_id = auth.uid());

-- tareas: un usuario solo ve/modifica las tareas de sus propios cursos
alter table public.tareas enable row level security;

create policy "usuarios ven solo sus tareas"
on public.tareas
for all
using (
  curso_id in (
    select id from public.cursos where usuario_id = auth.uid()
  )
);

-- bloques_horario: cadena tarea_id -> curso_id -> usuario_id
alter table public.bloques_horario enable row level security;

create policy "usuarios ven solo sus bloques"
on public.bloques_horario
for all
using (
  tarea_id in (
    select t.id from public.tareas t
    join public.cursos c on t.curso_id = c.id
    where c.usuario_id = auth.uid()
  )
);
