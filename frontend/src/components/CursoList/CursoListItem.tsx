import { useState } from "react";
import type { FormEvent } from "react";

import type { Curso, NuevoCurso } from "../../types";

const DIFICULTADES = [1, 2, 3, 4, 5];

interface CursoListItemProps {
  curso: Curso;
  actualizar: (id: string, cambios: Partial<NuevoCurso>) => Promise<boolean>;
  eliminar: (id: string) => Promise<boolean>;
  error: string | null;
}

// Fila de un curso dentro de `CursoList`. Alterna entre vista normal y modo
// edición inline en la propia fila (specs/cursos_crud/design.md §7.2 —
// alternativa de modal descartada por no haber librería de overlay en el
// proyecto). `actualizar`/`eliminar` llegan por props desde la única
// instancia de `useCursos()` que vive en `AppShell` (design.md §7.1):
// CursoListItem NUNCA llama useCursos() por su cuenta, o quedaría
// desconectado de la lista visible.
export function CursoListItem({ curso, actualizar, eliminar, error }: CursoListItemProps) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [nombre, setNombre] = useState(curso.nombre);
  const [color, setColor] = useState(curso.color);
  const [dificultad, setDificultad] = useState(curso.dificultad);
  const [errorFila, setErrorFila] = useState<string | null>(null);

  const iniciarEdicion = () => {
    setNombre(curso.nombre);
    setColor(curso.color);
    setDificultad(curso.dificultad);
    setErrorFila(null);
    setModoEdicion(true);
  };

  // "Cancelar" descarta los cambios locales no guardados y vuelve a la vista
  // normal sin invocar actualizar() (R23).
  const cancelarEdicion = () => {
    setNombre(curso.nombre);
    setColor(curso.color);
    setDificultad(curso.dificultad);
    setErrorFila(null);
    setModoEdicion(false);
  };

  const handleGuardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nombre.trim()) {
      setErrorFila("El nombre del curso es obligatorio");
      return;
    }

    setErrorFila(null);
    const ok = await actualizar(curso.id, {
      nombre: nombre.trim(),
      color,
      dificultad,
    });

    if (ok) {
      setModoEdicion(false); // R21
    } else {
      setErrorFila(error); // R22 — permanece en modo edición para reintentar
    }
  };

  const handleEliminar = async () => {
    const confirmado = window.confirm(`¿Eliminar el curso "${curso.nombre}"?`);
    if (!confirmado) return; // R26

    setErrorFila(null);
    const ok = await eliminar(curso.id); // R27
    if (!ok) {
      setErrorFila(error); // R29 — el curso permanece en la lista (la quita `useCursos` solo si tuvo éxito)
    }
  };

  if (modoEdicion) {
    return (
      <li className="flex flex-col gap-2 rounded border p-2">
        <form onSubmit={(event) => void handleGuardar(event)} className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`curso-${curso.id}-nombre`}>Nombre</label>
            <input
              id={`curso-${curso.id}-nombre`}
              type="text"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`curso-${curso.id}-color`}>Color</label>
            <input
              id={`curso-${curso.id}-color`}
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`curso-${curso.id}-dificultad`}>Dificultad</label>
            <select
              id={`curso-${curso.id}-dificultad`}
              value={dificultad}
              onChange={(event) => setDificultad(Number(event.target.value))}
            >
              {DIFICULTADES.map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </div>
          {errorFila && <p role="alert">{errorFila}</p>}
          <div className="flex gap-2">
            <button type="submit">Guardar</button>
            <button type="button" onClick={cancelarEdicion}>
              Cancelar
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded border p-2">
      <span
        aria-hidden="true"
        className="h-3 w-3 flex-shrink-0 rounded-full"
        style={{ backgroundColor: curso.color }}
      />
      <span className="flex-1">{curso.nombre}</span>
      <span>Dificultad {curso.dificultad}</span>
      <div className="flex gap-2">
        <button type="button" onClick={iniciarEdicion}>
          Editar
        </button>
        <button type="button" onClick={() => void handleEliminar()}>
          Eliminar
        </button>
      </div>
      {errorFila && <p role="alert">{errorFila}</p>}
    </li>
  );
}
