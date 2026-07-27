import { CajaAjuste } from "../components/CajaAjuste/CajaAjuste";
import { CalendarioSemanal } from "../components/CalendarioSemanal/CalendarioSemanal";
import { SECCION } from "../components/ui/clases";
import type { BloqueHorario } from "../types";

interface HorariosPageProps {
  data: BloqueHorario[];
  loading: boolean;
  generando: boolean;
  ajustando: boolean;
  error: string | null;
  ajustar: (instruccion: string) => Promise<void>;
}

// Página del calendario semanal, alcanzable desde el menú lateral. Desde la
// feature 15 deja de instanciar `useHorarios()` por su cuenta y recibe
// `{ data, loading, generando, error }` por props — el hook vive en
// `AppShell` (R6), compartido con el botón "Generar horario" de la barra
// lateral (specs/generar_ui/design.md §1). El `error` del hook se propaga a
// la grilla, que lo muestra sin dejar de renderizar el resto (R12/R5).
//
// Desde la feature 16 recibe también `ajustando`/`ajustar` para la caja de
// ajuste conversacional: mismo criterio de props que `generando`, para que
// el estado siga viviendo en el `useHorarios()` único de `AppShell`.
export function HorariosPage({ data, loading, generando, ajustando, error, ajustar }: HorariosPageProps) {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-gutter pb-xl">
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-sm">
        <h1 className="font-display text-headline-md text-on-surface">Calendario semanal</h1>
      </div>

      <div className={`${SECCION} relative`}>
        {loading ? (
          <p className="text-body-md text-on-surface-variant">Cargando horario…</p>
        ) : (
          <>
            {generando && (
              <div
                role="status"
                aria-live="polite"
                className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-surface/70"
              >
                <p className="rounded-lg bg-surface-container-lowest px-md py-sm text-body-md text-on-surface shadow">
                  Generando horario…
                </p>
              </div>
            )}
            <CalendarioSemanal bloques={data} error={error} />
          </>
        )}
      </div>

      {!loading && (
        <CajaAjuste ajustar={ajustar} ajustando={ajustando} generando={generando} error={error} />
      )}
    </div>
  );
}
