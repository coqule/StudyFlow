import { act, renderHook, waitFor } from "@testing-library/react";

import { useHorarios } from "./useHorarios";
import type { BloqueHorario } from "../types";

// MOCK: backend desactivado en este test (docs/conventions.md §8) —
// `horariosApi.ts` lee `import.meta.env.VITE_API_URL` (sintaxis ESM que
// `tsconfig.jest.json` con `module: commonjs` no puede transformar), así que
// se mockea el módulo completo (mismo mecanismo que `useDisponibilidad.test.ts`).
const mockListar = jest.fn();
const mockGenerar = jest.fn();
const mockAjustar = jest.fn();

jest.mock("../services/horariosApi", () => ({
  listarHorarios: (...args: unknown[]) => mockListar(...args),
  generarHorario: (...args: unknown[]) => mockGenerar(...args),
  ajustarHorario: (...args: unknown[]) => mockAjustar(...args),
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
    mockAjustar.mockReset();
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

  it("ajustar(instruccion) dispara POST /api/horarios/ajustar y luego refresca con GET /api/horarios (feature 16)", async () => {
    mockListar.mockResolvedValueOnce([bloqueA]).mockResolvedValueOnce([bloqueA, bloqueB]);
    mockAjustar.mockResolvedValue(undefined);

    const { result } = renderHook(() => useHorarios());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.ajustar("el examen de Cálculo II se adelantó para mañana");
    });

    expect(mockAjustar).toHaveBeenCalledWith(
      "token-de-prueba",
      "el examen de Cálculo II se adelantó para mañana",
    );
    expect(mockListar).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual([bloqueA, bloqueB]);
    expect(result.current.ajustando).toBe(false);
  });

  it("ajustando es true mientras la petición está en curso y false al terminar", async () => {
    mockListar.mockResolvedValue([]);
    let resolverAjustar!: () => void;
    mockAjustar.mockReturnValue(
      new Promise<void>((resolve) => {
        resolverAjustar = resolve;
      }),
    );

    const { result } = renderHook(() => useHorarios());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let promesaAjustar!: Promise<void>;
    act(() => {
      promesaAjustar = result.current.ajustar("instrucción");
    });

    await waitFor(() => expect(result.current.ajustando).toBe(true));

    await act(async () => {
      resolverAjustar();
      await promesaAjustar;
    });

    expect(result.current.ajustando).toBe(false);
  });

  it("un segundo envío mientras ajusta no dispara una segunda petición concurrente", async () => {
    mockListar.mockResolvedValue([]);
    let resolverAjustar!: () => void;
    mockAjustar.mockReturnValue(
      new Promise<void>((resolve) => {
        resolverAjustar = resolve;
      }),
    );

    const { result } = renderHook(() => useHorarios());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let primeraLlamada!: Promise<void>;
    act(() => {
      primeraLlamada = result.current.ajustar("primera instrucción");
    });
    await waitFor(() => expect(result.current.ajustando).toBe(true));

    await act(async () => {
      await result.current.ajustar("segunda instrucción");
    });

    expect(mockAjustar).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolverAjustar();
      await primeraLlamada;
    });
  });

  it("si el backend falla, deja el mensaje en error y el calendario conserva los bloques anteriores", async () => {
    mockListar.mockResolvedValueOnce([bloqueA]);
    mockAjustar.mockRejectedValue(new Error("IA no disponible"));

    const { result } = renderHook(() => useHorarios());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([bloqueA]);

    await act(async () => {
      await result.current.ajustar("instrucción");
    });

    expect(result.current.error).toMatch(/no disponible/i);
    expect(result.current.data).toEqual([bloqueA]);
    expect(result.current.ajustando).toBe(false);
    // El refetch de éxito no debe dispararse tras un error.
    expect(mockListar).toHaveBeenCalledTimes(1);
  });

  // generar() y ajustar() terminan en el mismo setData(bloques) de un
  // refetch propio e independiente: sin bloqueo cruzado, disparar ambos a
  // la vez haría que el que resuelve último pise en silencio el resultado
  // del otro (bug encontrado en la revisión de reliability de la feature 16).
  it("ajustar() no dispara mientras generar() está en curso (bloqueo cruzado)", async () => {
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
      await result.current.ajustar("instrucción durante generar()");
    });

    expect(mockAjustar).not.toHaveBeenCalled();
    expect(result.current.ajustando).toBe(false);

    await act(async () => {
      resolverGenerar();
      await promesaGenerar;
    });
  });

  it("generar() no dispara mientras ajustar() está en curso (bloqueo cruzado)", async () => {
    mockListar.mockResolvedValue([]);
    let resolverAjustar!: () => void;
    mockAjustar.mockReturnValue(
      new Promise<void>((resolve) => {
        resolverAjustar = resolve;
      }),
    );

    const { result } = renderHook(() => useHorarios());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let promesaAjustar!: Promise<void>;
    act(() => {
      promesaAjustar = result.current.ajustar("instrucción");
    });
    await waitFor(() => expect(result.current.ajustando).toBe(true));

    await act(async () => {
      await result.current.generar();
    });

    expect(mockGenerar).not.toHaveBeenCalled();
    expect(result.current.generando).toBe(false);

    await act(async () => {
      resolverAjustar();
      await promesaAjustar;
    });
  });
});
