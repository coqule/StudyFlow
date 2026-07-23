import { useState } from "react";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PanelRegistroPage } from "./pages/PanelRegistroPage";
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

  // Con sesión activa se muestra el Panel de Registro (pantalla "Registro
  // Unificado" del diseño). PanelRegistroPage solo compone: los hooks siguen
  // instanciados aquí y sus funciones bajan por props, tal como exige §6 —
  // no se introduce routing nuevo.
  return (
    <PanelRegistroPage
      nombreUsuario={usuario?.nombre || usuario?.correo || ""}
      onCerrarSesion={() => void logout()}
      seccionCursos={<CursoForm crear={cursos.crear} />}
      seccionTareas={<TareaForm crear={tareas.crear} cursos={cursos.data} />}
      seccionDisponibilidad={
        <div className="flex flex-col gap-md">
          <DisponibilidadForm crear={disponibilidad.crear} error={disponibilidad.error} />
          <DisponibilidadGrid
            bloques={disponibilidad.data}
            actualizar={disponibilidad.actualizar}
            eliminar={disponibilidad.eliminar}
            error={disponibilidad.error}
          />
        </div>
      }
      seccionResumen={
        <div className="flex flex-col gap-md">
          <CursoList
            cursos={cursos.data}
            actualizar={cursos.actualizar}
            eliminar={cursos.eliminar}
            error={cursos.error}
          />
          <TareaList
            tareas={tareas.data}
            cursos={cursos.data}
            actualizar={tareas.actualizar}
            eliminar={tareas.eliminar}
            error={tareas.error}
          />
        </div>
      }
    />
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
