import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../services/supabaseClient";
import type { AuthUsuario } from "../types/Auth.types";

interface AuthContextValue {
  session: Session | null;
  usuario: AuthUsuario | null;
  loading: boolean;
  error: string | null;
  login: (correo: string, password: string) => Promise<void>;
  register: (correo: string, password: string, nombre: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function usuarioDeSesion(session: Session | null): AuthUsuario | null {
  if (!session?.user) return null;
  const metadata = session.user.user_metadata as { nombre?: string } | undefined;
  return {
    id: session.user.id,
    correo: session.user.email ?? "",
    nombre: metadata?.nombre ?? "",
  };
}

function mensajeError(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Ocurrió un error inesperado. Intenta de nuevo.";
}

interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider: única fuente de la sesión de Supabase Auth para toda la
// app. `login`/`register`/`logout` llaman al SDK de Supabase directamente
// (specs/auth/design.md §1) y nunca lanzan — los errores se capturan y se
// guardan en `error` (R10) en vez de propagarse como excepción no
// controlada.
export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    // Restaura la sesión existente al montar (R11).
    supabase.auth.getSession().then(({ data }) => {
      if (!activo) return;
      setSession(data.session);
      setLoading(false);
    });

    // Mantiene la sesión sincronizada ante login/logout/refresh de token en
    // cualquier parte de la app.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setSession(nuevaSesion);
    });

    return () => {
      activo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (correo: string, password: string) => {
    setError(null);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: correo,
      password,
    });

    if (loginError) {
      setError(mensajeError(loginError));
      return;
    }

    setSession(data.session);
  };

  const register = async (correo: string, password: string, nombre: string) => {
    setError(null);
    const { data, error: registerError } = await supabase.auth.signUp({
      email: correo,
      password,
      options: { data: { nombre } },
    });

    if (registerError) {
      setError(mensajeError(registerError));
      return;
    }

    setSession(data.session);
  };

  const logout = async () => {
    setError(null);
    await supabase.auth.signOut();
    setSession(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      usuario: usuarioDeSesion(session),
      loading,
      error,
      login,
      register,
      logout,
    }),
    // login/register/logout no leen `session` por closure (solo usan los
    // setters, que son estables) — no hace falta incluirlos en deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
