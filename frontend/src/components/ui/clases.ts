// Clases compartidas del sistema de diseño «Cognitive Flow» (ADR-005).
//
// Existen para que un mismo elemento —un campo, una etiqueta, una tarjeta de
// sección— se escriba una sola vez y no se copie y pegue por los componentes.
// Copiar y pegar es exactamente como una paleta se fragmenta: la sexta copia
// cambia un token y nadie lo nota.
//
// Ningún valor literal aquí: todo son tokens declarados en index.css.

// Campo de texto. En reposo va sin borde sobre gris suave; al enfocar pasa a
// blanco con borde primario y un anillo de 2px. El anillo es lo que hace
// visible el foco sin desplazar el layout (un cambio de grosor de borde sí
// correría el contenido un píxel).
export const CAMPO =
  "w-full rounded bg-surface-container-low px-sm py-xs text-body-md text-on-surface " +
  "border border-transparent outline-none transition-all " +
  "focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/40";

// Etiqueta de campo. Se ubica sobre el control, separada por `gap-xs`.
export const ETIQUETA = "text-label-md text-on-surface-variant";

// Tarjeta de sección del panel.
export const SECCION =
  "rounded-lg border border-outline-variant bg-surface-container-lowest p-md";

// Título de sección.
export const TITULO_SECCION = "font-display text-headline-sm text-on-surface";

// Botón de acción principal.
export const BOTON_PRIMARIO =
  "rounded bg-primary px-md py-xs text-label-md text-on-primary transition-opacity " +
  "hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

// Botón secundario, contorneado.
export const BOTON_SECUNDARIO =
  "rounded border border-outline bg-surface-container-lowest px-md py-xs text-label-md text-on-surface " +
  "transition-colors hover:bg-surface-container-low " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

// Botón de acento (tertiary), para acciones puntuales fuera del flujo
// primario/secundario — p. ej. "Enviar" en la caja de ajuste conversacional.
export const BOTON_ACENTO =
  "rounded bg-tertiary px-md py-xs text-label-md text-on-tertiary transition-opacity " +
  "hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tertiary " +
  "disabled:cursor-not-allowed disabled:opacity-50";

// Mensaje de error de formulario.
export const ERROR = "text-body-sm text-error";
