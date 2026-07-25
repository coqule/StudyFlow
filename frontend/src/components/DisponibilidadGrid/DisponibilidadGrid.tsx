import type { Disponibilidad, NuevaDisponibilidad } from "../../types";
import { BloqueItem } from "./BloqueItem";
import { VENTANA_DIA, marcasHorarias, posicionBloque } from "./tiempo";

// Los siete días en orden L–D (R14), con su inicial para la cabecera compacta.
const DIAS: { valor: Disponibilidad["dia_semana"]; inicial: string }[] = [
  { valor: "lunes", inicial: "L" },
  { valor: "martes", inicial: "M" },
  { valor: "miercoles", inicial: "M" },
  { valor: "jueves", inicial: "J" },
  { valor: "viernes", inicial: "V" },
  { valor: "sabado", inicial: "S" },
  { valor: "domingo", inicial: "D" },
];

// Compartidas por la columna de etiquetas y cada columna de día: si difieren,
// las marcas de hora y las barras dejan de coincidir (ver comentarios abajo).
const ALTO_ENCABEZADO = "mb-xs text-center text-label-md";
const ALTO_PISTA = "relative min-h-[960px] flex-1";

interface DisponibilidadGridProps {
  bloques: Disponibilidad[];
  actualizar: (id: string, cambios: Partial<NuevaDisponibilidad>) => Promise<boolean>;
  eliminar: (id: string) => Promise<boolean>;
  error: string | null;
}

// Grilla semanal como eje de tiempo (diseño «Registro Unificado» de Stitch):
// 7 columnas —una por día, R14— y bajo cada día los `BloqueItem` posicionados
// por su hora dentro de una ventana horaria común (R15). El diseño dibuja las
// barras como decorativas; aquí cada una conserva su horario y sus controles
// de editar/eliminar, para no perder funcionalidad que el mockup no cubre.
//
// `actualizar`/`eliminar`/`error` llegan por props desde la misma instancia
// de `useDisponibilidad()` que provee `bloques` en `AppShell` — la grilla
// NUNCA llama al hook por su cuenta, se los pasa tal cual a cada `BloqueItem`
// (R21, R28, design.md §6).
export function DisponibilidadGrid({
  bloques,
  actualizar,
  eliminar,
  error,
}: DisponibilidadGridProps) {
  const marcas = marcasHorarias(VENTANA_DIA);

  return (
    <div className="flex w-full gap-xs">
      {/* Eje horario a la izquierda: da sentido a la altura de las barras, que
          en el diseño original quedaba sin referencia. El <h3> invisible
          clona la altura del encabezado de cada día (letra + mb-xs) para que
          las marcas de hora queden en la misma línea que las barras — sin él,
          esta columna no tiene encabezado propio y sus porcentajes quedan
          corridos respecto a la pista de cada día. Comparte `ALTO_ENCABEZADO`
          y `ALTO_PISTA` con la columna de cada día para que ambas alturas no
          puedan desalinearse por separado. */}
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
        {DIAS.map(({ valor, inicial }) => {
          const bloquesDelDia = bloques.filter((b) => b.dia_semana === valor);

          return (
            <section key={valor} className="flex flex-col" aria-label={valor}>
              <h3 className={`${ALTO_ENCABEZADO} capitalize text-on-surface-variant`}>
                <span aria-hidden="true">{inicial}</span>
                <span className="sr-only">{valor}</span>
              </h3>

              {/* Pista de tiempo: alto fijo sobre el que se posicionan las
                  barras. Las líneas de hora refuerzan la lectura. */}
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
                    <BloqueItem
                      key={bloque.id}
                      bloque={bloque}
                      posicion={posicionBloque(bloque, VENTANA_DIA)}
                      actualizar={actualizar}
                      eliminar={eliminar}
                      error={error}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
