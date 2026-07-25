import { useState } from "react";
import type { FormEvent } from "react";

import type { Disponibilidad, NuevaDisponibilidad } from "../../types";
import { BOTON_PRIMARIO, CAMPO, ERROR, ETIQUETA } from "../ui/clases";
import { SelectorHora } from "../ui/SelectorHora";

// Los siete días en orden L–D — coinciden con el tipo
// `Disponibilidad.dia_semana` (sin tilde). El `<select>` garantiza un
// `dia_semana` válido por construcción (R16).
const DIAS: Disponibilidad["dia_semana"][] = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

interface DisponibilidadFormProps {
  crear: (datos: NuevaDisponibilidad) => Promise<void>;
  // `error` compartido del hook (mensaje de solapamiento 409, R19).
  error?: string | null;
}

// `crear` llega por props (design.md §6) en vez de que el formulario llame
// useDisponibilidad() por su cuenta: cada llamada al hook crea una instancia
// de estado independiente, así que un formulario "autoconectado" quedaría
// desconectado de la grilla que lee AppShell (rompería R17). Campos:
// `dia_semana` (select con 7 opciones — válido por construcción, R16),
// `hora_inicio`/`hora_fin` (`<input type="time">`). Solo el rango
// `hora_fin > hora_inicio` requiere validación explícita en submit (R18).
export function DisponibilidadForm({ crear, error }: DisponibilidadFormProps) {
  const [diaSemana, setDiaSemana] = useState<Disponibilidad["dia_semana"]>("lunes");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("10:00");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!(horaFin > horaInicio)) {
      setErrorLocal("La hora de fin debe ser mayor que la hora de inicio");
      return;
    }

    setErrorLocal(null);
    await crear({
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-sm">
      <div className="flex max-w-[220px] flex-col gap-xs">
        <label htmlFor="disp-dia" className={ETIQUETA}>
          Día
        </label>
        <select
          id="disp-dia"
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
      <div className="flex flex-col gap-sm sm:flex-row">
        <div className="flex-1">
          <SelectorHora etiqueta="Hora inicio" value={horaInicio} onChange={setHoraInicio} />
        </div>
        <div className="flex-1">
          <SelectorHora etiqueta="Hora fin" value={horaFin} onChange={setHoraFin} />
        </div>
      </div>
      {errorLocal && (
        <p role="alert" className={ERROR}>
          {errorLocal}
        </p>
      )}
      {error && (
        <p role="alert" className={ERROR}>
          {error}
        </p>
      )}
      <button type="submit" className={`${BOTON_PRIMARIO} self-start`}>
        Agregar bloque
      </button>
    </form>
  );
}
