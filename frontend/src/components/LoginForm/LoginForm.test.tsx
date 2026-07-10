import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LoginForm } from "./LoginForm";

const mockLogin = jest.fn();
let mockError: string | null = null;

// MOCK: Supabase Auth desactivado en este test (docs/conventions.md §8) —
// se mockea el AuthContext completo: LoginForm nunca llama a Supabase real.
jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    error: mockError,
    loading: false,
  }),
}));

describe("<LoginForm />", () => {
  beforeEach(() => {
    mockLogin.mockClear();
    mockError = null;
  });

  it("llama a login() con correo y password al enviar el formulario con datos válidos (R8, R9)", async () => {
    const user = userEvent.setup();
    render(<LoginForm onNavigateToRegister={jest.fn()} />);

    await user.type(screen.getByLabelText("Correo"), "ana@ucr.ac.cr");
    await user.type(screen.getByLabelText("Contraseña"), "password123");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(mockLogin).toHaveBeenCalledWith("ana@ucr.ac.cr", "password123");
  });

  it("muestra el mensaje de error del AuthContext cuando Supabase Auth falla (R10)", () => {
    mockError = "Credenciales inválidas";
    render(<LoginForm onNavigateToRegister={jest.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Credenciales inválidas");
  });

  it("permite navegar a la pantalla de registro (R8)", async () => {
    const onNavigateToRegister = jest.fn();
    const user = userEvent.setup();
    render(<LoginForm onNavigateToRegister={onNavigateToRegister} />);

    await user.click(screen.getByText("¿No tienes cuenta? Regístrate"));

    expect(onNavigateToRegister).toHaveBeenCalledTimes(1);
  });
});
