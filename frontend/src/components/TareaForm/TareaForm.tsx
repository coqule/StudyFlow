import { useState } from "react";
import type { FormEvent } from "react";

import type { Curso, NuevaTarea } from "../../types";

const TIPOS = ["tarea", "examen", "proyecto"] as const;
const PRIORIDADES = [1, 2, 3, 4, 5];

interface TareaFormProps {
  crear: (datos: NuevaTarea) => Promise<void>;
  cursos: Curso[];
}

// `crear` y `cursos` llegan por props (specs/tareas_crud/design.md §5, mismo
// criterio que `CursoForm`) en vez de que TareaForm llame
// `useTareas()`/`useCursos()` por su cuenta: cada llamada a esos hooks crea
// una instancia de estado independiente y desconectaría el formulario de la
// lista visible que renderiza `TareaList` en `AppShell` (rompería R14).
// Campos: `curso_id` (select poblado con `cursos`), `titulo` (input texto),
// `tipo` (select con las 3 opciones fijas), `fecha_limite` (input date),
// `duracion_estimada_h` (input number, opcional), `prioridad` (select 1-5).
// Solo `fecha_limite` requiere validación explícita en submit (R15) — el
// resto ya es válido por construcción del control.
export function TareaForm({ crear, cursos }: TareaFormProps) {
  const [cursoId, setCursoId] = useState(cursos[0]?.id ?? "");
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("tarea");
  const [fechaLimite, setFechaLimite] = useState("");
  const [duracionEstimadaH, setDuracionEstimadaH] = useState(1);
  const [prioridad, setPrioridad] = useState(1);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const hoy = new Date().toISOString().slice(0, 10);
    if (!fechaLimite || fechaLimite <= hoy) {
      setErrorLocal("La fecha límite debe ser una fecha futura");
      return;
    }

    setErrorLocal(null);
    await crear({
      curso_id: cursoId,
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
    setPrioridad(1);
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="tarea-curso">Curso</label>
        <select
          id="tarea-curso"
          value={cursoId}
          onChange={(event) => setCursoId(event.target.value)}
        >
          {cursos.map((curso) => (
            <option key={curso.id} value={curso.id}>
              {curso.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="tarea-titulo">Título</label>
        <input
          id="tarea-titulo"
          type="text"
          value={titulo}
          onChange={(event) => setTitulo(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="tarea-tipo">Tipo</label>
        <select
          id="tarea-tipo"
          value={tipo}
          onChange={(event) => setTipo(event.target.value as (typeof TIPOS)[number])}
        >
          {TIPOS.map((valor) => (
            <option key={valor} value={valor}>
              {valor}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="tarea-fecha-limite">Fecha límite</label>
        <input
          id="tarea-fecha-limite"
          type="date"
          value={fechaLimite}
          onChange={(event) => setFechaLimite(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="tarea-duracion">Duración estimada (h)</label>
        <input
          id="tarea-duracion"
          type="number"
          value={duracionEstimadaH}
          onChange={(event) => setDuracionEstimadaH(Number(event.target.value))}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="tarea-prioridad">Prioridad</label>
        <select
          id="tarea-prioridad"
          value={prioridad}
          onChange={(event) => setPrioridad(Number(event.target.value))}
        >
          {PRIORIDADES.map((valor) => (
            <option key={valor} value={valor}>
              {valor}
            </option>
          ))}
        </select>
      </div>
      {errorLocal && <p role="alert">{errorLocal}</p>}
      <button type="submit">Guardar</button>
    </form>
  );
}
