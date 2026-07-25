import type { ReactNode } from "react";

import { SECCION } from "../components/ui/clases";

interface DisponibilidadPageProps {
  children: ReactNode;
}

// Página de disponibilidad semanal, alcanzable desde el menú lateral. Se
// separó del Panel de Registro para aligerar esa vista; aquí la grilla de 7
// días dispone de todo el ancho, que es justo lo que necesitaba.
//
// Es de composición: el formulario y la grilla llegan por `children` ya
// cableados a la instancia única de useDisponibilidad() de AppShell.
export function DisponibilidadPage({ children }: DisponibilidadPageProps) {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-gutter pb-xl">
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-sm">
        <h1 className="font-display text-headline-md text-on-surface">Disponibilidad semanal</h1>
      </div>

      <div className={SECCION}>{children}</div>
    </div>
  );
}
