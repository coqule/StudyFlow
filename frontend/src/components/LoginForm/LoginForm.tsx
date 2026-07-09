import { useState } from "react";
import type { FormEvent } from "react";

import { useAuth } from "../../context/AuthContext";

interface LoginFormProps {
  onNavigateToRegister: () => void;
}

// LoginForm consume useAuth() directamente (no recibe onSubmit por props):
// llama a `login()` del AuthContext, que a su vez llama al SDK de Supabase
// (specs/auth/design.md §3). Cubre R8 (pantalla de login) junto con
// RegisterForm/LoginPage/RegisterPage.
export function LoginForm({ onNavigateToRegister }: LoginFormProps) {
  const { login, error, loading } = useAuth();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await login(correo, password);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="login-correo">Correo</label>
        <input
          id="login-correo"
          type="email"
          value={correo}
          onChange={(event) => setCorreo(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="login-password">Contraseña</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={loading}>
        Iniciar sesión
      </button>
      <button type="button" onClick={onNavigateToRegister}>
        ¿No tienes cuenta? Regístrate
      </button>
    </form>
  );
}
