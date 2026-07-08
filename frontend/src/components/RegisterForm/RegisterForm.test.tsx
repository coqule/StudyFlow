import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RegisterForm } from "./RegisterForm";

const mockRegister = jest.fn();
let mockError: string | null = null;

// MOCK: Supabase Auth desactivado en este test (docs/conventions.md §8) —
// se mockea el AuthContext completo: RegisterForm nunca llama a Supabase real.
jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    register: mockRegister,
    error: mockError,
    loading: false,
  }),
}));

describe("<RegisterForm />", () => {
  beforeEach(() => {
    mockRegister.mockClear();
    mockError = null;
  });

  it("llama a register() con correo, password y nombre al enviar datos válidos (R8, R9)", async () => {
    const user = userEvent.setup();
    render(<RegisterForm onNavigateToLogin={jest.fn()} />);

    await user.type(screen.getByLabelText("Nombre"), "Ana Pérez");
    await user.type(screen.getByLabelText("Correo"), "ana@ucr.ac.cr");
    await user.type(screen.getByLabelText("Contraseña"), "password123");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(mockRegister).toHaveBeenCalledWith("ana@ucr.ac.cr", "password123", "Ana Pérez");
  });

  it("muestra el mensaje de error del AuthContext cuando Supabase Auth falla (R10)", () => {
    mockError = "El correo ya está registrado";
    render(<RegisterForm onNavigateToLogin={jest.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("El correo ya está registrado");
  });

  it("permite navegar a la pantalla de login (R8)", async () => {
    const onNavigateToLogin = jest.fn();
    const user = userEvent.setup();
    render(<RegisterForm onNavigateToLogin={onNavigateToLogin} />);

    await user.click(screen.getByText("¿Ya tienes cuenta? Inicia sesión"));

    expect(onNavigateToLogin).toHaveBeenCalledTimes(1);
  });
});
