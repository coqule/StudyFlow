import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { HomePage } from "./pages/HomePage";
import { PanelRegistroPage } from "./pages/PanelRegistroPage";
import { DisponibilidadPage } from "./pages/DisponibilidadPage";
import { AppLayout } from "./components/ui/AppLayout";
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
  const [pedirFocoTarea, setPedirFocoTarea] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const cursos = useCursos();
  const tareas = useTareas();
  // Instancia única de useDisponibilidad() en AppShell (design.md §6): ningún
  // componente hijo llama al hook por su cuenta — todos reciben sus funciones
  // por props para compartir el mismo estado que la grilla visible.
  const disponibilidad = useDisponibilidad();

  // «Nueva tarea» puede pulsarse desde cualquier vista: primero navega al
  // panel (donde vive el formulario) y recién cuando el campo está montado se
  // le lleva el foco. Por eso el foco espera a un efecto y no se hace en el
  // mismo clic.
  useEffect(() => {
    if (!pedirFocoTarea || location.pathname !== "/cursos") return;
    const campo = document.getElementById("tarea-titulo");
    campo?.scrollIntoView({ behavior: "smooth", block: "center" });
    campo?.focus({ preventScroll: true });
    setPedirFocoTarea(false);
  }, [pedirFocoTarea, location.pathname]);

  if (!session) {
    return pantalla === "login" ? (
      <LoginPage onNavigateToRegister={() => setPantalla("register")} />
    ) : (
      <RegisterPage onNavigateToLogin={() => setPantalla("login")} />
    );
  }

  return (
    <AppLayout
      nombreUsuario={usuario?.nombre || usuario?.correo || ""}
      onCerrarSesion={() => void logout()}
      onNuevaTarea={() => {
        navigate("/cursos");
        setPedirFocoTarea(true);
      }}
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/cursos"
          element={
            <PanelRegistroPage
              seccionCursos={<CursoForm crear={cursos.crear} />}
              seccionTareas={<TareaForm crear={tareas.crear} cursos={cursos.data} />}
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
          }
        />
        <Route
          path="/disponibilidad"
          element={
            <DisponibilidadPage>
              <div className="flex flex-col gap-md">
                <DisponibilidadForm crear={disponibilidad.crear} error={disponibilidad.error} />
                <DisponibilidadGrid
                  bloques={disponibilidad.data}
                  actualizar={disponibilidad.actualizar}
                  eliminar={disponibilidad.eliminar}
                  error={disponibilidad.error}
                />
              </div>
            </DisponibilidadPage>
          }
        />
        {/* Cualquier ruta desconocida cae a la página principal. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
