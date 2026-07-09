import { useState } from "react";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { CursoForm } from "./components/CursoForm/CursoForm";
import { CursoList } from "./components/CursoList/CursoList";
import { TareaForm } from "./components/TareaForm/TareaForm";
import { TareaList } from "./components/TareaList/TareaList";
import { DisponibilidadForm } from "./components/DisponibilidadForm/DisponibilidadForm";
import { DisponibilidadGrid } from "./components/DisponibilidadGrid/DisponibilidadGrid";
import { useCursos } from "./hooks/useCursos";
import { useTareas } from "./hooks/useTareas";
import { useDisponibilidad } from "./hooks/useDisponibilidad";

type Pantalla = "login" | "register";

// Sin librería de routing (no hay react-router-dom instalado, ver
// specs/auth/design.md §3): un switch de estado local decide qué pantalla
// mostrar. Cubre R8 (login/registro navegables) y R9 (transición a la app
// autenticada cuando hay sesión).
function AppShell() {
  const { session, usuario, logout } = useAuth();
  const [pantalla, setPantalla] = useState<Pantalla>("login");
  const cursos = useCursos();
  const tareas = useTareas();
  // Instancia única de useDisponibilidad() en AppShell (design.md §6): ningún
  // componente hijo llama al hook por su cuenta — todos reciben sus funciones
  // por props para compartir el mismo estado que la grilla visible.
  const disponibilidad = useDisponibilidad();

  if (!session) {
    return pantalla === "login" ? (
      <LoginPage onNavigateToRegister={() => setPantalla("register")} />
    ) : (
      <RegisterPage onNavigateToLogin={() => setPantalla("login")} />
    );
  }

  // Con sesión activa se reemplaza el placeholder por el formulario y la
  // lista de cursos (specs/cursos_crud/design.md §4, R12, R15). Cambio
  // mínimo — no se introduce routing nuevo.
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-white p-6 text-center">
      <h1 className="text-3xl font-semibold text-slate-900">StudyFlow</h1>
      <p className="text-slate-600">Hola, {usuario?.nombre || usuario?.correo}.</p>
      <button type="button" onClick={() => void logout()}>
        Cerrar sesión
      </button>
      <CursoForm crear={cursos.crear} />
      <CursoList
        cursos={cursos.data}
        actualizar={cursos.actualizar}
        eliminar={cursos.eliminar}
        error={cursos.error}
      />
      <TareaForm crear={tareas.crear} cursos={cursos.data} />
      <TareaList
        tareas={tareas.data}
        cursos={cursos.data}
        actualizar={tareas.actualizar}
        eliminar={tareas.eliminar}
        error={tareas.error}
      />
      <DisponibilidadForm crear={disponibilidad.crear} error={disponibilidad.error} />
      <DisponibilidadGrid
        bloques={disponibilidad.data}
        actualizar={disponibilidad.actualizar}
        eliminar={disponibilidad.eliminar}
        error={disponibilidad.error}
      />
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
