import { useState } from "react";
import type { FormEvent } from "react";

import { useAuth } from "../../context/AuthContext";
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO, ERROR, ETIQUETA } from "../ui/clases";

interface RegisterFormProps {
  onNavigateToLogin: () => void;
}

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
    <div className="w-full max-w-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
      <div className="mb-md flex flex-col items-center gap-xs">
        <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-primary text-headline-sm text-on-primary">
          S
        </span>
        <h2 className="text-headline-md text-on-surface">Crear cuenta</h2>
        <p className="text-body-sm text-on-surface-variant">Regístrate para empezar a organizar tus estudios</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-sm">
        <div className="flex flex-col gap-xs">
          <label htmlFor="register-nombre" className={ETIQUETA}>Nombre</label>
          <input
            id="register-nombre"
            type="text"
            placeholder="Ej. Ana Pérez"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            className={CAMPO}
            required
          />
        </div>

        <div className="flex flex-col gap-xs">
          <label htmlFor="register-correo" className={ETIQUETA}>Correo</label>
          <input
            id="register-correo"
            type="email"
            placeholder="tu@correo.com"
            value={correo}
            onChange={(event) => setCorreo(event.target.value)}
            className={CAMPO}
            required
          />
        </div>

        <div className="flex flex-col gap-xs">
          <label htmlFor="register-password" className={ETIQUETA}>Contraseña</label>
          <input
            id="register-password"
            type="password"
            placeholder="Mín. 8 caracteres"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={CAMPO}
            required
          />
        </div>

        {error && <p role="alert" className={ERROR}>{error}</p>}

        <button type="submit" disabled={loading} className={`${BOTON_PRIMARIO} mt-xs w-full`}>
          {loading ? "Creando…" : "Crear cuenta"}
        </button>

        <button type="button" onClick={onNavigateToLogin} className={`${BOTON_SECUNDARIO} w-full`}>
          ¿Ya tienes cuenta? Inicia sesión
        </button>
      </form>
    </div>
  );
}
