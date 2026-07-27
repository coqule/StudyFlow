import { useState } from "react";
import type { FormEvent } from "react";

import type { NuevoCurso } from "../../types";
import { BOTON_PRIMARIO, CAMPO, ERROR, ETIQUETA } from "../ui/clases";
import { EscalaCirculos } from "../ui/EscalaCirculos";

// Estos hex son DATOS, no estilo: viajan al backend y se guardan en la
// columna `color` del curso. Por eso son literales y no tokens — un
// `var(--color-primary)` no sobrevive a un INSERT. Reproducen los tres
// colores de categoría que el sistema define para los eventos del calendario
// (azul, verde, naranja).
const COLORES_SUGERIDOS = [
  { valor: "#0058be", nombre: "Azul" },
  { valor: "#006c49", nombre: "Verde" },
  { valor: "#994100", nombre: "Naranja" },
];
const COLOR_DEFAULT = COLORES_SUGERIDOS[0].valor;

interface CursoFormProps {
  crear: (datos: NuevoCurso) => Promise<void>;
}

// `crear` llega por props (specs/cursos_crud/design.md §7.7) en vez de que
// CursoForm llame useCursos() por su cuenta: cada llamada a useCursos()
// crea una instancia de estado independiente, así que un CursoForm
// "autoconectado" actualiza su propio `data` desconectado del que lee
// CursoList en AppShell — esto rompía R13 en la práctica (fix de R30).
// Campos: `nombre` (input texto), `color` (muestras sugeridas más selector
// libre), `dificultad` (radios 1-5, valores enteros por construcción, R12).
// Solo `nombre` requiere validación explícita en submit (R14).
//
// La dificultad usa radios y no los <span> clicables del diseño de Stitch:
// un span no recibe foco, no responde al teclado y un lector de pantalla no
// lo anuncia como control. El aspecto es el del diseño; el comportamiento,
// el de un grupo de radios nativo.
export function CursoForm({ crear }: CursoFormProps) {
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(COLOR_DEFAULT);
  const [dificultad, setDificultad] = useState(1);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nombre.trim()) {
      setErrorLocal("El nombre del curso es obligatorio");
      return;
    }

    setErrorLocal(null);
    await crear({ nombre: nombre.trim(), color, dificultad });
    setNombre("");
    setColor(COLOR_DEFAULT);
    setDificultad(1);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-sm">
      <div className="flex flex-col gap-xs">
        <label htmlFor="curso-nombre" className={ETIQUETA}>
          Nombre del curso
        </label>
        <input
          id="curso-nombre"
          type="text"
          placeholder="Ej. Álgebra Lineal"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          className={CAMPO}
        />
      </div>

      <div className="flex flex-col gap-md pt-xs sm:flex-row sm:items-start sm:justify-between">
        <EscalaCirculos
          nombre="curso-dificultad"
          etiqueta="Dificultad (1-5)"
          valor={dificultad}
          onCambio={setDificultad}
        />

        <fieldset className="flex flex-col gap-xs border-0 p-0">
          <legend className={`${ETIQUETA} mb-2`}>Color</legend>
          <div className="flex items-center gap-xs">
            {COLORES_SUGERIDOS.map(({ valor, nombre: nombreColor }) => (
              <label key={valor} className="cursor-pointer">
                <input
                  type="radio"
                  name="curso-color"
                  value={valor}
                  checked={color === valor}
                  onChange={() => setColor(valor)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: valor }}
                  className="block size-6 rounded ring-2 ring-transparent transition-all peer-hover:ring-outline-variant peer-checked:ring-on-surface peer-focus-visible:ring-primary"
                />
                <span className="sr-only">{nombreColor}</span>
              </label>
            ))}
            {/* Separador y borde punteado: el selector libre no debe leerse
                como una cuarta muestra. La etiqueta visible es lo que más
                comunica que abre un selector, no un color más. */}
            <span aria-hidden="true" className="mx-xs h-6 w-px bg-outline-variant" />
            <label
              htmlFor="curso-color"
              className="flex cursor-pointer items-center gap-xs pr-sm text-label-md text-on-surface-variant transition-colors hover:text-primary"
            >
              <input
                id="curso-color"
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="size-6 cursor-pointer rounded-full border-2 border-dashed border-outline bg-transparent p-0"
              />
              Personalizado
            </label>
          </div>
        </fieldset>
      </div>

      {errorLocal && (
        <p role="alert" className={ERROR}>
          {errorLocal}
        </p>
      )}
      <button type="submit" className={`${BOTON_PRIMARIO} self-start`}>
        Guardar
      </button>
    </form>
  );
}
