import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import type { Disponibilidad, NuevaDisponibilidad } from "../../types";
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO, ERROR, ETIQUETA } from "../ui/clases";
import { SelectorHora } from "../ui/SelectorHora";
import { normalizarHora } from "./tiempo";

const DIAS: Disponibilidad["dia_semana"][] = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

interface BloqueItemProps {
  bloque: Disponibilidad;
  // Posición vertical dentro de la pista de tiempo (top/height en %). Opcional
  // para que el componente se pueda montar suelto en pruebas sin una ventana.
  posicion?: { top: string; height: string };
  actualizar: (id: string, cambios: Partial<NuevaDisponibilidad>) => Promise<boolean>;
  eliminar: (id: string) => Promise<boolean>;
  error: string | null;
}

// Bloque dentro de `DisponibilidadGrid`, renderizado como barra posicionada
// por su hora. Alterna entre vista normal (barra) y edición inline (design.md
// §6 — modal descartado por no haber librería de overlay). En edición el
// formulario cubre la columna, así no depende del alto de la barra, que puede
// ser muy fino. `actualizar`/`eliminar` llegan por props desde la única
// instancia de `useDisponibilidad()` en `AppShell`: BloqueItem NUNCA llama al
// hook por su cuenta, o quedaría desconectado de la grilla visible.
export function BloqueItem({ bloque, posicion, actualizar, eliminar, error }: BloqueItemProps) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [diaSemana, setDiaSemana] = useState(bloque.dia_semana);
  const [horaInicio, setHoraInicio] = useState(normalizarHora(bloque.hora_inicio));
  const [horaFin, setHoraFin] = useState(normalizarHora(bloque.hora_fin));
  const [errorFila, setErrorFila] = useState<string | null>(null);

  const rango = `${normalizarHora(bloque.hora_inicio)}–${normalizarHora(bloque.hora_fin)}`;
  const estiloPosicion: CSSProperties = posicion
    ? { position: "absolute", top: posicion.top, height: posicion.height, left: 0, right: 0 }
    : {};

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
      <div
        className="absolute inset-x-0 top-0 z-10 rounded border border-outline-variant bg-surface-container-lowest p-sm shadow-sm"
      >
        <form onSubmit={(event) => void handleGuardar(event)} className="flex flex-col gap-xs">
          <div className="flex max-w-[220px] flex-col gap-xs">
            <label htmlFor={`bloque-${bloque.id}-dia`} className={ETIQUETA}>
              Día
            </label>
            <select
              id={`bloque-${bloque.id}-dia`}
              value={diaSemana}
              onChange={(event) =>
                setDiaSemana(event.target.value as Disponibilidad["dia_semana"])
              }
              className={`${CAMPO} capitalize`}
            >
              {DIAS.map((dia) => (
                <option key={dia} value={dia} className="capitalize">
                  {dia}
                </option>
              ))}
            </select>
          </div>
          <SelectorHora etiqueta="Hora inicio" value={horaInicio} onChange={setHoraInicio} />
          <SelectorHora etiqueta="Hora fin" value={horaFin} onChange={setHoraFin} />
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
      </div>
    );
  }

  return (
    <div
      style={estiloPosicion}
      className="group flex min-h-[24px] flex-col justify-between overflow-hidden rounded-base bg-primary px-xs py-0.5 text-on-primary shadow-sm transition-opacity hover:opacity-100"
    >
      <span className="truncate text-label-md">{rango}</span>
      {/* Los controles se revelan al pasar el puntero o al enfocar con teclado.
          Están siempre en el DOM para que sean alcanzables sin depender del
          hover (accesibilidad). */}
      <div className="flex gap-xs opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={iniciarEdicion}
          className="rounded-sm bg-on-primary/20 px-xs text-label-md text-on-primary hover:bg-on-primary/30 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-on-primary"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => void handleEliminar()}
          className="rounded-sm bg-on-primary/20 px-xs text-label-md text-on-primary hover:bg-on-primary/30 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-on-primary"
        >
          Eliminar
        </button>
      </div>
      {errorFila && (
        <p role="alert" className="text-label-md text-on-primary">
          {errorFila}
        </p>
      )}
    </div>
  );
}
