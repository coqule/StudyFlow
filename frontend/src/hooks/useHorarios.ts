import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../context/AuthContext";
import * as horariosApi from "../services/horariosApi";
import type { BloqueHorario } from "../types";

interface UseHorariosResult {
  data: BloqueHorario[];
  loading: boolean;
  generando: boolean;
  ajustando: boolean;
  error: string | null;
  generar: () => Promise<void>;
  ajustar: (instruccion: string) => Promise<void>;
}

function mensajeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Ocurrió un error inesperado. Intenta de nuevo.";
}

// useHorarios(): estado { data, loading, generando, error } (docs/conventions.md
// §6 frontend). Obtiene el `accessToken` de `useAuth()` y solicita
// GET /api/horarios al montar — cubre R8 (carga inicial). Desde la feature 15
// expone `generar()`: dispara POST /api/horarios/generar y, en éxito, vuelve a
// pedir GET /api/horarios para obtener el shape enriquecido con
// `tarea_titulo`/`curso_nombre`/`curso_color` (specs/generar_ui/design.md §2)
// en vez de reusar el shape crudo de la respuesta del POST. Si la petición
// falla, deja el mensaje en `error` para que la página lo muestre sin romper el
// resto de la app (R12/R5).
export function useHorarios(): UseHorariosResult {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [data, setData] = useState<BloqueHorario[]>([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [ajustando, setAjustando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref (no estado) para el guard de concurrencia de `generar()`: se lee y
  // escribe de forma síncrona antes de cualquier `await`, así que dos clics
  // en el mismo tick (antes de que React vuelva a renderizar con
  // `generando=true`) igual quedan bloqueados — cubre R3.
  const generandoRef = useRef(false);
  // Mismo guard de concurrencia que `generandoRef`, para `ajustar()`.
  const ajustandoRef = useRef(false);

  useEffect(() => {
    let activo = true;

    if (!accessToken) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    horariosApi
      .listarHorarios(accessToken)
      .then((bloques) => {
        if (!activo) return;
        setData(bloques);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setError(mensajeError(err));
      })
      .finally(() => {
        if (!activo) return;
        setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [accessToken]);

  // generar(): guard de concurrencia (R3) → POST /api/horarios/generar → en
  // éxito, refetch de GET /api/horarios para el shape enriquecido (R4); en
  // error, deja el mensaje en `error` sin tocar `data` (R5).
  //
  // También se bloquea si `ajustar()` está en curso (y viceversa, más abajo):
  // ambas terminan con el mismo `setData(bloques)` de un refetch propio e
  // independiente, así que sin este chequeo cruzado dos peticiones
  // concurrentes se pisarían entre sí — la que resuelve último gana en
  // silencio y descarta el resultado de la otra.
  const generar = useCallback(async () => {
    if (!accessToken) return;
    if (generandoRef.current || ajustandoRef.current) return;

    generandoRef.current = true;
    setGenerando(true);
    setError(null);

    try {
      await horariosApi.generarHorario(accessToken);
      const bloques = await horariosApi.listarHorarios(accessToken);
      setData(bloques);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      generandoRef.current = false;
      setGenerando(false);
    }
  }, [accessToken]);

  // ajustar(instruccion): guard de concurrencia (mismo criterio que R3 de
  // generar(), incluido el bloqueo cruzado con `generandoRef` — ver
  // comentario arriba) → POST /api/horarios/ajustar → en éxito, refetch de
  // GET /api/horarios para el shape enriquecido; en error, deja el mensaje en
  // `error` sin tocar `data` — el calendario permanece en su estado anterior.
  const ajustar = useCallback(
    async (instruccion: string) => {
      if (!accessToken) return;
      if (ajustandoRef.current || generandoRef.current) return;

      ajustandoRef.current = true;
      setAjustando(true);
      setError(null);

      try {
        await horariosApi.ajustarHorario(accessToken, instruccion);
        const bloques = await horariosApi.listarHorarios(accessToken);
        setData(bloques);
      } catch (err) {
        setError(mensajeError(err));
      } finally {
        ajustandoRef.current = false;
        setAjustando(false);
      }
    },
    [accessToken],
  );

  return { data, loading, generando, ajustando, error, generar, ajustar };
}
