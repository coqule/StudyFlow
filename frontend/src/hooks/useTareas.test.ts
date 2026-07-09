import { act, renderHook, waitFor } from "@testing-library/react";

import { useTareas } from "./useTareas";
import type { Tarea } from "../types";

// MOCK: backend desactivado en este test (docs/conventions.md §8) —
// `tareasApi.ts` lee `import.meta.env.VITE_API_URL` (sintaxis ESM que
// `tsconfig.jest.json` con `module: commonjs` no puede transformar), así
// que se mockea el módulo completo (mismo mecanismo que `useCursos.test.ts`).
const mockListarTareas = jest.fn();
const mockActualizarTarea = jest.fn();
const mockEliminarTarea = jest.fn();

jest.mock("../services/tareasApi", () => ({
  listarTareas: (...args: unknown[]) => mockListarTareas(...args),
  crearTarea: jest.fn(),
  actualizarTarea: (...args: unknown[]) => mockActualizarTarea(...args),
  eliminarTarea: (...args: unknown[]) => mockEliminarTarea(...args),
}));

// MOCK: Supabase Auth desactivado en este test — `useTareas` solo necesita
// un `accessToken` estable de `useAuth()`; no hace falta un `AuthProvider`
// real ni Supabase, así que se mockea el hook directamente.
jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    session: { access_token: "token-de-prueba" },
  }),
}));

const tareaA: Tarea = {
  id: "1",
  curso_id: "curso-1",
  titulo: "Examen parcial",
  tipo: "examen",
  fecha_limite: "2099-01-01",
  duracion_estimada_h: 3,
  prioridad: 5,
  estado: "pendiente",
};

const tareaB: Tarea = {
  id: "2",
  curso_id: "curso-1",
  titulo: "Tarea de práctica",
  tipo: "tarea",
  fecha_limite: "2099-02-01",
  duracion_estimada_h: 1,
  prioridad: 2,
  estado: "pendiente",
};

describe("useTareas", () => {
  beforeEach(() => {
    mockListarTareas.mockReset();
    mockActualizarTarea.mockReset();
    mockEliminarTarea.mockReset();
  });

  it("actualizar() exitoso reemplaza en data la tarea correspondiente dejando el resto intacto (R23)", async () => {
    mockListarTareas.mockResolvedValue([tareaA, tareaB]);
    const tareaActualizada: Tarea = { ...tareaA, titulo: "Examen final", prioridad: 3 };
    mockActualizarTarea.mockResolvedValue(tareaActualizada);

    const { result } = renderHook(() => useTareas());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([tareaA, tareaB]);

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.actualizar("1", { titulo: "Examen final", prioridad: 3 });
    });

    expect(ok).toBe(true);
    expect(mockActualizarTarea).toHaveBeenCalledWith("token-de-prueba", "1", {
      titulo: "Examen final",
      prioridad: 3,
    });
    // La tarea "1" refleja los nuevos valores devueltos por la API; "2" no cambia.
    expect(result.current.data).toEqual([tareaActualizada, tareaB]);
  });

  it("eliminar() exitoso remueve de data la tarea correspondiente dejando el resto intacto (R30)", async () => {
    mockListarTareas.mockResolvedValue([tareaA, tareaB]);
    mockEliminarTarea.mockResolvedValue(undefined);

    const { result } = renderHook(() => useTareas());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([tareaA, tareaB]);

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.eliminar("1");
    });

    expect(ok).toBe(true);
    expect(mockEliminarTarea).toHaveBeenCalledWith("token-de-prueba", "1");
    expect(result.current.data).toEqual([tareaB]);
  });
});
