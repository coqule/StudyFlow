import type { ReactNode } from "react";

import { BOTON_SECUNDARIO } from "./clases";

// Armazón de la aplicación: barra lateral fija, cabecera y área de contenido.
// Vive aparte de cualquier página concreta para que Calendario, Historial y
// las demás pantallas futuras se cuelguen del mismo marco sin rehacerlo.
//
// `disponible: false` marca las secciones que el diseño de Stitch contempla
// pero que todavía no tienen página. Se renderizan como <button disabled>:
// se ven, comunican hacia dónde va el producto, y ni reciben foco ni
// responden al clic. Un enlace que no lleva a ningún lado es peor que un
// ítem visiblemente apagado.
const NAVEGACION = [
  { etiqueta: "Calendario", disponible: false },
  { etiqueta: "Cursos", disponible: true },
  { etiqueta: "Historial", disponible: false },
];

const NAVEGACION_PIE = [
  { etiqueta: "Configuración", disponible: false },
  { etiqueta: "Ayuda", disponible: false },
];

const ITEM_BASE =
  "flex w-full items-center rounded-lg px-sm py-xs text-left text-body-md transition-colors";
const ITEM_ACTIVO = "border-r-4 border-primary bg-primary-container/10 text-primary";
const ITEM_INACTIVO = "text-on-surface-variant hover:bg-surface-container-high";
const ITEM_NO_DISPONIBLE = "text-on-surface-variant/50 cursor-not-allowed";

interface ItemNavegacionProps {
  etiqueta: string;
  disponible: boolean;
  activo?: boolean;
}

function ItemNavegacion({ etiqueta, disponible, activo = false }: ItemNavegacionProps) {
  if (!disponible) {
    return (
      <li>
        <button type="button" disabled className={`${ITEM_BASE} ${ITEM_NO_DISPONIBLE}`}>
          {etiqueta}
          <span className="sr-only"> (próximamente)</span>
        </button>
      </li>
    );
  }

  return (
    <li>
      <span
        aria-current={activo ? "page" : undefined}
        className={`${ITEM_BASE} ${activo ? ITEM_ACTIVO : ITEM_INACTIVO}`}
      >
        {etiqueta}
      </span>
    </li>
  );
}

interface AppLayoutProps {
  nombreUsuario: string;
  seccionActiva: string;
  onCerrarSesion: () => void;
  onNuevaTarea: () => void;
  children: ReactNode;
}

export function AppLayout({
  nombreUsuario,
  seccionActiva,
  onCerrarSesion,
  onNuevaTarea,
  children,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* La barra se oculta por debajo de `md`. No agrego el botón de menú
          del diseño porque abriría un cajón que todavía no existe. */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-outline-variant bg-surface px-sm py-md md:flex">
        <span className="mb-lg px-sm font-display text-headline-sm text-primary">StudyFlow</span>

        <nav aria-label="Secciones">
          <ul className="flex flex-col gap-xs">
            {NAVEGACION.map(({ etiqueta, disponible }) => (
              <ItemNavegacion
                key={etiqueta}
                etiqueta={etiqueta}
                disponible={disponible}
                activo={etiqueta === seccionActiva}
              />
            ))}
          </ul>
        </nav>

        <button
          type="button"
          onClick={onNuevaTarea}
          className="mt-auto mb-sm w-full rounded-lg bg-primary py-sm text-label-md text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Nueva tarea
        </button>

        <div className="border-t border-outline-variant pt-sm">
          <ul className="flex flex-col gap-xs">
            {NAVEGACION_PIE.map(({ etiqueta, disponible }) => (
              <ItemNavegacion key={etiqueta} etiqueta={etiqueta} disponible={disponible} />
            ))}
          </ul>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col md:ml-64">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-sm md:px-lg">
          <span className="font-display text-headline-sm text-primary md:hidden">StudyFlow</span>
          <div className="flex items-center gap-sm md:ml-auto">
            <span className="text-body-sm text-on-surface-variant">{nombreUsuario}</span>
            <button type="button" onClick={onCerrarSesion} className={BOTON_SECUNDARIO}>
              Cerrar sesión
            </button>
          </div>
        </header>

        <main className="flex-1 p-md md:p-gutter">{children}</main>
      </div>
    </div>
  );
}
