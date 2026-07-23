import type { ReactNode } from "react";

import { BOTON_SECUNDARIO, SECCION, TITULO_SECCION } from "../components/ui/clases";

interface PanelRegistroPageProps {
  nombreUsuario: string;
  onCerrarSesion: () => void;
  seccionCursos: ReactNode;
  seccionTareas: ReactNode;
  seccionDisponibilidad: ReactNode;
  seccionResumen: ReactNode;
}

interface SeccionProps {
  titulo: string;
  children: ReactNode;
}

function Seccion({ titulo, children }: SeccionProps) {
  return (
    <section className={SECCION} aria-label={titulo}>
      <h2 className={`${TITULO_SECCION} mb-md`}>{titulo}</h2>
      {children}
    </section>
  );
}

// Armazón del «Panel de Registro» (pantalla "Registro Unificado" del proyecto
// Stitch «Modern AI Calendar»). Es puramente de composición: recibe cada
// sección ya construida por props y no llama a ningún hook de datos.
//
// Esto es deliberado. Las instancias de useCursos/useTareas/useDisponibilidad
// viven una sola vez en AppShell (App.tsx §27) para que formularios y listas
// compartan estado; si esta página llamara a los hooks por su cuenta, la
// lista visible quedaría desconectada de lo que acaba de crear el formulario.
//
// El botón «dark_mode» del diseño queda fuera a propósito: «Cognitive Flow»
// declara colorMode LIGHT y no define ningún token oscuro, así que sería un
// control sin nada detrás (ADR-005).
export function PanelRegistroPage({
  nombreUsuario,
  onCerrarSesion,
  seccionCursos,
  seccionTareas,
  seccionDisponibilidad,
  seccionResumen,
}: PanelRegistroPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-sm md:px-lg">
        <span className="font-display text-headline-sm text-primary">StudyFlow</span>
        <div className="flex items-center gap-sm">
          <span className="text-body-sm text-on-surface-variant">{nombreUsuario}</span>
          <button type="button" onClick={onCerrarSesion} className={BOTON_SECUNDARIO}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-md md:p-gutter">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-gutter pb-xl">
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-sm">
            <h1 className="font-display text-headline-md text-on-surface">Panel de Registro</h1>
          </div>

          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
            <div className="flex flex-col gap-gutter lg:col-span-5">
              <Seccion titulo="Cursos">{seccionCursos}</Seccion>
              <Seccion titulo="Tareas / Evaluaciones">{seccionTareas}</Seccion>
            </div>
            <div className="flex flex-col gap-gutter lg:col-span-7">
              <Seccion titulo="Disponibilidad semanal">{seccionDisponibilidad}</Seccion>
              <Seccion titulo="Lista de cursos y tareas registradas">{seccionResumen}</Seccion>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
