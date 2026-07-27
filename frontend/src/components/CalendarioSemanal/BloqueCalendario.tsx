import type { BloqueHorario } from "../../types";

// Prioridad a partir de la cual un bloque se marca como "alta" (R9). Declarado
// como constante para no esparcir el umbral 4 por el JSX.
const UMBRAL_PRIORIDAD_ALTA = 4;

interface BloqueCalendarioProps {
  bloque: BloqueHorario;
  posicion: { top: string; height: string };
  onClick?: () => void;
}

// Celda de un bloque dentro de la pista de un día. Es puramente presentacional:
// recibe el bloque ya enriquecido (curso/tarea vía el JOIN de GET /api/horarios)
// y su posición vertical calculada por `posicionBloque`.
//
// - Color por curso (R9): `curso_color` es un hex arbitrario del usuario, no
//   cabe en un token estático de Tailwind, así que se aplica inline como borde
//   izquierdo y tinte de fondo.
// - Origen IA (R10): `generado_por_ia` alterna borde sólido (IA) vs punteado
//   (movido manualmente) y un texto accesible que lo nombra, para que la
//   distinción no dependa solo del estilo.
// - Prioridad alta (R9): un indicador visible+accesible solo cuando la
//   prioridad de la tarea es >= UMBRAL_PRIORIDAD_ALTA.
export function BloqueCalendario({ bloque, posicion, onClick }: BloqueCalendarioProps) {
  const color = bloque.curso_color ?? "var(--color-primary)";
  const esPrioridadAlta = (bloque.tarea_prioridad ?? 0) >= UMBRAL_PRIORIDAD_ALTA;

  return (
    <article
      data-testid={`bloque-${bloque.id}`}
      className="absolute inset-x-0.5 cursor-pointer overflow-hidden rounded-sm bg-surface-container-high px-xs py-0.5 text-left hover:brightness-110"
      style={{
        top: posicion.top,
        height: posicion.height,
        borderLeft: `4px ${bloque.generado_por_ia ? "solid" : "dashed"} ${color}`,
        backgroundColor: `color-mix(in srgb, ${color} 12%, var(--color-surface-container-high))`,
      }}
      onClick={onClick}
      onKeyDown={(e) => { if (onClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(); } }}
      tabIndex={0}
      role="button"
      aria-label={`${bloque.curso_nombre}, ${bloque.tarea_tipo}, ${bloque.tarea_titulo}`}
    >
      <div className="flex items-center justify-between gap-0.5">
        <span className="truncate text-label-md text-on-surface">{bloque.curso_nombre}</span>
        {esPrioridadAlta && (
          <span
            aria-label="Prioridad alta"
            title="Prioridad alta"
            className="shrink-0 text-error"
          >
            <span aria-hidden="true">!</span>
          </span>
        )}
      </div>

      <p className="truncate text-label-md capitalize text-on-surface">{bloque.tarea_tipo}</p>
      <p className="truncate text-label-md text-on-surface-variant">{bloque.tarea_titulo}</p>

      {/* La distinción IA vs manual no se apoya solo en el estilo del borde:
          se nombra para lectores de pantalla (R10). El `aria-label` es el
          nombre accesible que la nombra explícitamente. */}
      <span
        className="sr-only"
        aria-label={bloque.generado_por_ia ? "Generado por IA" : "Movido manualmente"}
      >
        {bloque.generado_por_ia ? "Generado por IA" : "Movido manualmente"}
      </span>
    </article>
  );
}
