import { act, render, screen } from "@testing-library/react";
import App from "./App";

// MOCK: Supabase Auth desactivado en este test (docs/conventions.md §8) —
// App.tsx monta AuthProvider, que llama a supabaseClient en tiempo real al
// montar (getSession/onAuthStateChange). Este test de humo solo verifica
// que App renderiza sin sesión, no necesita Supabase real.
jest.mock("./services/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}));

// MOCK: backend desactivado en este test (docs/conventions.md §8) —
// `cursosApi.ts` lee `import.meta.env.VITE_API_URL` (sintaxis ESM que el
// `tsconfig.jest.json` con `module: commonjs` no puede transformar), y este
// test de humo no ejercita ningún flujo autenticado que la necesite (sin
// sesión, `useCursos` nunca llama a `cursosApi`). Se mockea el módulo
// completo para que ts-jest nunca intente transformar el archivo real
// (mismo mecanismo que el mock de `supabaseClient` de arriba).
jest.mock("./services/cursosApi", () => ({
  listarCursos: jest.fn().mockResolvedValue([]),
  crearCurso: jest.fn(),
  actualizarCurso: jest.fn(),
  eliminarCurso: jest.fn(),
}));

// MOCK: backend desactivado en este test (docs/conventions.md §8) —
// `tareasApi.ts` lee `import.meta.env.VITE_API_URL`, mismo motivo que el
// mock de `cursosApi` de arriba (specs/tareas_crud/design.md §5).
jest.mock("./services/tareasApi", () => ({
  listarTareas: jest.fn().mockResolvedValue([]),
  crearTarea: jest.fn(),
  actualizarTarea: jest.fn(),
  eliminarTarea: jest.fn(),
}));

// MOCK: backend desactivado — `disponibilidadApi.ts` también usa
// `import.meta.env` (ESM que `tsconfig.jest.json` no transforma). Se mockea
// por el mismo motivo que `cursosApi` (mismo mecanismo).
jest.mock("./services/disponibilidadApi", () => ({
  listarDisponibilidad: jest.fn().mockResolvedValue([]),
  crearBloque: jest.fn(),
  actualizarBloque: jest.fn(),
  eliminarBloque: jest.fn(),
}));

// MOCK: backend desactivado — `horariosApi.ts` también usa `import.meta.env`
// (ESM que `tsconfig.jest.json` no transforma). Se mockea por el mismo motivo
// que `cursosApi` (feature 14, GET /api/horarios; feature 15,
// POST /api/horarios/generar).
jest.mock("./services/horariosApi", () => ({
  listarHorarios: jest.fn().mockResolvedValue([]),
  generarHorario: jest.fn().mockResolvedValue(undefined),
}));

describe("<App />", () => {
  it("renderiza sin lanzar excepción y muestra 'StudyFlow' en el DOM", async () => {
    // AuthProvider resuelve `getSession()` de forma asíncrona al montar —
    // se espera esa resolución dentro de act() para evitar actualizaciones
    // de estado fuera de act (ver AuthContext.tsx `useEffect`).
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText("StudyFlow")).toBeInTheDocument();
  });
});
