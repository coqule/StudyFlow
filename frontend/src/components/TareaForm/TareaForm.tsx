import { useState } from "react";
import type { FormEvent } from "react";

import type { Curso, NuevaTarea } from "../../types";
import { BOTON_PRIMARIO, CAMPO, ERROR, ETIQUETA } from "../ui/clases";

const TIPOS = ["tarea", "examen", "proyecto"] as const;

interface TareaFormProps {
  crear: (datos: NuevaTarea) => Promise<void>;
  cursos: Curso[];
}

// `crear` y `cursos` llegan por props (specs/tareas_crud/design.md §5, mismo
// criterio que `CursoForm`) en vez de que TareaForm llame
// `useTareas()`/`useCursos()` por su cuenta: cada llamada a esos hooks crea
// una instancia de estado independiente y desconectaría el formulario de la
// lista visible que renderiza `TareaList` en `AppShell` (rompería R14).
//
// Campos: `curso_id` (select poblado con `cursos`), `titulo` (input texto),
// `tipo` (select con las 3 opciones fijas), `fecha_limite` (input date),
// `duracion_estimada_h` (input number, opcional), `prioridad` (slider 1-5).
// Solo `fecha_limite` requiere validación explícita en submit (R15) — el
// resto ya es válido por construcción del control.
//
// El diseño de Stitch dibuja solo título, fecha, duración y un slider de
// prioridad. Curso y Tipo NO aparecen en la maqueta, pero el modelo los
// exige (una tarea sin curso no tiene a qué colgarse), así que se conservan
// con el mismo estilo de campo. La prioridad usa el slider del diseño más el
// valor a la vista: en una escala 1-5 la posición del pulgar sola no deja
// distinguir 3 de 4.
export function TareaForm({ crear, cursos }: TareaFormProps) {
  const [cursoId, setCursoId] = useState(cursos[0]?.id ?? "");
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("tarea");
  const [fechaLimite, setFechaLimite] = useState("");
  const [duracionEstimadaH, setDuracionEstimadaH] = useState(1);
  const [prioridad, setPrioridad] = useState(3);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // El primer curso deja de existir si se elimina: se recae al primero
  // disponible para no enviar un curso_id fantasma.
  const cursoSeleccionado = cursos.some((c) => c.id === cursoId) ? cursoId : (cursos[0]?.id ?? "");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const hoy = new Date().toISOString().slice(0, 10);
    if (!fechaLimite || fechaLimite <= hoy) {
      setErrorLocal("La fecha límite debe ser una fecha futura");
      return;
    }

    setErrorLocal(null);
    await crear({
      curso_id: cursoSeleccionado,
      titulo: titulo.trim(),
      tipo,
      fecha_limite: fechaLimite,
      duracion_estimada_h: duracionEstimadaH,
      prioridad,
    });
    setTitulo("");
    setTipo("tarea");
    setFechaLimite("");
    setDuracionEstimadaH(1);
    setPrioridad(3);
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-sm">
      <div className="flex flex-col gap-xs">
        <label htmlFor="tarea-titulo" className={ETIQUETA}>
          Título de la tarea
        </label>
        <input
          id="tarea-titulo"
          type="text"
          placeholder="Ej. Ensayo final"
          value={titulo}
          onChange={(event) => setTitulo(event.target.value)}
          className={CAMPO}
        />
      </div>

      <div className="flex flex-col gap-sm sm:flex-row">
        <div className="flex flex-1 flex-col gap-xs">
          <label htmlFor="tarea-curso" className={ETIQUETA}>
            Curso
          </label>
          <select
            id="tarea-curso"
            value={cursoSeleccionado}
            onChange={(event) => setCursoId(event.target.value)}
            className={CAMPO}
          >
            {cursos.length === 0 && <option value="">Crea un curso primero</option>}
            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-xs sm:w-1/3">
          <label htmlFor="tarea-tipo" className={ETIQUETA}>
            Tipo
          </label>
          <select
            id="tarea-tipo"
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
      </div>

      <div className="flex flex-col gap-sm sm:flex-row">
        <div className="flex flex-1 flex-col gap-xs">
          <label htmlFor="tarea-fecha-limite" className={ETIQUETA}>
            Fecha límite
          </label>
          <input
            id="tarea-fecha-limite"
            type="date"
            value={fechaLimite}
            onChange={(event) => setFechaLimite(event.target.value)}
            className={CAMPO}
          />
        </div>
        <div className="flex flex-col gap-xs sm:w-1/3">
          <label htmlFor="tarea-duracion" className={ETIQUETA}>
            Duración (h)
          </label>
          <input
            id="tarea-duracion"
            type="number"
            min="0.5"
            step="0.5"
            placeholder="0"
            value={duracionEstimadaH}
            onChange={(event) => setDuracionEstimadaH(Number(event.target.value))}
            className={CAMPO}
          />
        </div>
      </div>

      <div className="flex flex-col gap-xs pt-xs">
        <label htmlFor="tarea-prioridad" className={ETIQUETA}>
          Prioridad: <span className="text-on-surface">{prioridad}</span>
        </label>
        <input
          id="tarea-prioridad"
          type="range"
          min={1}
          max={5}
          step={1}
          value={prioridad}
          onChange={(event) => setPrioridad(Number(event.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-container-high accent-primary"
        />
      </div>

      {errorLocal && (
        <p role="alert" className={ERROR}>
          {errorLocal}
        </p>
      )}
      <button type="submit" className={`${BOTON_PRIMARIO} self-start`}>
        Guardar
      </button>
    </form>
  );
}
