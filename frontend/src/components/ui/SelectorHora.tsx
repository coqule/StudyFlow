import { CAMPO, ETIQUETA } from "./clases";

interface SelectorHoraProps {
  // Nombre accesible del grupo; debe ser único dentro del formulario para que
  // dos selectores (inicio/fin) no compartan nombre de campo.
  etiqueta: string;
  // Valor "HH:MM" (acepta "HH:MM:SS" de Postgres y lo normaliza).
  value: string;
  onChange: (value: string) => void;
}

const HORAS = Array.from({ length: 24 }, (_, h) => h);
// Minutos en pasos de 5: 12 opciones cubren la disponibilidad sin abrumar.
const MINUTOS_BASE = Array.from({ length: 12 }, (_, i) => i * 5);

function dos(n: number): string {
  return String(n).padStart(2, "0");
}

// Selector de hora en formato 24h con dos desplegables (hora 00–23, minutos).
// Reemplaza al <input type="time"> nativo, cuyo formato 12h/24h lo decide el
// locale del navegador y no se puede forzar por HTML. Con selects el formato
// es 24h en cualquier navegador y dispositivo, y sigue siendo accesible por
// teclado. El valor emitido es "HH:MM", igual que antes, así que la lógica de
// comparación de rangos (hora_fin > hora_inicio) no cambia.
export function SelectorHora({ etiqueta, value, onChange }: SelectorHoraProps) {
  const [hStr = "0", mStr = "0"] = value.slice(0, 5).split(":");
  const hora = Number(hStr);
  const minuto = Number(mStr);

  // Si el minuto guardado no cae en un paso de 5 (dato preexistente), se
  // incluye igual para no perderlo al abrir el selector.
  const minutos = MINUTOS_BASE.includes(minuto)
    ? MINUTOS_BASE
    : [...MINUTOS_BASE, minuto].sort((a, b) => a - b);

  const emitir = (h: number, m: number) => onChange(`${dos(h)}:${dos(m)}`);

  return (
    <fieldset className="flex flex-col gap-xs border-0 p-0">
      <legend className={ETIQUETA}>{etiqueta}</legend>
      <div className="flex items-center gap-xs">
        <select
          aria-label={`${etiqueta}, hora`}
          value={hora}
          onChange={(event) => emitir(Number(event.target.value), minuto)}
          className={CAMPO}
        >
          {HORAS.map((h) => (
            <option key={h} value={h}>
              {dos(h)}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="text-on-surface-variant">
          :
        </span>
        <select
          aria-label={`${etiqueta}, minutos`}
          value={minuto}
          onChange={(event) => emitir(hora, Number(event.target.value))}
          className={CAMPO}
        >
          {minutos.map((m) => (
            <option key={m} value={m}>
              {dos(m)}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
