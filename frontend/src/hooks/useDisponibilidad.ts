import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import * as disponibilidadApi from "../services/disponibilidadApi";
import type { Disponibilidad, NuevaDisponibilidad } from "../types";

interface UseDisponibilidadResult {
  data: Disponibilidad[];
  loading: boolean;
  error: string | null;
  crear: (datos: NuevaDisponibilidad) => Promise<void>;
  actualizar: (id: string, cambios: Partial<NuevaDisponibilidad>) => Promise<boolean>;
  eliminar: (id: string) => Promise<boolean>;
}

function mensajeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Ocurrió un error inesperado. Intenta de nuevo.";
}

// useDisponibilidad(): estado { data, loading, error } (docs/conventions.md
// §6 frontend). Obtiene el `accessToken` de `useAuth()` y solicita
// GET /api/disponibilidad al montar — cubre R15 (lista inicial) y R20
// (recargar la página vuelve a montar el árbol de React, por lo que este
// mismo efecto se vuelve a ejecutar y re-solicita los datos).
// `crear`/`actualizar`/`eliminar` mutan `data` localmente con la respuesta
// del backend, sin refetch completo.
export function useDisponibilidad(): UseDisponibilidadResult {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [data, setData] = useState<Disponibilidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    if (!accessToken) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    disponibilidadApi
      .listarDisponibilidad(accessToken)
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

  // crear(): añade el bloque a `data` si tiene éxito; si lanza (p. ej. 409
  // OVERLAP_CONFLICT) deja el mensaje en `error` para R19 y no muta `data`.
  const crear = useCallback(
    async (datos: NuevaDisponibilidad) => {
      if (!accessToken) return;
      setError(null);
      try {
        const bloque = await disponibilidadApi.crearBloque(accessToken, datos);
        setData((actual) => [...actual, bloque]);
      } catch (err) {
        setError(mensajeError(err));
      }
    },
    [accessToken]
  );

  // actualizar()/eliminar() devuelven Promise<boolean> (true = éxito, false =
  // falló y ya dejó su mensaje en `error`) — el llamador (BloqueItem)
  // necesita saber si su propia operación tuvo éxito para salir de modo
  // edición (R25) o mostrar el error en su bloque y permanecer editable
  // (R26), y para R32/R33 en eliminación (design.md §6).
  const actualizar = useCallback(
    async (id: string, cambios: Partial<NuevaDisponibilidad>): Promise<boolean> => {
      if (!accessToken) return false;
      setError(null);
      try {
        const actualizado = await disponibilidadApi.actualizarBloque(
          accessToken,
          id,
          cambios
        );
        setData((actual) => actual.map((b) => (b.id === id ? actualizado : b)));
        return true;
      } catch (err) {
        setError(mensajeError(err));
        return false;
      }
    },
    [accessToken]
  );

  const eliminar = useCallback(
    async (id: string): Promise<boolean> => {
      if (!accessToken) return false;
      setError(null);
      try {
        await disponibilidadApi.eliminarBloque(accessToken, id);
        setData((actual) => actual.filter((b) => b.id !== id));
        return true;
      } catch (err) {
        setError(mensajeError(err));
        return false;
      }
    },
    [accessToken]
  );

  return { data, loading, error, crear, actualizar, eliminar };
}
