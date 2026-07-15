# Modelo de datos — StudyFlow

Cinco tablas en PostgreSQL (Supabase). Usar estos nombres de campo exactamente — el módulo IA los referencia por nombre.

## `usuarios`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | generado por Supabase Auth |
| nombre | text | |
| correo | text | único |
| fecha_creacion | timestamptz | default now() |
| zona_horaria | text | ej. 'America/Costa_Rica' |

Relación: 1:N con `cursos`.

## `cursos`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid FK → usuarios | |
| nombre | text | |
| color | text | hex ej. '#3B82F6' |
| dificultad | int2 | 1–5 |
| profesor | text | nullable |
| creditos | int2 | nullable |

Relación: 1:N con `tareas`.

## `tareas`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| curso_id | uuid FK → cursos | |
| titulo | text | |
| tipo | text | 'tarea' \| 'examen' \| 'proyecto' |
| fecha_limite | date | |
| duracion_estimada_h | numeric | en horas, ej. 2.5 |
| prioridad | int2 | 1–5, declarada por el usuario |
| estado | text | 'pendiente' \| 'en_progreso' \| 'completada' |

Relación: 1:N con `bloques_horario`.

## `disponibilidad`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid FK → usuarios | |
| dia_semana | text | 'lunes' \| 'martes' \| ... \| 'domingo' |
| hora_inicio | time | ej. '18:00' |
| hora_fin | time | ej. '21:00' |

Restricción: no pueden existir dos filas del mismo `usuario_id` y `dia_semana` cuyos rangos horarios se solapen. Validar en backend antes de insertar.

## `bloques_horario`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| tarea_id | uuid FK → tareas | |
| fecha | date | |
| hora_inicio | time | |
| hora_fin | time | |
| generado_por_ia | boolean | true = sugerido por Gemini, false = movido manualmente |
| justificacion | text | texto breve devuelto por Gemini explicando la decisión |

Esta tabla es la salida persistida de cada llamada a la IA. `generado_por_ia` y `justificacion` alimentan el historial de ajustes del panel de control.

## Row Level Security

Aplicar en todas las tablas. Política base para cada tabla:

```sql
-- Ejemplo para cursos (replicar en tareas, disponibilidad, bloques_horario)
CREATE POLICY "usuarios ven solo sus cursos"
ON cursos
FOR ALL
USING (usuario_id = auth.uid());
```

Para `bloques_horario`, la política debe verificar a través de la relación con `tareas` y `cursos`:

```sql
CREATE POLICY "usuarios ven solo sus bloques"
ON bloques_horario
FOR ALL
USING (
  tarea_id IN (
    SELECT t.id FROM tareas t
    JOIN cursos c ON t.curso_id = c.id
    WHERE c.usuario_id = auth.uid()
  )
);
```
