import type { Curso, NuevoCurso } from "../../types";
import { CursoListItem } from "./CursoListItem";

interface CursoListProps {
  cursos: Curso[];
  actualizar: (id: string, cambios: Partial<NuevoCurso>) => Promise<boolean>;
  eliminar: (id: string) => Promise<boolean>;
  error: string | null;
}

// Recibe `cursos` por props (specs/cursos_crud/design.md §4, viene de
// `useCursos().data`) y los renderiza — cubre R15. Estado vacío simple si
// no hay cursos (mismo criterio que `horarios_vista` R5).
//
// `actualizar`/`eliminar`/`error` también llegan por props (design.md §7.1,
// §7.4) desde la misma instancia de `useCursos()` que provee `cursos` en
// `AppShell` — CursoList NUNCA llama useCursos() por su cuenta, se los pasa
// tal cual a cada `CursoListItem` (R17, R24).
export function CursoList({ cursos, actualizar, eliminar, error }: CursoListProps) {
  if (cursos.length === 0) {
    return <p>Aún no tienes cursos.</p>;
  }

  return (
    <ul className="flex w-full max-w-sm flex-col gap-2">
      {cursos.map((curso) => (
        <CursoListItem
          key={curso.id}
          curso={curso}
          actualizar={actualizar}
          eliminar={eliminar}
          error={error}
        />
      ))}
    </ul>
  );
}
