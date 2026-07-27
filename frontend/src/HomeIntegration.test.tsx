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

// MOCK: backend desactivado en este test (docs/conventions.md §8), mismo
// motivo que CursosIntegration.test.tsx — `import.meta.env` no lo transforma
// tsconfig.jest.json.
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

// MOCK: backend desactivado — `horariosApi.ts` también usa `import.meta.env`
// (feature 14; feature 15 agrega `generarHorario`). Mismo motivo que el resto
// de los api.
jest.mock("./services/horariosApi", () => ({
  listarHorarios: jest.fn().mockResolvedValue([]),
  generarHorario: jest.fn().mockResolvedValue(undefined),
}));

describe("Integración HomePage dentro de App", () => {
  it("con sesión activa y sin ruta previa, la raíz muestra HomePage", async () => {
    window.history.pushState({}, "", "/");

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByRole("heading", { name: "Bienvenido a StudyFlow" })).toBeInTheDocument();
  });

  it("una ruta desconocida cae en HomePage vía el catch-all", async () => {
    window.history.pushState({}, "", "/una-ruta-que-no-existe");

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByRole("heading", { name: "Bienvenido a StudyFlow" })).toBeInTheDocument();
  });

  it("el link 'Inicio' del menú navega de vuelta a HomePage tras visitar Cursos", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/cursos");

    await act(async () => {
      render(<App />);
    });

    expect(
      screen.queryByRole("heading", { name: "Bienvenido a StudyFlow" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Inicio" }));

    expect(screen.getByRole("heading", { name: "Bienvenido a StudyFlow" })).toBeInTheDocument();
  });
});
