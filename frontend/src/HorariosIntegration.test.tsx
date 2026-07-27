import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

// MOCK: Supabase Auth desactivado en este test (docs/conventions.md §8) —
// se simula una sesión ya activa, mismo mecanismo que CursosIntegration.test.tsx.
jest.mock("./services/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: "token-de-prueba",
            user: { id: "u1", email: "ana@ucr.ac.cr", user_metadata: { nombre: "Ana" } },
          },
        },
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      signOut: jest.fn(),
    },
  },
}));

jest.mock("./services/cursosApi", () => ({
  listarCursos: jest.fn().mockResolvedValue([]),
  crearCurso: jest.fn(),
  actualizarCurso: jest.fn(),
  eliminarCurso: jest.fn(),
}));

jest.mock("./services/tareasApi", () => ({
  listarTareas: jest.fn().mockResolvedValue([]),
  crearTarea: jest.fn(),
  actualizarTarea: jest.fn(),
  eliminarTarea: jest.fn(),
}));

jest.mock("./services/disponibilidadApi", () => ({
  listarDisponibilidad: jest.fn().mockResolvedValue([]),
  crearBloque: jest.fn(),
  actualizarBloque: jest.fn(),
  eliminarBloque: jest.fn(),
}));

const mockGenerarHorario = jest.fn().mockResolvedValue(undefined);
const mockListarHorarios = jest.fn().mockResolvedValue([]);

// MOCK: backend desactivado — `horariosApi.ts` usa `import.meta.env`, mismo
// motivo que el resto de los api. Se capturan las llamadas con funciones
// dedicadas (en vez de `jest.fn()` inline) para poder aserta contra el mismo
// mock importado indirectamente por `useHorarios` dentro de `App`.
jest.mock("./services/horariosApi", () => ({
  listarHorarios: (...args: unknown[]) => mockListarHorarios(...args),
  generarHorario: (...args: unknown[]) => mockGenerarHorario(...args),
}));

// Cubre R1: el click en "Generar horario" (barra lateral, disponible desde
// cualquier ruta) navega a /horarios (si no se está ya ahí) y dispara
// POST /api/horarios/generar. `useHorarios.test.ts` solo prueba `generar()`
// en aislamiento; este test ejercita el handler real `onGenerarHorario` de
// `App.tsx`, que es quien hace la navegación.
describe("Integración «Generar horario» -> navega a /horarios (R1)", () => {
  beforeEach(() => {
    mockGenerarHorario.mockClear();
    mockListarHorarios.mockClear();
  });

  it("desde /cursos, el click en «Generar horario» navega a /horarios y dispara el POST", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/cursos");

    await act(async () => {
      render(<App />);
    });

    expect(screen.queryByRole("heading", { name: "Calendario semanal" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Generar horario" }));

    expect(await screen.findByRole("heading", { name: "Calendario semanal" })).toBeInTheDocument();
    expect(mockGenerarHorario).toHaveBeenCalledWith("token-de-prueba");
  });

  it("ya estando en /horarios, el click en «Generar horario» dispara el POST sin cambiar de vista", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/horarios");

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByRole("heading", { name: "Calendario semanal" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Generar horario" }));

    expect(screen.getByRole("heading", { name: "Calendario semanal" })).toBeInTheDocument();
    expect(mockGenerarHorario).toHaveBeenCalledWith("token-de-prueba");
  });
});
