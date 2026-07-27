import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { BOTON_ACENTO, CAMPO, SECCION, TITULO_SECCION } from "../ui/clases";

interface CajaAjusteProps {
  ajustar: (instruccion: string) => Promise<void>;
  ajustando: boolean;
  // "Generar horario" (barra lateral) y este ajuste comparten el mismo
  // `data`/`error` de useHorarios vía dos refetch independientes: si
  // corrieran a la vez, el que resuelve último pisaría en silencio el
  // resultado del otro. El hook ya se bloquea a sí mismo por esto (ver
  // useHorarios.ts), pero además se deshabilita aquí la caja mientras
  // `generando` está en curso para que el usuario vea *por qué* no puede
  // enviar, en vez de un clic que no hace nada.
  generando: boolean;
  // No se renderiza acá (ver comentario del componente) — solo se usa para
  // decidir si el envío que acaba de terminar falló, y en ese caso conservar
  // el texto tipeado en vez de vaciarlo.
  error: string | null;
}

// Caja de ajuste conversacional (feature 16, referencia visual: pantalla
// "Calendario" del proyecto Stitch "Modern AI Calendar"). Es presentacional:
// solo dispara `ajustar` (POST /api/horarios/ajustar vía useHorarios) y
// refleja `ajustando`/`generando` — no arma la instrucción ni interpreta la
// respuesta, ni decide qué bloques del calendario cambian (eso lo resuelve
// el hook al refrescar `data`). El error de un ajuste fallido se muestra una
// sola vez, en `CalendarioSemanal` (mismo `error` compartido que ya usa
// `generar`, specs/generar_ui/design.md §2) — repetirlo aquí duplicaría el
// mensaje.
export function CajaAjuste({ ajustar, ajustando, generando, error }: CajaAjusteProps) {
  const [instruccion, setInstruccion] = useState("");
  const bloqueado = ajustando || generando;
  // `ajustar()` nunca rechaza la promesa (atrapa el error internamente y lo
  // expone como estado en el hook), así que no hay forma de distinguir éxito
  // de fallo esperando la resolución de `await ajustar(...)`. Por eso el
  // campo no se vacía en el propio `handleSubmit`, sino en este efecto:
  // cuando `ajustando` vuelve a `false` tras un envío propio (`enviadoRef`),
  // solo se limpia si `error` sigue vacío. Si el backend falló, el usuario
  // conserva su texto para reintentar en vez de tener que recordarlo y
  // retiparlo — el mensaje de error en sí lo muestra `CalendarioSemanal`.
  const enviadoRef = useRef(false);

  useEffect(() => {
    if (!ajustando && enviadoRef.current) {
      enviadoRef.current = false;
      if (!error) setInstruccion("");
    }
  }, [ajustando, error]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const texto = instruccion.trim();
    if (!texto || bloqueado) return;

    enviadoRef.current = true;
    void ajustar(texto);
  };

  return (
    <div className={SECCION}>
      <h2 className={TITULO_SECCION}>Pedir un ajuste</h2>

      <form onSubmit={handleSubmit} className="mt-sm flex items-center gap-xs">
        <label htmlFor="ajuste-instruccion" className="sr-only">
          Instrucción para reorganizar el horario
        </label>
        <input
          id="ajuste-instruccion"
          type="text"
          placeholder="el examen de Cálculo II se adelantó para mañana…"
          value={instruccion}
          onChange={(event) => setInstruccion(event.target.value)}
          disabled={bloqueado}
          className={`${CAMPO} disabled:cursor-not-allowed disabled:opacity-70`}
        />
        <button type="submit" disabled={bloqueado || !instruccion.trim()} className={BOTON_ACENTO}>
          Enviar
        </button>
      </form>

      {ajustando && (
        <p role="status" aria-live="polite" className="mt-sm text-body-sm text-on-surface-variant">
          Esperando respuesta de la IA…
        </p>
      )}
    </div>
  );
}
