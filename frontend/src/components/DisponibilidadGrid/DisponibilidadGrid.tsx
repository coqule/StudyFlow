import type { Disponibilidad, NuevaDisponibilidad } from "../../types";
import { BloqueItem } from "./BloqueItem";

// Los siete días en orden L–D (R14).
const DIAS: Disponibilidad["dia_semana"][] = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

interface DisponibilidadGridProps {
  bloques: Disponibilidad[];
  actualizar: (id: string, cambios: Partial<NuevaDisponibilidad>) => Promise<boolean>;
  eliminar: (id: string) => Promise<boolean>;
  error: string | null;
}

// Grilla semanal: renderiza 7 columnas (una por día, R14) y bajo cada día los
// `BloqueItem` cuyo `dia_semana` coincide (R15), con estado vacío por día.
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
  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-7">
      {DIAS.map((dia) => {
        const bloquesDelDia = bloques.filter((b) => b.dia_semana === dia);

        return (
          <section key={dia} className="flex flex-col gap-2" aria-label={dia}>
            <h3 className="text-sm font-semibold capitalize text-on-surface">{dia}</h3>
            {bloquesDelDia.length === 0 ? (
              <p className="text-xs text-on-surface-variant">Sin bloques</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {bloquesDelDia.map((bloque) => (
                  <BloqueItem
                    key={bloque.id}
                    bloque={bloque}
                    actualizar={actualizar}
                    eliminar={eliminar}
                    error={error}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
