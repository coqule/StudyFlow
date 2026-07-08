import type { Session } from "@supabase/supabase-js";

// Representación mínima del usuario autenticado, derivada directamente de
// la sesión de Supabase Auth (id, email, user_metadata.nombre) — no de la
// tabla `usuarios` (el frontend no hace queries de datos a Supabase, ver
// docs/architecture.md §2). Distinta de la interface `Usuario` de
// `types/index.ts`, que sí mapea la tabla completa y la usan otras features
// que sí consultan datos vía el backend.
export interface AuthUsuario {
  id: string;
  correo: string;
  nombre: string;
}

export interface AuthState {
  session: Session | null;
  usuario: AuthUsuario | null;
  loading: boolean;
  error: string | null;
}

export interface LoginFormValues {
  correo: string;
  password: string;
}

export interface RegisterFormValues extends LoginFormValues {
  nombre: string;
}
