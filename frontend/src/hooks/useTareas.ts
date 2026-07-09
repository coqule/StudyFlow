import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import * as tareasApi from "../services/tareasApi";
import type { NuevaTarea, Tarea } from "../types";

interface UseTareasResult {
  data: Tarea[];
  loading: boolean;
  error: string | null;
  crear: (datos: NuevaTarea) => Promise<void>;
  actualizar: (id: string, cambios: Partial<NuevaTarea>) => Promise<boolean>;
  eliminar: (id: string) => Promise<boolean>;
}

function mensajeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Ocurrió un error inesperado. Intenta de nuevo.";
}

// useTareas(): estado { data, loading, error } (docs/conventions.md §6
// frontend), mismo patrón que `useCursos.ts`. Obtiene el `accessToken` de
// `useAuth()` y solicita GET /api/tareas al montar — cubre R16 (lista
// inicial) y R17 (recargar la página vuelve a montar el árbol de React, por
// lo que este mismo efecto se vuelve a ejecutar y solicita los datos de
// nuevo). `crear`/`actualizar`/`eliminar` actualizan `data` localmente con
// la respuesta del backend, sin refetch completo.
export function useTareas(): UseTareasResult {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [data, setData] = useState<Tarea[]>([]);
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

    tareasApi
      .listarTareas(accessToken)
      .then((tareas) => {
        if (!activo) return;
        setData(tareas);
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

  const crear = useCallback(
    async (datos: NuevaTarea) => {
      if (!accessToken) return;
      setError(null);
      try {
        const tarea = await tareasApi.crearTarea(accessToken, datos);
        setData((actual) => [...actual, tarea]);
      } catch (err) {
        setError(mensajeError(err));
      }
    },
    [accessToken]
  );

  // actualizar()/eliminar() devuelven Promise<boolean> (true = éxito, false =
  // falló y ya dejó su mensaje en `error`) en vez de Promise<void>
  // (specs/tareas_crud/design.md §5, mismo contrato que `useCursos`) — el
  // llamador (TareaListItem) necesita saber si su propia operación tuvo
  // éxito para salir de modo edición (R23) o mostrar el error en su fila y
  // permanecer editable (R24).
  const actualizar = useCallback(
    async (id: string, cambios: Partial<NuevaTarea>): Promise<boolean> => {
      if (!accessToken) return false;
      setError(null);
      try {
        const tareaActualizada = await tareasApi.actualizarTarea(accessToken, id, cambios);
        setData((actual) => actual.map((t) => (t.id === id ? tareaActualizada : t)));
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
        await tareasApi.eliminarTarea(accessToken, id);
        setData((actual) => actual.filter((t) => t.id !== id));
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
