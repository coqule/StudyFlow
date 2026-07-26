// Página principal, alcanzable desde el menú lateral como «Inicio». Por ahora
// solo tiene el título; el contenido llegará en una iteración posterior.
export function HomePage() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-gutter pb-xl">
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-sm">
        <h1 className="font-display text-headline-md text-on-surface">Bienvenido a StudyFlow</h1>
      </div>
    </div>
  );
}
