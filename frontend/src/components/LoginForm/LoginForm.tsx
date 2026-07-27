import { useState } from "react";
import type { FormEvent } from "react";

import { useAuth } from "../../context/AuthContext";
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO, ERROR, ETIQUETA } from "../ui/clases";

interface LoginFormProps {
  onNavigateToRegister: () => void;
}

export function LoginForm({ onNavigateToRegister }: LoginFormProps) {
  const { login, error, loading } = useAuth();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await login(correo, password);
  };

  return (
    <div className="w-full max-w-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
      <div className="mb-md flex flex-col items-center gap-xs">
        <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-primary text-headline-sm text-on-primary">
          S
        </span>
        <h2 className="text-headline-md text-on-surface">Bienvenido</h2>
        <p className="text-body-sm text-on-surface-variant">Inicia sesión para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-sm">
        <div className="flex flex-col gap-xs">
          <label htmlFor="login-correo" className={ETIQUETA}>Correo</label>
          <input
            id="login-correo"
            type="email"
            placeholder="tu@correo.com"
            value={correo}
            onChange={(event) => setCorreo(event.target.value)}
            className={CAMPO}
            required
          />
        </div>

        <div className="flex flex-col gap-xs">
          <label htmlFor="login-password" className={ETIQUETA}>Contraseña</label>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={CAMPO}
            required
          />
        </div>

        {error && <p role="alert" className={ERROR}>{error}</p>}

        <button type="submit" disabled={loading} className={`${BOTON_PRIMARIO} mt-xs w-full`}>
          {loading ? "Ingresando…" : "Iniciar sesión"}
        </button>

        <button type="button" onClick={onNavigateToRegister} className={`${BOTON_SECUNDARIO} w-full`}>
          ¿No tienes cuenta? Regístrate
        </button>
      </form>
    </div>
  );
}
