import { useState } from "react";
import type { FormEvent } from "react";

import type { Disponibilidad, NuevaDisponibilidad } from "../../types";

const DIAS: Disponibilidad["dia_semana"][] = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

// Postgres `time` puede devolver `HH:MM:SS`; se normaliza a `HH:MM` para
// mostrarlo y para prellenar `<input type="time">` de forma consistente.
function normalizarHora(hora: string): string {
  return hora.slice(0, 5);
}

interface BloqueItemProps {
  bloque: Disponibilidad;
  actualizar: (id: string, cambios: Partial<NuevaDisponibilidad>) => Promise<boolean>;
  eliminar: (id: string) => Promise<boolean>;
  error: string | null;
}

// Bloque dentro de `DisponibilidadGrid`. Alterna entre vista normal y modo
// edición inline en el propio bloque (design.md §6 — alternativa de modal
// descartada por no haber librería de overlay). `actualizar`/`eliminar`
// llegan por props desde la única instancia de `useDisponibilidad()` en
// `AppShell`: BloqueItem NUNCA llama al hook por su cuenta, o quedaría
// desconectado de la grilla visible.
export function BloqueItem({ bloque, actualizar, eliminar, error }: BloqueItemProps) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [diaSemana, setDiaSemana] = useState(bloque.dia_semana);
  const [horaInicio, setHoraInicio] = useState(normalizarHora(bloque.hora_inicio));
  const [horaFin, setHoraFin] = useState(normalizarHora(bloque.hora_fin));
  const [errorFila, setErrorFila] = useState<string | null>(null);

  // "Editar" prellena los campos con los valores actuales del bloque (R22).
  const iniciarEdicion = () => {
    setDiaSemana(bloque.dia_semana);
    setHoraInicio(normalizarHora(bloque.hora_inicio));
    setHoraFin(normalizarHora(bloque.hora_fin));
    setErrorFila(null);
    setModoEdicion(true);
  };

  // "Cancelar" descarta los cambios locales no guardados y vuelve a la vista
  // normal sin invocar actualizar() (R27).
  const cancelarEdicion = () => {
    setDiaSemana(bloque.dia_semana);
    setHoraInicio(normalizarHora(bloque.hora_inicio));
    setHoraFin(normalizarHora(bloque.hora_fin));
    setErrorFila(null);
    setModoEdicion(false);
  };

  const handleGuardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!(horaFin > horaInicio)) {
      setErrorFila("La hora de fin debe ser mayor que la hora de inicio"); // R24
      return;
    }

    setErrorFila(null);
    const ok = await actualizar(bloque.id, {
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
    });

    if (ok) {
      setModoEdicion(false); // R25
    } else {
      setErrorFila(error); // R26 — permanece en modo edición para reintentar
    }
  };

  const handleEliminar = async () => {
    const confirmado = window.confirm(
      `¿Eliminar el bloque de ${bloque.dia_semana} ${normalizarHora(
        bloque.hora_inicio
      )}–${normalizarHora(bloque.hora_fin)}?`
    );
    if (!confirmado) return; // R30

    setErrorFila(null);
    const ok = await eliminar(bloque.id); // R31
    if (!ok) {
      // R33 — el bloque permanece en la grilla (useDisponibilidad solo lo
      // quita si tuvo éxito).
      setErrorFila(error);
    }
  };

  if (modoEdicion) {
    return (
      <li className="flex flex-col gap-2 rounded border p-2">
        <form onSubmit={(event) => void handleGuardar(event)} className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`bloque-${bloque.id}-dia`}>Día</label>
            <select
              id={`bloque-${bloque.id}-dia`}
              value={diaSemana}
              onChange={(event) =>
                setDiaSemana(event.target.value as Disponibilidad["dia_semana"])
              }
            >
              {DIAS.map((dia) => (
                <option key={dia} value={dia}>
                  {dia}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`bloque-${bloque.id}-inicio`}>Hora inicio</label>
            <input
              id={`bloque-${bloque.id}-inicio`}
              type="time"
              value={horaInicio}
              onChange={(event) => setHoraInicio(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`bloque-${bloque.id}-fin`}>Hora fin</label>
            <input
              id={`bloque-${bloque.id}-fin`}
              type="time"
              value={horaFin}
              onChange={(event) => setHoraFin(event.target.value)}
            />
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
      <span className="flex-1">
        {normalizarHora(bloque.hora_inicio)}–{normalizarHora(bloque.hora_fin)}
      </span>
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
