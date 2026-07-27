import { ETIQUETA } from "./clases";

interface EscalaCirculosProps {
  // Nombre del grupo de radios; debe ser único dentro del formulario para
  // que dos escalas en la misma página no se pisen la selección.
  nombre: string;
  etiqueta: string;
  valor: number;
  onCambio: (valor: number) => void;
  // Extremo superior de la escala 1..maximo, inclusive. La dificultad y la
  // prioridad usan 5; se parametriza por si alguna escala futura difiere.
  maximo?: number;
}

// Escala de selección 1..N como círculos numerados. Un único componente para
// las dos escalas del sistema —dificultad de cursos y prioridad de tareas—
// para que se vean y se comporten igual: copiarlas garantizaría que la
// primera vez que alguien ajuste el círculo, una de las dos quede atrás.
//
// Cada opción es un <input type="radio"> real, no un <span> clicable como en
// el diseño de Stitch: recibe foco, responde al teclado con flechas y un
// lector de pantalla lo anuncia como grupo. El número va dentro del círculo,
// así la etiqueta visible y el nombre accesible son el mismo texto.
export function EscalaCirculos({
  nombre,
  etiqueta,
  valor,
  onCambio,
  maximo = 5,
}: EscalaCirculosProps) {
  const opciones = Array.from({ length: maximo }, (_, i) => i + 1);

  return (
    <fieldset className="flex flex-col gap-xs border-0 p-0">
      <legend className={`${ETIQUETA} mb-2`}>{etiqueta}</legend>
      <div className="flex gap-xs">
        {opciones.map((n) => (
          <label key={n} className="cursor-pointer">
            <input
              type="radio"
              name={nombre}
              value={n}
              checked={valor === n}
              onChange={() => onCambio(n)}
              className="peer sr-only"
            />
            <span className="flex size-8 items-center justify-center rounded-full border-2 border-outline text-body-sm text-on-surface-variant transition-colors peer-hover:border-primary peer-checked:border-primary peer-checked:bg-primary peer-checked:text-on-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40">
              {n}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
