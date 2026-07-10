import { useState } from "react";
import type { FormEvent } from "react";

import type { NuevoCurso } from "../../types";

const DIFICULTADES = [1, 2, 3, 4, 5];
const COLOR_DEFAULT = "#3B82F6";

interface CursoFormProps {
  crear: (datos: NuevoCurso) => Promise<void>;
}

// `crear` llega por props (specs/cursos_crud/design.md §7.7) en vez de que
// CursoForm llame useCursos() por su cuenta: cada llamada a useCursos()
// crea una instancia de estado independiente, así que un CursoForm
// "autoconectado" actualiza su propio `data` desconectado del que lee
// CursoList en AppShell — esto rompía R13 en la práctica (fix de R30).
// Campos: `nombre` (input texto), `color` (input type="color" — el
// navegador garantiza formato hex válido, R12), `dificultad` (select 1-5,
// valores enteros por construcción, R12). Solo `nombre` requiere validación
// explícita en submit (R14).
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
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="curso-nombre">Nombre</label>
        <input
          id="curso-nombre"
          type="text"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="curso-color">Color</label>
        <input
          id="curso-color"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="curso-dificultad">Dificultad</label>
        <select
          id="curso-dificultad"
          value={dificultad}
          onChange={(event) => setDificultad(Number(event.target.value))}
        >
          {DIFICULTADES.map((valor) => (
            <option key={valor} value={valor}>
              {valor}
            </option>
          ))}
        </select>
      </div>
      {errorLocal && <p role="alert">{errorLocal}</p>}
      <button type="submit">Guardar</button>
    </form>
  );
}
