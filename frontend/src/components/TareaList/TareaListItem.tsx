import { useState } from "react";
import type { FormEvent } from "react";

import type { Curso, NuevaTarea, Tarea } from "../../types";
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO, ERROR, ETIQUETA } from "../ui/clases";

const TIPOS = ["tarea", "examen", "proyecto"] as const;
const PRIORIDADES = [1, 2, 3, 4, 5];

interface TareaListItemProps {
  tarea: Tarea;
  cursos: Curso[];
  actualizar: (id: string, cambios: Partial<NuevaTarea>) => Promise<boolean>;
  eliminar: (id: string) => Promise<boolean>;
  error: string | null;
}

function nombreCurso(cursos: Curso[], curso_id: string): string {
  return cursos.find((c) => c.id === curso_id)?.nombre ?? curso_id;
}

// La fila hereda el color del curso al que pertenece la tarea (la barra de
// acento a la izquierda), igual que los eventos del calendario en el diseño.
// Si el curso ya no existe, cae a `outline` en vez de dejar la barra vacía.
function colorCurso(cursos: Curso[], curso_id: string): string {
  return cursos.find((c) => c.id === curso_id)?.color ?? "var(--color-outline)";
}

const CHIP = "rounded-full bg-surface-container px-xs py-0.5 text-body-sm text-on-surface-variant";

