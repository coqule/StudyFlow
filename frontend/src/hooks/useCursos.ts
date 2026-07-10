import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import * as cursosApi from "../services/cursosApi";
import type { Curso, NuevoCurso } from "../types";

interface UseCursosResult {
  data: Curso[];
  loading: boolean;
  error: string | null;
  crear: (datos: NuevoCurso) => Promise<void>;
  actualizar: (id: string, cambios: Partial<NuevoCurso>) => Promise<boolean>;
  eliminar: (id: string) => Promise<boolean>;
}

function mensajeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Ocurrió un error inesperado. Intenta de nuevo.";
}

// useCursos(): estado { data, loading, error } (docs/conventions.md §6
// frontend). Obtiene el `accessToken` de `useAuth()` (specs/cursos_crud/
// design.md §4) y solicita GET /api/cursos al montar — cubre R15 (lista
// inicial) y R16 (recargar la página vuelve a montar el árbol de React, por
// lo que este mismo efecto se vuelve a ejecutar y solicita los datos de
// nuevo). `crear`/`actualizar`/`eliminar` actualizan `data` localmente con
// la respuesta del backend, sin refetch completo.
export function useCursos(): UseCursosResult {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [data, setData] = useState<Curso[]>([]);
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

    cursosApi
      .listarCursos(accessToken)
      .then((cursos) => {
        if (!activo) return;
        setData(cursos);
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
    async (datos: NuevoCurso) => {
      if (!accessToken) return;
      setError(null);
      try {
        const curso = await cursosApi.crearCurso(accessToken, datos);
        setData((actual) => [...actual, curso]);
      } catch (err) {
        setError(mensajeError(err));
      }
    },
    [accessToken]
  );

  // actualizar()/eliminar() devuelven Promise<boolean> (true = éxito, false =
  // falló y ya dejó su mensaje en `error`) en vez de Promise<void>
  // (specs/cursos_crud/design.md §7.5) — el llamador (CursoListItem) necesita
  // saber si su propia operación tuvo éxito para salir de modo edición
  // (R21/R28) o mostrar el error en su fila y permanecer editable (R22/R29),
  // sin recurrir a un mecanismo de correlación indirecto vía useEffect.
  const actualizar = useCallback(
    async (id: string, cambios: Partial<NuevoCurso>): Promise<boolean> => {
      if (!accessToken) return false;
      setError(null);
      try {
        const cursoActualizado = await cursosApi.actualizarCurso(accessToken, id, cambios);
        setData((actual) => actual.map((c) => (c.id === id ? cursoActualizado : c)));
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
        await cursosApi.eliminarCurso(accessToken, id);
        setData((actual) => actual.filter((c) => c.id !== id));
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
