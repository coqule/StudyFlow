import { act, renderHook, waitFor } from "@testing-library/react";

import { useHorarios } from "./useHorarios";
import type { BloqueHorario } from "../types";

// MOCK: backend desactivado en este test (docs/conventions.md §8) —
// `horariosApi.ts` lee `import.meta.env.VITE_API_URL` (sintaxis ESM que
// `tsconfig.jest.json` con `module: commonjs` no puede transformar), así que
// se mockea el módulo completo (mismo mecanismo que `useDisponibilidad.test.ts`).
const mockListar = jest.fn();
const mockGenerar = jest.fn();

jest.mock("../services/horariosApi", () => ({
  listarHorarios: (...args: unknown[]) => mockListar(...args),
  generarHorario: (...args: unknown[]) => mockGenerar(...args),
}));

// MOCK: Supabase Auth desactivado — `useHorarios` solo necesita un
// `accessToken` estable de `useAuth()`.
jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    session: { access_token: "token-de-prueba" },
  }),
}));

const bloqueA: BloqueHorario = {
  id: "1",
  tarea_id: "t1",
  fecha: "2025-07-07",
  hora_inicio: "18:00",
  hora_fin: "21:00",
  generado_por_ia: true,
  justificacion: "Examen próximo",
};

const bloqueB: BloqueHorario = {
  id: "2",
  tarea_id: "t2",
  fecha: "2025-07-08",
  hora_inicio: "10:00",
  hora_fin: "12:00",
  generado_por_ia: true,
  justificacion: "Tarea con vencimiento cercano",
};

describe("useHorarios", () => {
  beforeEach(() => {
    mockListar.mockReset();
    mockGenerar.mockReset();
  });

  it("generar() dispara POST /api/horarios/generar y luego refresca con GET /api/horarios (R1, R4)", async () => {
    mockListar.mockResolvedValueOnce([]).mockResolvedValueOnce([bloqueA, bloqueB]);
    mockGenerar.mockResolvedValue(undefined);

    const { result } = renderHook(() => useHorarios());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([]);

    await act(async () => {
      await result.current.generar();
    });

    expect(mockGenerar).toHaveBeenCalledWith("token-de-prueba");
    expect(mockListar).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual([bloqueA, bloqueB]);
    expect(result.current.generando).toBe(false);
  });

  it("generando es true mientras la petición está en curso y false al terminar (R2)", async () => {
    mockListar.mockResolvedValue([]);
    let resolverGenerar!: () => void;
    mockGenerar.mockReturnValue(
      new Promise<void>((resolve) => {
        resolverGenerar = resolve;
      }),
    );

    const { result } = renderHook(() => useHorarios());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let promesaGenerar!: Promise<void>;
    act(() => {
      promesaGenerar = result.current.generar();
    });

    await waitFor(() => expect(result.current.generando).toBe(true));

    await act(async () => {
      resolverGenerar();
      await promesaGenerar;
    });

    expect(result.current.generando).toBe(false);
  });

  it("un segundo click mientras genera no dispara una segunda petición concurrente (R3)", async () => {
    mockListar.mockResolvedValue([]);
    let resolverGenerar!: () => void;
    mockGenerar.mockReturnValue(
      new Promise<void>((resolve) => {
        resolverGenerar = resolve;
      }),
    );

    const { result } = renderHook(() => useHorarios());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let primeraLlamada!: Promise<void>;
    act(() => {
      primeraLlamada = result.current.generar();
    });
    await waitFor(() => expect(result.current.generando).toBe(true));

    let segundaLlamada!: Promise<void>;
    await act(async () => {
      segundaLlamada = result.current.generar();
      await segundaLlamada;
    });

    expect(mockGenerar).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolverGenerar();
      await primeraLlamada;
    });
  });

  it("error 503 deja el mensaje en error y conserva los bloques anteriores sin vaciar data (R5)", async () => {
    mockListar.mockResolvedValueOnce([bloqueA]);
    mockGenerar.mockRejectedValue(new Error("IA no disponible"));

    const { result } = renderHook(() => useHorarios());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([bloqueA]);

    await act(async () => {
      await result.current.generar();
    });

    expect(result.current.error).toMatch(/no disponible/i);
    expect(result.current.data).toEqual([bloqueA]);
    expect(result.current.generando).toBe(false);
    // El refetch de éxito no debe dispararse tras un error.
    expect(mockListar).toHaveBeenCalledTimes(1);
  });
});