// Fila de una tarea dentro de `TareaList`. Alterna entre vista normal y modo
// edición inline en la propia fila (specs/tareas_crud/design.md §5, mismo
// patrón que `CursoListItem`). `actualizar`/`eliminar` llegan por props
// desde la única instancia de `useTareas()` que vive en `AppShell` —
// TareaListItem NUNCA llama useTareas() por su cuenta, o quedaría
// desconectado de la lista visible.
export function TareaListItem({ tarea, cursos, actualizar, eliminar, error }: TareaListItemProps) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [cursoId, setCursoId] = useState(tarea.curso_id);
  const [titulo, setTitulo] = useState(tarea.titulo);
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>(tarea.tipo);
  const [fechaLimite, setFechaLimite] = useState(tarea.fecha_limite);
  const [duracionEstimadaH, setDuracionEstimadaH] = useState(tarea.duracion_estimada_h);
  const [prioridad, setPrioridad] = useState(tarea.prioridad);
  const [errorFila, setErrorFila] = useState<string | null>(null);

  const iniciarEdicion = () => {
    setCursoId(tarea.curso_id);
    setTitulo(tarea.titulo);
    setTipo(tarea.tipo);
    setFechaLimite(tarea.fecha_limite);
    setDuracionEstimadaH(tarea.duracion_estimada_h);
    setPrioridad(tarea.prioridad);
    setErrorFila(null);
    setModoEdicion(true);
  };

  // "Cancelar" descarta los cambios locales no guardados y vuelve a la vista
  // normal sin invocar actualizar() (R25).
  const cancelarEdicion = () => {
    setCursoId(tarea.curso_id);
    setTitulo(tarea.titulo);
    setTipo(tarea.tipo);
    setFechaLimite(tarea.fecha_limite);
    setDuracionEstimadaH(tarea.duracion_estimada_h);
    setPrioridad(tarea.prioridad);
    setErrorFila(null);
    setModoEdicion(false);
  };

  const handleGuardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!titulo.trim()) {
      setErrorFila("El título de la tarea es obligatorio"); // R21
      return;
    }

    const hoy = new Date().toISOString().slice(0, 10);
    if (!fechaLimite || fechaLimite <= hoy) {
      setErrorFila("La fecha límite debe ser una fecha futura"); // R22
      return;
    }

    setErrorFila(null);
    const ok = await actualizar(tarea.id, {
      curso_id: cursoId,
      titulo: titulo.trim(),
      tipo,
      fecha_limite: fechaLimite,
      duracion_estimada_h: duracionEstimadaH,
      prioridad,
    });

    if (ok) {
      setModoEdicion(false); // R23
    } else {
      setErrorFila(error); // R24 — permanece en modo edición para reintentar
    }
  };

  const handleEliminar = async () => {
    const confirmado = window.confirm(`¿Eliminar la tarea "${tarea.titulo}"?`); // R27
    if (!confirmado) return; // R28

    setErrorFila(null);
    const ok = await eliminar(tarea.id); // R29
    if (!ok) {
      setErrorFila(error); // R31 — la tarea permanece en la lista (la quita `useTareas` solo si tuvo éxito)
    }
  };

  if (modoEdicion) {
    return (
      <li className="rounded border border-outline-variant bg-surface-container-low p-sm">
        <form onSubmit={(event) => void handleGuardar(event)} className="flex flex-col gap-sm">
          <div className="flex flex-col gap-xs">
            <label htmlFor={`tarea-${tarea.id}-curso`} className={ETIQUETA}>
              Curso
            </label>
            <select
              id={`tarea-${tarea.id}-curso`}
              value={cursoId}
              onChange={(event) => setCursoId(event.target.value)}
              className={CAMPO}
            >
              {cursos.map((curso) => (
                <option key={curso.id} value={curso.id}>
                  {curso.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-xs">
            <label htmlFor={`tarea-${tarea.id}-titulo`} className={ETIQUETA}>
              Título
            </label>
            <input
              id={`tarea-${tarea.id}-titulo`}
              type="text"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              className={CAMPO}
            />
          </div>
          <div className="flex flex-col gap-sm sm:flex-row">
            <div className="flex flex-1 flex-col gap-xs">
              <label htmlFor={`tarea-${tarea.id}-tipo`} className={ETIQUETA}>
                Tipo
              </label>
              <select
                id={`tarea-${tarea.id}-tipo`}
                value={tipo}
                onChange={(event) => setTipo(event.target.value as (typeof TIPOS)[number])}
                className={`${CAMPO} capitalize`}
              >
                {TIPOS.map((valor) => (
                  <option key={valor} value={valor} className="capitalize">
                    {valor}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-xs">
              <label htmlFor={`tarea-${tarea.id}-prioridad`} className={ETIQUETA}>
                Prioridad
              </label>
              <select
                id={`tarea-${tarea.id}-prioridad`}
                value={prioridad}
                onChange={(event) => setPrioridad(Number(event.target.value))}
                className={CAMPO}
              >
                {PRIORIDADES.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-sm sm:flex-row">
            <div className="flex flex-1 flex-col gap-xs">
              <label htmlFor={`tarea-${tarea.id}-fecha-limite`} className={ETIQUETA}>
                Fecha límite
              </label>
              <input
                id={`tarea-${tarea.id}-fecha-limite`}
                type="date"
                value={fechaLimite}
                onChange={(event) => setFechaLimite(event.target.value)}
                className={CAMPO}
              />
            </div>
            <div className="flex flex-1 flex-col gap-xs">
              <label htmlFor={`tarea-${tarea.id}-duracion`} className={ETIQUETA}>
                Duración estimada (h)
              </label>
              <input
                id={`tarea-${tarea.id}-duracion`}
                type="number"
                value={duracionEstimadaH}
                onChange={(event) => setDuracionEstimadaH(Number(event.target.value))}
                className={CAMPO}
              />
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
      <span
        aria-hidden="true"
        className="h-6 w-1 shrink-0 rounded-sm"
        style={{ backgroundColor: colorCurso(cursos, tarea.curso_id) }}
      />
      <span className="min-w-0 flex-1 text-body-md text-on-surface">{tarea.titulo}</span>
      <span className={`${CHIP} capitalize`}>{nombreCurso(cursos, tarea.curso_id)}</span>
      <span className={`${CHIP} capitalize`}>{tarea.tipo}</span>
      <span className={CHIP}>{tarea.fecha_limite}</span>
      <span className={CHIP}>Prioridad {tarea.prioridad}</span>
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
