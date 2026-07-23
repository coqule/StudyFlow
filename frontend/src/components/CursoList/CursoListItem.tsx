import { useState } from "react";
import type { FormEvent } from "react";

import type { Curso, NuevoCurso } from "../../types";
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO, ERROR, ETIQUETA } from "../ui/clases";

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
//
// El modo edición conserva <select> y las etiquetas "Nombre"/"Dificultad":
// el diseño de Stitch no cubre la edición inline, así que aquí solo cambia
// la presentación.
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
      <li className="rounded border border-outline-variant bg-surface-container-low p-sm">
        <form onSubmit={(event) => void handleGuardar(event)} className="flex flex-col gap-sm">
          <div className="flex flex-col gap-xs">
            <label htmlFor={`curso-${curso.id}-nombre`} className={ETIQUETA}>
              Nombre
            </label>
            <input
              id={`curso-${curso.id}-nombre`}
              type="text"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className={CAMPO}
            />
          </div>
          <div className="flex gap-md">
            <div className="flex flex-col gap-xs">
              <label htmlFor={`curso-${curso.id}-color`} className={ETIQUETA}>
                Color
              </label>
              <input
                id={`curso-${curso.id}-color`}
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="size-8 cursor-pointer rounded border border-outline-variant bg-transparent p-0"
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label htmlFor={`curso-${curso.id}-dificultad`} className={ETIQUETA}>
                Dificultad
              </label>
              <select
                id={`curso-${curso.id}-dificultad`}
                value={dificultad}
                onChange={(event) => setDificultad(Number(event.target.value))}
                className={CAMPO}
              >
                {DIFICULTADES.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {errorFila && (
            <p role="alert" className={ERROR}>
              {errorFila}
            </p>
          )}
          <div className="flex gap-xs">
            <button type="submit" className={BOTON_PRIMARIO}>
              Guardar
            </button>
            <button type="button" onClick={cancelarEdicion} className={BOTON_SECUNDARIO}>
              Cancelar
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-sm rounded border border-outline-variant bg-surface-container-lowest p-sm">
      {/* Barra de acento a la izquierda en el color del curso: el sistema la
          define para los eventos del calendario y aquí identifica la fila. */}
      <span
        aria-hidden="true"
        className="h-6 w-1 shrink-0 rounded-sm"
        style={{ backgroundColor: curso.color }}
      />
      <span className="flex-1 text-body-md text-on-surface">{curso.nombre}</span>
      <span className="rounded-full bg-surface-container px-xs py-0.5 text-body-sm text-on-surface-variant">
        Dificultad {curso.dificultad}
      </span>
      <div className="flex gap-xs">
        <button type="button" onClick={iniciarEdicion} className={BOTON_SECUNDARIO}>
          Editar
        </button>
        <button type="button" onClick={() => void handleEliminar()} className={BOTON_SECUNDARIO}>
          Eliminar
        </button>
      </div>
      {errorFila && (
        <p role="alert" className={`${ERROR} w-full`}>
          {errorFila}
        </p>
      )}
    </li>
  );
}
