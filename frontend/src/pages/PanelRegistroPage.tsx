import type { ReactNode } from "react";

import { AppLayout } from "../components/ui/AppLayout";
import { SECCION, TITULO_SECCION } from "../components/ui/clases";

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

// Lleva el foco al primer campo del formulario de tareas. Es la acción real
// que el botón «Nueva tarea» de la barra lateral puede cumplir hoy: no hay
// pantalla de creación aparte, el formulario ya está en esta misma página.
function enfocarNuevaTarea() {
  const campo = document.getElementById("tarea-titulo");
  if (!campo) return;
  campo.scrollIntoView({ behavior: "smooth", block: "center" });
  campo.focus({ preventScroll: true });
}

// Contenido del «Panel de Registro» (pantalla "Registro Unificado" del
// proyecto Stitch «Modern AI Calendar»). Es puramente de composición: recibe
// cada sección ya construida por props y no llama a ningún hook de datos.
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
    <AppLayout
      nombreUsuario={nombreUsuario}
      seccionActiva="Cursos"
      onCerrarSesion={onCerrarSesion}
      onNuevaTarea={enfocarNuevaTarea}
    >
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
    </AppLayout>
  );
}
