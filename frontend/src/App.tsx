import { useState } from "react";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

type Pantalla = "login" | "register";

// Sin librería de routing (no hay react-router-dom instalado, ver
// specs/auth/design.md §3): un switch de estado local decide qué pantalla
// mostrar. Cubre R8 (login/registro navegables) y R9 (transición a la app
// autenticada cuando hay sesión).
function AppShell() {
  const { session, usuario, logout } = useAuth();
  const [pantalla, setPantalla] = useState<Pantalla>("login");

  if (!session) {
    return pantalla === "login" ? (
      <LoginPage onNavigateToRegister={() => setPantalla("register")} />
    ) : (
      <RegisterPage onNavigateToLogin={() => setPantalla("login")} />
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-white text-center">
      <h1 className="text-3xl font-semibold text-slate-900">StudyFlow</h1>
      <p className="text-slate-600">Hola, {usuario?.nombre || usuario?.correo}.</p>
      <button type="button" onClick={() => void logout()}>
        Cerrar sesión
      </button>
    </main>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
