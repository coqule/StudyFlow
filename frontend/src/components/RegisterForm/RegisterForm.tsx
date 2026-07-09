import { useState } from "react";
import type { FormEvent } from "react";

import { useAuth } from "../../context/AuthContext";

interface RegisterFormProps {
  onNavigateToLogin: () => void;
}

// RegisterForm consume useAuth() directamente, igual que LoginForm — llama
// a `register()` del AuthContext (specs/auth/design.md §3). Cubre R8.
export function RegisterForm({ onNavigateToLogin }: RegisterFormProps) {
  const { register, error, loading } = useAuth();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await register(correo, password, nombre);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="register-nombre">Nombre</label>
        <input
          id="register-nombre"
          type="text"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="register-correo">Correo</label>
        <input
          id="register-correo"
          type="email"
          value={correo}
          onChange={(event) => setCorreo(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="register-password">Contraseña</label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={loading}>
        Crear cuenta
      </button>
      <button type="button" onClick={onNavigateToLogin}>
        ¿Ya tienes cuenta? Inicia sesión
      </button>
    </form>
  );
}
