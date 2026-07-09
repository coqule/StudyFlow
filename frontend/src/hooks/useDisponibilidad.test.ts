import { act, renderHook, waitFor } from "@testing-library/react";

import { useDisponibilidad } from "./useDisponibilidad";
import type { Disponibilidad } from "../types";

// MOCK: backend desactivado en este test (docs/conventions.md §8) —
// `disponibilidadApi.ts` lee `import.meta.env.VITE_API_URL` (sintaxis ESM que
// `tsconfig.jest.json` con `module: commonjs` no puede transformar), así que
// se mockea el módulo completo (mismo mecanismo que `useCursos.test.ts`).
const mockListar = jest.fn();
const mockCrear = jest.fn();
const mockActualizar = jest.fn();
const mockEliminar = jest.fn();

jest.mock("../services/disponibilidadApi", () => ({
  listarDisponibilidad: (...args: unknown[]) => mockListar(...args),
  crearBloque: (...args: unknown[]) => mockCrear(...args),
  actualizarBloque: (...args: unknown[]) => mockActualizar(...args),
  eliminarBloque: (...args: unknown[]) => mockEliminar(...args),
}));

// MOCK: Supabase Auth desactivado — `useDisponibilidad` solo necesita un
// `accessToken` estable de `useAuth()`.
jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    session: { access_token: "token-de-prueba" },
  }),
}));

const bloqueA: Disponibilidad = {
  id: "1",
  usuario_id: "u1",
  dia_semana: "lunes",
  hora_inicio: "08:00",
  hora_fin: "10:00",
};

const bloqueB: Disponibilidad = {
  id: "2",
  usuario_id: "u1",
  dia_semana: "martes",
  hora_inicio: "12:00",
  hora_fin: "14:00",
};

describe("useDisponibilidad", () => {
  beforeEach(() => {
    mockListar.mockReset();
    mockCrear.mockReset();
    mockActualizar.mockReset();
    mockEliminar.mockReset();
  });

  it("crear() con 409 deja el mensaje en error y no muta data (R19)", async () => {
    mockListar.mockResolvedValue([bloqueA]);
    mockCrear.mockRejectedValue(new Error("El bloque se solapa con otro del mismo día"));

    const { result } = renderHook(() => useDisponibilidad());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([bloqueA]);

    await act(async () => {
      await result.current.crear({
        dia_semana: "lunes",
        hora_inicio: "09:00",
        hora_fin: "11:00",
      });
    });

    expect(result.current.error).toMatch(/solapa/i);
    expect(result.current.data).toEqual([bloqueA]);
  });

  it("actualizar() exitoso reemplaza el bloque correspondiente en data dejando el resto intacto (R25)", async () => {
    mockListar.mockResolvedValue([bloqueA, bloqueB]);
    const actualizado: Disponibilidad = { ...bloqueA, hora_inicio: "14:00", hora_fin: "16:00" };
    mockActualizar.mockResolvedValue(actualizado);

    const { result } = renderHook(() => useDisponibilidad());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([bloqueA, bloqueB]);

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.actualizar("1", { hora_inicio: "14:00", hora_fin: "16:00" });
    });

    expect(ok).toBe(true);
    expect(mockActualizar).toHaveBeenCalledWith("token-de-prueba", "1", {
      hora_inicio: "14:00",
      hora_fin: "16:00",
    });
    expect(result.current.data).toEqual([actualizado, bloqueB]);
  });

  it("eliminar() exitoso remueve el bloque correspondiente de data dejando el resto intacto (R32)", async () => {
    mockListar.mockResolvedValue([bloqueA, bloqueB]);
    mockEliminar.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDisponibilidad());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([bloqueA, bloqueB]);

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.eliminar("1");
    });

    expect(ok).toBe(true);
    expect(mockEliminar).toHaveBeenCalledWith("token-de-prueba", "1");
    expect(result.current.data).toEqual([bloqueB]);
  });
});
