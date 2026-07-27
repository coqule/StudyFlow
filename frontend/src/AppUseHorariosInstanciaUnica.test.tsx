import { act, render, screen, waitFor } from "@testing-library/react";
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

let resolverGenerar!: () => void;
const mockGenerarHorario = jest.fn(
  (..._args: unknown[]) =>
    new Promise<void>((resolve) => {
      resolverGenerar = resolve;
    }),
);
const mockListarHorarios = jest.fn().mockResolvedValue([]);

// No se mockea el hook (a diferencia de otros tests): esta prueba usa el
// `useHorarios` real precisamente para comprobar que AppLayout y
// HorariosPage observan el MISMO estado `generando`, lo cual solo es
// verdad si ambos reciben las props de una única instancia del hook
// instanciada en AppShell (R6). Contar cuántas veces se invoca un hook
// mockeado no distingue "una sola instanciación" de "varios re-renders de
// la misma instancia" (un componente se re-renderiza varias veces por los
// efectos async de useCursos/useTareas/useDisponibilidad), así que se
// verifica el comportamiento observable en vez del conteo de llamadas.
jest.mock("./services/horariosApi", () => ({
  listarHorarios: (...args: unknown[]) => mockListarHorarios(...args),
  generarHorario: (...args: unknown[]) => mockGenerarHorario(...args),
}));

describe("Instancia única de useHorarios compartida entre AppLayout y /horarios (R6)", () => {
  beforeEach(() => {
    mockGenerarHorario.mockClear();
    mockListarHorarios.mockClear();
  });

  it("el botón «Generar horario» y el overlay de /horarios reflejan el mismo estado generando", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/horarios");

    await act(async () => {
      render(<App />);
    });

    const boton = screen.getByRole("button", { name: "Generar horario" });
    expect(boton).not.toBeDisabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await user.click(boton);

    // Si AppLayout y HorariosPage tuvieran cada uno su propia instancia de
    // useHorarios(), sería posible que el botón se deshabilitara sin que el
    // overlay apareciera (o viceversa). Que ambos cambien juntos solo se
    // explica si comparten el mismo `generando` de una única instancia.
    await waitFor(() => expect(boton).toBeDisabled());
    expect(boton).toHaveAttribute("aria-busy", "true");
    expect(await screen.findByRole("status")).toHaveTextContent(/Generando horario/);

    await act(async () => {
      resolverGenerar();
    });

    await waitFor(() => expect(boton).not.toBeDisabled());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
