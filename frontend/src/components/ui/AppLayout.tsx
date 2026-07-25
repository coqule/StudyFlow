import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { BOTON_SECUNDARIO } from "./clases";

// Armazón de la aplicación: barra lateral, cabecera y área de contenido.
// Vive aparte de cualquier página concreta para que las pantallas se cuelguen
// del mismo marco sin rehacerlo.
//
// `ruta: null` marca las secciones que el diseño de Stitch contempla pero que
// todavía no tienen página (ADR-006). Se renderizan como <button disabled>:
// se ven, comunican hacia dónde va el producto, y ni reciben foco ni responden
// al clic.
interface ItemNav {
  etiqueta: string;
  ruta: string | null;
}

const NAVEGACION: ItemNav[] = [
  { etiqueta: "Inicio", ruta: "/" },
  { etiqueta: "Calendario", ruta: null },
  { etiqueta: "Cursos", ruta: "/cursos" },
  { etiqueta: "Disponibilidad", ruta: "/disponibilidad" },
  { etiqueta: "Historial", ruta: null },
];

const NAVEGACION_PIE: ItemNav[] = [
  { etiqueta: "Configuración", ruta: null },
  { etiqueta: "Ayuda", ruta: null },
];

const ITEM_BASE =
  "flex w-full items-center rounded-lg px-sm py-xs text-left text-body-md transition-colors";
const ITEM_ACTIVO = "border-r-4 border-primary bg-primary-container/10 text-primary";
const ITEM_INACTIVO = "text-on-surface-variant hover:bg-surface-container-high";
const ITEM_NO_DISPONIBLE = "text-on-surface-variant/50 cursor-not-allowed";

interface ItemNavegacionProps {
  etiqueta: string;
  ruta: string | null;
  onNavegar?: () => void;
}

// NavLink resuelve el estado activo contra la URL y fija `aria-current="page"`
// por su cuenta; solo alternamos las clases con su render prop `isActive`.
function ItemNavegacion({ etiqueta, ruta, onNavegar }: ItemNavegacionProps) {
  if (ruta === null) {
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
      <NavLink
        to={ruta}
        end
        onClick={onNavegar}
        className={({ isActive }) => `${ITEM_BASE} ${isActive ? ITEM_ACTIVO : ITEM_INACTIVO}`}
      >
        {etiqueta}
      </NavLink>
    </li>
  );
}

interface ContenidoBarraProps {
  onNavegar?: () => void;
  onNuevaTarea: () => void;
}

// El contenido de la barra se escribe una sola vez y se monta en dos sitios:
// la columna fija de escritorio y el cajón de móvil. Duplicarlo garantizaría
// que las dos versiones se separen en el primer cambio. `onNavegar` sirve al
// cajón para cerrarse al elegir un destino.
function ContenidoBarra({ onNavegar, onNuevaTarea }: ContenidoBarraProps) {
  return (
    <>
      <nav aria-label="Secciones">
        <ul className="flex flex-col gap-xs">
          {NAVEGACION.map(({ etiqueta, ruta }) => (
            <ItemNavegacion key={etiqueta} etiqueta={etiqueta} ruta={ruta} onNavegar={onNavegar} />
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
          {NAVEGACION_PIE.map(({ etiqueta, ruta }) => (
            <ItemNavegacion key={etiqueta} etiqueta={etiqueta} ruta={ruta} onNavegar={onNavegar} />
          ))}
        </ul>
      </div>
    </>
  );
}

interface AppLayoutProps {
  nombreUsuario: string;
  onCerrarSesion: () => void;
  onNuevaTarea: () => void;
  children: ReactNode;
}

export function AppLayout({
  nombreUsuario,
  onCerrarSesion,
  onNuevaTarea,
  children,
}: AppLayoutProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const idCajon = useId();
  const botonMenuRef = useRef<HTMLButtonElement>(null);
  const cerrarCajonRef = useRef<HTMLButtonElement>(null);

  // El cajón se monta y desmonta en vez de ocultarse por CSS: un elemento
  // trasladado fuera de pantalla sigue estando en el árbol de accesibilidad,
  // así que un lector de pantalla lo recorrería aunque el usuario no lo vea.
  useEffect(() => {
    if (!menuAbierto) return;

    cerrarCajonRef.current?.focus();

    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setMenuAbierto(false);
    };
    document.addEventListener("keydown", alPresionarTecla);
    return () => document.removeEventListener("keydown", alPresionarTecla);
  }, [menuAbierto]);

  const cerrarMenu = () => {
    setMenuAbierto(false);
    botonMenuRef.current?.focus();
  };

  const nuevaTareaDesdeCajon = () => {
    setMenuAbierto(false);
    onNuevaTarea();
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-outline-variant bg-surface px-sm py-md md:flex">
        <span className="mb-lg px-sm font-display text-headline-sm text-primary">StudyFlow</span>
        <ContenidoBarra onNuevaTarea={onNuevaTarea} />
      </aside>

      {menuAbierto && (
        <div className="fixed inset-0 z-20 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            tabIndex={-1}
            onClick={cerrarMenu}
            className="absolute inset-0 h-full w-full cursor-default bg-inverse-surface/40"
          />
          <div
            id={idCajon}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de secciones"
            className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-outline-variant bg-surface px-sm py-md"
          >
            <div className="mb-lg flex items-center justify-between px-sm">
              <span className="font-display text-headline-sm text-primary">StudyFlow</span>
              <button
                ref={cerrarCajonRef}
                type="button"
                onClick={cerrarMenu}
                className="rounded px-xs py-0.5 text-body-md text-on-surface-variant hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Cerrar
              </button>
            </div>
            <ContenidoBarra onNavegar={() => setMenuAbierto(false)} onNuevaTarea={nuevaTareaDesdeCajon} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-col md:ml-64">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-sm md:px-lg">
          <div className="flex items-center gap-sm md:hidden">
            <button
              ref={botonMenuRef}
              type="button"
              aria-label="Abrir menú"
              aria-expanded={menuAbierto}
              aria-controls={idCajon}
              onClick={() => setMenuAbierto(true)}
              className="rounded p-xs text-on-surface-variant hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span aria-hidden="true" className="flex w-5 flex-col gap-1">
                <span className="h-0.5 w-full rounded-full bg-current" />
                <span className="h-0.5 w-full rounded-full bg-current" />
                <span className="h-0.5 w-full rounded-full bg-current" />
              </span>
            </button>
            <span className="font-display text-headline-sm text-primary">StudyFlow</span>
          </div>
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
