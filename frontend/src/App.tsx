import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { HomePage } from "./pages/HomePage";
import { PanelRegistroPage } from "./pages/PanelRegistroPage";
import { DisponibilidadPage } from "./pages/DisponibilidadPage";
import { HorariosPage } from "./pages/HorariosPage";
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
import { useHorarios } from "./hooks/useHorarios";

type Pantalla = "login" | "register";

// Sin librería de routing (no hay react-router-dom instalado, ver
// specs/auth/design.md §3): un switch de estado local decide qué pantalla
// mostrar. Cubre R8 (login/registro navegables) y R9 (transición a la app
// autenticada cuando hay sesión).
function AppShell() {
  const { session, usuario, logout } = useAuth();
  const [pantalla, setPantalla] = useState<Pantalla>("login");
  const navigate = useNavigate();
  const cursos = useCursos();
  const tareas = useTareas();
  // Instancia única de useDisponibilidad() en AppShell (design.md §6): ningún
  // componente hijo llama al hook por su cuenta — todos reciben sus funciones
  // por props para compartir el mismo estado que la grilla visible.
  const disponibilidad = useDisponibilidad();
  // Instancia única de useHorarios() en AppShell (specs/generar_ui/design.md
  // §4, R6): compartida entre AppLayout (botón "Generar horario") y la ruta
  // /horarios (grilla), mismo criterio que useDisponibilidad de arriba.
  const horarios = useHorarios();

  // «Generar horario» (feature 15, R1) puede pulsarse desde cualquier vista:
  // navega a /horarios y dispara la generación; useHorarios.generar() ya
  // trae su propio guard de concurrencia (R3).
  const onGenerarHorario = () => {
    navigate("/horarios");
    void horarios.generar();
  };

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
      onGenerarHorario={onGenerarHorario}
      generando={horarios.generando}
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/horarios"
          element={
            <HorariosPage
              data={horarios.data}
              loading={horarios.loading}
              generando={horarios.generando}
              error={horarios.error}
            />
          }
        />
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
