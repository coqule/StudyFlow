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
  icono: ReactNode;
}

function IconoInicio() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2 10l8-7 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 8v8a1 1 0 001 1h3v-5h4v5h3a1 1 0 001-1V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconoHorarios() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2" y="3" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 7h16" stroke="currentColor" strokeWidth="1.5"/><path d="M6 1v4M14 1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="13" r="2" fill="currentColor"/></svg>; }
function IconoCursos() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 3h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M8 7h4M8 10h6M8 13h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function IconoDisponibilidad() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M10 5v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconoHistorial() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 3h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function IconoConfiguracion() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M3.64 3.64l1.41 1.41M14.95 14.95l1.41 1.41M3.64 16.36l1.41-1.41M14.95 5.05l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function IconoAyuda() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M8 8a2 2 0 114 0c0 1.5-2 2-2 3v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="15.5" r="0.5" fill="currentColor"/></svg>; }

const NAVEGACION: ItemNav[] = [
  { etiqueta: "Inicio", ruta: "/", icono: <IconoInicio /> },
  { etiqueta: "Horarios", ruta: "/horarios", icono: <IconoHorarios /> },
  { etiqueta: "Cursos", ruta: "/cursos", icono: <IconoCursos /> },
  { etiqueta: "Disponibilidad", ruta: "/disponibilidad", icono: <IconoDisponibilidad /> },
  { etiqueta: "Historial", ruta: null, icono: <IconoHistorial /> },
];

const NAVEGACION_PIE: ItemNav[] = [
  { etiqueta: "Configuración", ruta: null, icono: <IconoConfiguracion /> },
  { etiqueta: "Ayuda", ruta: null, icono: <IconoAyuda /> },
];

const ITEM_BASE =
  "flex w-full items-center rounded-lg px-sm py-xs text-left text-body-md transition-colors";
const ITEM_ACTIVO = "border-r-4 border-primary bg-primary-container/10 text-primary";
const ITEM_INACTIVO = "text-on-surface-variant hover:bg-surface-container-high";
const ITEM_NO_DISPONIBLE = "text-on-surface-variant/50 cursor-not-allowed";

interface ItemNavegacionProps {
  etiqueta: string;
  ruta: string | null;
  icono: ReactNode;
  onNavegar?: () => void;
}

// NavLink resuelve el estado activo contra la URL y fija `aria-current="page"`
// por su cuenta; solo alternamos las clases con su render prop `isActive`.
function ItemNavegacion({ etiqueta, ruta, icono, onNavegar }: ItemNavegacionProps) {
  if (ruta === null) {
    return (
      <li>
        <button type="button" disabled className={`${ITEM_BASE} ${ITEM_NO_DISPONIBLE}`}>
          <span className="flex items-center gap-2">
            <span className="shrink-0 opacity-50">{icono}</span>
            <span>{etiqueta}</span>
          </span>
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
        <span className="flex items-center gap-2">
          <span className="shrink-0">{icono}</span>
          <span>{etiqueta}</span>
        </span>
      </NavLink>
    </li>
  );
}

interface ContenidoBarraProps {
  onNavegar?: () => void;
  onGenerarHorario: () => void;
  generando: boolean;
  puedeGenerar: boolean;
}

// El contenido de la barra se escribe una sola vez y se monta en dos sitios:
// la columna fija de escritorio y el cajón de móvil. Duplicarlo garantizaría
// que las dos versiones se separen en el primer cambio. `onNavegar` sirve al
// cajón para cerrarse al elegir un destino.
//
// "Generar horario" (feature 15) reemplaza a "Nueva tarea" en este lugar del
// árbol (specs/generar_ui/requirements.md R7, decisión explícita del
// usuario): visible y disparable desde cualquier ruta, deshabilitado mientras
// `generando` es true para cubrir R2 (indicador de carga) y R3 (no disparar
// una segunda petición concurrente si se hace click mientras ya está en
// curso).
function ContenidoBarra({ onNavegar, onGenerarHorario, generando, puedeGenerar }: ContenidoBarraProps) {
  return (
    <>
      <nav aria-label="Secciones">
        <ul className="flex flex-col gap-xs">
          {NAVEGACION.map(({ etiqueta, ruta, icono }) => (
            <ItemNavegacion key={etiqueta} etiqueta={etiqueta} ruta={ruta} icono={icono} onNavegar={onNavegar} />
          ))}
        </ul>
      </nav>

      <button
        type="button"
        onClick={onGenerarHorario}
        disabled={!puedeGenerar || generando}
        aria-busy={generando}
        title={!puedeGenerar ? "Registra cursos, tareas y disponibilidad para generar un horario" : undefined}
        className="mt-auto mb-sm w-full rounded-lg bg-primary py-sm text-label-md text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        Generar horario
      </button>

      <div className="border-t border-outline-variant pt-sm">
        <ul className="flex flex-col gap-xs">
          {NAVEGACION_PIE.map(({ etiqueta, ruta, icono }) => (
            <ItemNavegacion key={etiqueta} etiqueta={etiqueta} ruta={ruta} icono={icono} onNavegar={onNavegar} />
          ))}
        </ul>
      </div>
    </>
  );
}

interface AppLayoutProps {
  nombreUsuario: string;
  onCerrarSesion: () => void;
  onGenerarHorario: () => void;
  generando: boolean;
  puedeGenerar: boolean;
  children: ReactNode;
}

export function AppLayout({
  nombreUsuario,
  onCerrarSesion,
  onGenerarHorario,
  generando,
  puedeGenerar,
  children,
}: AppLayoutProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [oscuro, setOscuro] = useState(() => localStorage.getItem("tema") === "oscuro");
  const idCajon = useId();
  const botonMenuRef = useRef<HTMLButtonElement>(null);
  const cerrarCajonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", oscuro);
    localStorage.setItem("tema", oscuro ? "oscuro" : "claro");
  }, [oscuro]);

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

  const generarHorarioDesdeCajon = () => {
    setMenuAbierto(false);
    onGenerarHorario();
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-outline-variant bg-surface px-sm py-md md:flex">
        <span className="mb-lg text-center font-display text-headline-lg text-primary">
          <span className="text-[1.4em]">S</span>tudyFlow
        </span>
        <ContenidoBarra onGenerarHorario={onGenerarHorario} generando={generando} puedeGenerar={puedeGenerar} />
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
              <span className="font-display text-headline-lg text-primary">
                <span className="text-[1.4em]">S</span>tudyFlow
              </span>
              <button
                ref={cerrarCajonRef}
                type="button"
                onClick={cerrarMenu}
                className="rounded px-xs py-0.5 text-body-md text-on-surface-variant hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Cerrar
              </button>
            </div>
            <ContenidoBarra
              onNavegar={() => setMenuAbierto(false)}
              onGenerarHorario={generarHorarioDesdeCajon}
              generando={generando}
              puedeGenerar={puedeGenerar}
            />
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
            <span className="font-display text-headline-lg text-primary">
              <span className="text-[1.4em]">S</span>tudyFlow
            </span>
          </div>
          <div className="flex items-center gap-sm md:ml-auto">
            <span className="text-body-sm text-on-surface-variant">{nombreUsuario}</span>
            <button
              type="button"
              onClick={() => setOscuro((prev) => !prev)}
              className="rounded p-1.5 text-on-surface-variant hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={oscuro ? "Activar modo claro" : "Activar modo oscuro"}
            >
              {oscuro ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M17 10.74A8 8 0 019.26 3 6.5 6.5 0 1017 10.74z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
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
