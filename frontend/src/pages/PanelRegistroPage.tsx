import type { ReactNode } from "react";

import { SECCION, TITULO_SECCION } from "../components/ui/clases";

interface PanelRegistroPageProps {
  seccionCursos: ReactNode;
  seccionTareas: ReactNode;
  seccionCursosLista: ReactNode;
  seccionTareasLista: ReactNode;
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

// Contenido del «Panel de Registro»: a la izquierda los formularios de alta
// (cursos y tareas), a la derecha el resumen de lo registrado. La
// disponibilidad vive ahora en su propia página (menú lateral) para no
// recargar esta vista.
//
// Es puramente de composición: recibe cada sección ya construida por props y
// no llama a ningún hook. Las instancias de useCursos/useTareas viven una sola
// vez en AppShell para que formularios y listas compartan estado; si esta
// página llamara a los hooks por su cuenta, la lista visible quedaría
// desconectada de lo que acaba de crear el formulario.
export function PanelRegistroPage({
  seccionCursos,
  seccionTareas,
  seccionCursosLista,
  seccionTareasLista,
}: PanelRegistroPageProps) {
  return (
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
          <Seccion titulo="Lista de cursos">{seccionCursosLista}</Seccion>
          <Seccion titulo="Lista de tareas">{seccionTareasLista}</Seccion>
        </div>
      </div>
    </div>
  );
}
