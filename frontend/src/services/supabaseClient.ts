import { createClient } from "@supabase/supabase-js";

// Único archivo del frontend que instancia el cliente de Supabase. Se usa
// exclusivamente para autenticación (getSession, signInWithPassword,
// signUp, signOut, onAuthStateChange) — nunca para leer o escribir datos de
// negocio (docs/architecture.md §2). Usa únicamente la anon key: la service
// role key nunca llega al frontend (docs/architecture.md §5).
//
// Variables de entorno leídas al inicio del módulo (docs/conventions.md §7).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
