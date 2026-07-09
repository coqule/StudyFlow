import { act, renderHook, waitFor } from "@testing-library/react";

import { useCursos } from "./useCursos";
import type { Curso } from "../types";

// MOCK: backend desactivado en este test (docs/conventions.md §8) —
// `cursosApi.ts` lee `import.meta.env.VITE_API_URL` (sintaxis ESM que
// `tsconfig.jest.json` con `module: commonjs` no puede transformar), así
// que se mockea el módulo completo (mismo mecanismo que `App.test.tsx` /
// `CursosIntegration.test.tsx`).
const mockListarCursos = jest.fn();
const mockActualizarCurso = jest.fn();
const mockEliminarCurso = jest.fn();

jest.mock("../services/cursosApi", () => ({
  listarCursos: (...args: unknown[]) => mockListarCursos(...args),
  crearCurso: jest.fn(),
  actualizarCurso: (...args: unknown[]) => mockActualizarCurso(...args),
  eliminarCurso: (...args: unknown[]) => mockEliminarCurso(...args),
}));

// MOCK: Supabase Auth desactivado en este test — `useCursos` solo necesita
// un `accessToken` estable de `useAuth()`; no hace falta un `AuthProvider`
// real ni Supabase, así que se mockea el hook directamente.
jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    session: { access_token: "token-de-prueba" },
  }),
}));

const cursoA: Curso = {
  id: "1",
  usuario_id: "u1",
  nombre: "Cálculo II",
  color: "#3B82F6",
  dificultad: 5,
};

const cursoB: Curso = {
  id: "2",
  usuario_id: "u1",
  nombre: "Programación I",
  color: "#10B981",
  dificultad: 2,
};

// Este archivo cierra el gap de trazabilidad de la ronda 2 del reviewer
// (progress/review_cursos_crud.md): R21 (cláusula "reflejar los nuevos
// valores del curso en la lista visible") y R28 ("remover el curso de la
// lista visible") ocurren dentro de `useCursos.ts` (`setData(...)`), que
// hasta ahora no tenía ningún test propio — `CursoListItem.test.tsx` solo
// confirma que se invoca `actualizar()`/`eliminar()`, nunca que `data` del
// hook cambie como resultado.
describe("useCursos", () => {
  beforeEach(() => {
    mockListarCursos.mockReset();
    mockActualizarCurso.mockReset();
    mockEliminarCurso.mockReset();
  });

  it("actualizar() exitoso reemplaza el curso correspondiente en data con el objeto devuelto por la API (R21)", async () => {
    mockListarCursos.mockResolvedValue([cursoA, cursoB]);
    const cursoActualizado: Curso = { ...cursoA, nombre: "Cálculo III", dificultad: 3 };
    mockActualizarCurso.mockResolvedValue(cursoActualizado);

    const { result } = renderHook(() => useCursos());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([cursoA, cursoB]);

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.actualizar("1", { nombre: "Cálculo III", dificultad: 3 });
    });

    expect(ok).toBe(true);
    expect(mockActualizarCurso).toHaveBeenCalledWith("token-de-prueba", "1", {
      nombre: "Cálculo III",
      dificultad: 3,
    });
    // El curso "1" refleja los nuevos valores devueltos por la API; "2" no cambia.
    expect(result.current.data).toEqual([cursoActualizado, cursoB]);
  });

  it("eliminar() exitoso remueve el curso correspondiente de data (R28)", async () => {
    mockListarCursos.mockResolvedValue([cursoA, cursoB]);
    mockEliminarCurso.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCursos());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([cursoA, cursoB]);

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.eliminar("1");
    });

    expect(ok).toBe(true);
    expect(mockEliminarCurso).toHaveBeenCalledWith("token-de-prueba", "1");
    expect(result.current.data).toEqual([cursoB]);
  });
});
