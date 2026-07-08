import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuthProvider, useAuth } from "./AuthContext";

const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignOut = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();

// MOCK: Supabase Auth desactivado en este test (docs/conventions.md §8) —
// se mockea únicamente `supabaseClient`, AuthContext corre su lógica real
// contra un cliente Supabase falso.
jest.mock("../services/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
    },
  },
}));

function sesionFalsa() {
  return {
    user: {
      id: "user-1",
      email: "ana@ucr.ac.cr",
      user_metadata: { nombre: "Ana" },
    },
  };
}

function Probe() {
  const { session, usuario, loading, login, register, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="correo">{usuario?.correo ?? "sin-usuario"}</span>
      <span data-testid="session">{session ? "con-sesion" : "sin-sesion"}</span>
      <button type="button" onClick={() => void login("ana@ucr.ac.cr", "Test-Password-123!")}>
        entrar
      </button>
      <button
        type="button"
        onClick={() => void register("nueva@ucr.ac.cr", "Test-Password-123!", "Nueva Usuaria")}
      >
        registrarse
      </button>
      <button type="button" onClick={() => void logout()}>
        salir
      </button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockOnAuthStateChange.mockReset();
    mockSignOut.mockReset();
    mockSignInWithPassword.mockReset();
    mockSignUp.mockReset();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it("restaura la sesión existente al montar, vía getSession() (R11)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: sesionFalsa() } });

    await act(async () => {
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
    });

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("session")).toHaveTextContent("con-sesion");
    expect(screen.getByTestId("correo")).toHaveTextContent("ana@ucr.ac.cr");
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it("no exige un nuevo login cuando no hay sesión activa (R11)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await act(async () => {
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
    });

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("session")).toHaveTextContent("sin-sesion");
  });

  it("logout() cierra la sesión de Supabase Auth y limpia el estado (R12)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: sesionFalsa() } });
    mockSignOut.mockResolvedValue({ error: null });
    const user = userEvent.setup();

    await act(async () => {
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
    });

    await waitFor(() => expect(screen.getByTestId("session")).toHaveTextContent("con-sesion"));

    await user.click(screen.getByText("salir"));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId("session")).toHaveTextContent("sin-sesion"));
  });

  // T20 (progress/review_auth.md): cobertura débil de R9 que señaló el
  // reviewer — los tests previos solo verificaban que login()/register()
  // fueran llamados con los argumentos correctos (LoginForm.test.tsx,
  // RegisterForm.test.tsx), no que session/usuario del AuthContext
  // efectivamente pasaran a un valor truthy tras una respuesta exitosa de
  // Supabase Auth.
  it("login() con credenciales válidas deja session/usuario en un valor truthy (R9)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInWithPassword.mockResolvedValue({
      data: { session: sesionFalsa(), user: sesionFalsa().user },
      error: null,
    });
    const user = userEvent.setup();

    await act(async () => {
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
    });

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("session")).toHaveTextContent("sin-sesion");

    await user.click(screen.getByText("entrar"));

    expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId("session")).toHaveTextContent("con-sesion"));
    expect(screen.getByTestId("correo")).toHaveTextContent("ana@ucr.ac.cr");
  });

  it("register() con datos válidos deja session/usuario en un valor truthy (R9)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignUp.mockResolvedValue({
      data: { session: sesionFalsa(), user: sesionFalsa().user },
      error: null,
    });
    const user = userEvent.setup();

    await act(async () => {
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
    });

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("session")).toHaveTextContent("sin-sesion");

    await user.click(screen.getByText("registrarse"));

    expect(mockSignUp).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId("session")).toHaveTextContent("con-sesion"));
    expect(screen.getByTestId("correo")).toHaveTextContent("ana@ucr.ac.cr");
  });
});
