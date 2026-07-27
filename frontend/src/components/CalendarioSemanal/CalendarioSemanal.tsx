import { useState } from "react";
import type { BloqueHorario } from "../../types";
import { VENTANA_DIA, marcasHorarias, posicionBloque } from "../DisponibilidadGrid/tiempo";
import { BloqueCalendario } from "./BloqueCalendario";
import { BloqueModal } from "./BloqueModal";
import { ERROR } from "../ui/clases";

// Los siete días en orden L–D, con su inicial para la cabecera compacta. El
// `valor` (sin tilde: "miercoles", "sabado") se usa como aria-label y como
// clave de agrupación de los bloques por día.
const DIAS = [
  { valor: "lunes", inicial: "L" },
  { valor: "martes", inicial: "M" },
  { valor: "miercoles", inicial: "M" },
  { valor: "jueves", inicial: "J" },
  { valor: "viernes", inicial: "V" },
  { valor: "sabado", inicial: "S" },
  { valor: "domingo", inicial: "D" },
] as const;

// Compartidas por la columna de etiquetas y cada columna de día: si difieren,
// las marcas de hora y los bloques dejan de coincidir. Mismo criterio que
// DisponibilidadGrid.
const ALTO_ENCABEZADO = "mb-xs text-center text-label-md";
const ALTO_PISTA = "relative min-h-[960px] flex-1";

// Deriva el día de la semana (índice L=0 … D=6) a partir de una fecha ISO
// `YYYY-MM-DD`. Se construye la fecha en horario LOCAL (`new Date(y, m-1, d)`)
// y no con `new Date("YYYY-MM-DD")`, que la interpretaría como UTC y podría
// correr el día según la zona horaria del navegador.
function indiceDiaSemana(fecha: string): number {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const diaJs = new Date(anio, mes - 1, dia).getDay(); // 0=domingo … 6=sábado
  return (diaJs + 6) % 7; // desplaza a L=0 … D=6
}

interface CalendarioSemanalProps {
  bloques: BloqueHorario[];
  error?: string | null;
}

// Vista del calendario semanal (feature 14): 7 columnas —una por día— y bajo
// cada día los `BloqueCalendario` posicionados por su hora dentro de una
// ventana común (R8, R9). La vista funciona aunque no haya bloques: la grilla
// se dibuja igual con las franjas horarias y cada día muestra "Sin bloques"
// (R11). Es presentacional: recibe `bloques` ya cargados por `useHorarios` en
// la página; nunca llama al hook por su cuenta.
export function CalendarioSemanal({ bloques, error }: CalendarioSemanalProps) {
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<BloqueHorario | null>(null);
  const marcas = marcasHorarias(VENTANA_DIA);

  return (
    <div className="flex flex-col gap-sm">
      <BloqueModal
        bloque={bloqueSeleccionado}
        abierto={bloqueSeleccionado !== null}
        onCerrar={() => setBloqueSeleccionado(null)}
      />

      {error && (
        <p role="alert" className={ERROR}>
          {error}
        </p>
      )}

      <div className="flex w-full gap-xs">
        {/* Eje horario a la izquierda (mismo patrón que DisponibilidadGrid): el
            <h3> invisible clona la altura del encabezado de cada día para que
            las marcas de hora queden alineadas con los bloques. */}
        <div className="flex w-10 shrink-0 flex-col" aria-hidden="true">
          <h3 className={`invisible ${ALTO_ENCABEZADO}`}>0</h3>
          <div className={ALTO_PISTA}>
            {marcas.map(({ hora, top }) => (
              <span
                key={hora}
                className="absolute right-0 -translate-y-1/2 text-label-md text-on-surface-variant"
                style={{ top: `${top}%` }}
              >
                {String(hora).padStart(2, "0")}:00
              </span>
            ))}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-7 divide-x divide-outline-variant">
          {DIAS.map(({ valor, inicial }, indice) => {
            const bloquesDelDia = bloques.filter((b) => indiceDiaSemana(b.fecha) === indice);

            return (
              <section key={valor} className="flex flex-col" aria-label={valor}>
                <h3 className={`${ALTO_ENCABEZADO} capitalize text-on-surface-variant`}>
                  <span aria-hidden="true">{inicial}</span>
                  <span className="sr-only">{valor}</span>
                </h3>

                <div className={ALTO_PISTA}>
                  {marcas.map(({ hora, top }) => (
                    <span
                      key={hora}
                      aria-hidden="true"
                      className="absolute inset-x-0 border-t border-surface-container-high"
                      style={{ top: `${top}%` }}
                    />
                  ))}

                  {bloquesDelDia.length === 0 ? (
                    <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-body-sm text-on-surface-variant/70">
                      Sin bloques
                    </p>
                  ) : (
                    bloquesDelDia.map((bloque) => (
                      <BloqueCalendario
                        key={bloque.id}
                        bloque={bloque}
                        posicion={posicionBloque(bloque, VENTANA_DIA)}
                        onClick={() => setBloqueSeleccionado(bloque)}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
