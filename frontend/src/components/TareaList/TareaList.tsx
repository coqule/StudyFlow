import type { Curso, NuevaTarea, Tarea } from "../../types";
import { TareaListItem } from "./TareaListItem";

interface TareaListProps {
  tareas: Tarea[];
  cursos: Curso[];
  actualizar: (id: string, cambios: Partial<NuevaTarea>) => Promise<boolean>;
  eliminar: (id: string) => Promise<boolean>;
  error: string | null;
}

// Recibe `tareas`/`cursos` por props (specs/tareas_crud/design.md §5, viene
// de `useTareas().data`/`useCursos().data`) y los renderiza — cubre R16.
// Estado vacío simple si no hay tareas (mismo criterio que `CursoList`).
//
// `actualizar`/`eliminar`/`error` también llegan por props desde la misma
// instancia de `useTareas()` que provee `tareas` en `AppShell` — TareaList
// NUNCA llama useTareas() por su cuenta, se los pasa tal cual a cada
// `TareaListItem` (R18, R26).
export function TareaList({ tareas, cursos, actualizar, eliminar, error }: TareaListProps) {
  if (tareas.length === 0) {
    return <p className="text-body-sm text-on-surface-variant">Aún no tienes tareas.</p>;
  }

  const ordenados = [...tareas].sort((a, b) => a.prioridad - b.prioridad);

  return (
    <ul className="flex flex-col gap-xs">
      {ordenados.map((tarea) => (
        <TareaListItem
          key={tarea.id}
          tarea={tarea}
          cursos={cursos}
          actualizar={actualizar}
          eliminar={eliminar}
          error={error}
        />
      ))}
    </ul>
  );
}
