import type { BloqueHorario } from "../../types";

interface BloqueModalProps {
  bloque: BloqueHorario | null;
  abierto: boolean;
  onCerrar: () => void;
}

const TIPO_LABEL: Record<string, string> = {
  tarea: "Tarea",
  examen: "Examen",
  proyecto: "Proyecto",
};

export function BloqueModal({ bloque, abierto, onCerrar }: BloqueModalProps) {
  if (!abierto || !bloque) return null;

  const color = bloque.curso_color ?? "var(--color-primary)";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCerrar}
    >
      <div
        className="mx-sm w-full max-w-sm rounded-lg bg-surface-container-high p-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Detalles del bloque"
      >
        <div className="mb-md flex items-center justify-between">
          <h2 className="font-display text-headline-sm text-on-surface">Detalle</h2>
          <button
            onClick={onCerrar}
            className="rounded-sm p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-sm">
          <div className="flex items-center gap-xs">
            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-label-lg text-on-surface font-medium">{bloque.curso_nombre}</span>
          </div>

          <div className="flex flex-wrap gap-sm rounded-md bg-surface-container p-sm">
            <div className="flex-1">
              <p className="text-label-md text-on-surface-variant">Tipo</p>
              <p className="text-label-lg capitalize text-on-surface">{TIPO_LABEL[bloque.tarea_tipo ?? ""] ?? bloque.tarea_tipo}</p>
            </div>
            <div className="flex-1">
              <p className="text-label-md text-on-surface-variant mb-0.5">Prioridad</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => {
                  const activo = n <= (bloque.tarea_prioridad ?? 0);
                  return (
                    <span
                      key={n}
                      className={`flex size-5 items-center justify-center rounded-full border text-xs transition-colors ${
                        activo
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline text-on-surface-variant"
                      }`}
                    >
                      {n}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <p className="text-label-md text-on-surface-variant mb-0.5">Título</p>
            <p className="text-body-md text-on-surface">{bloque.tarea_titulo}</p>
          </div>

          <div className="grid grid-cols-2 gap-sm">
            <div>
              <p className="text-label-md text-on-surface-variant">Inicio</p>
              <p className="text-body-md text-on-surface">{bloque.hora_inicio}</p>
            </div>
            <div>
              <p className="text-label-md text-on-surface-variant">Fin</p>
              <p className="text-body-md text-on-surface">{bloque.hora_fin}</p>
            </div>
          </div>

          <div>
            <p className="text-label-md text-on-surface-variant mb-0.5">Fecha</p>
            <p className="text-body-md capitalize text-on-surface">{bloque.fecha}</p>
          </div>

          {bloque.justificacion && (
            <div>
              <p className="text-label-md text-on-surface-variant mb-0.5">Justificación IA</p>
              <p className="text-body-md text-on-surface-variant italic">{bloque.justificacion}</p>
            </div>
          )}

          <div className="mt-xs flex items-center gap-1">
            <span
              className={`inline-block h-2 w-2 rounded-full ${bloque.generado_por_ia ? "bg-primary" : "bg-outline"}`}
            />
            <span className="text-label-md text-on-surface-variant">
              {bloque.generado_por_ia ? "Generado por IA" : "Movido manualmente"}
            </span>
          </div>
        </div>

        <button
          onClick={onCerrar}
          className="mt-lg w-full rounded-md bg-primary py-2 text-label-md text-on-primary hover:bg-primary-hover"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
