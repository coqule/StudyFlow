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

function AppShell() {
  const { session, usuario, logout } = useAuth();
  const navigate = useNavigate();
  const cursos = useCursos();
  const tareas = useTareas();
  const disponibilidad = useDisponibilidad();
  const horarios = useHorarios();

  const onGenerarHorario = () => {
    navigate("/horarios");
    void horarios.generar();
  };

  if (!session) {
    return (
      <Routes>
        <Route path="/registrar" element={<RegisterPage />} />
        <Route path="/inicio" element={<LoginPage />} />
        {/* Sin redirect: si AuthProvider aún no resolvió sesión, la URL
            original (/cursos, /horarios, etc.) se conserva para que al
            resolverse la sesión coincida con la ruta autenticada. */}
        <Route path="*" element={<LoginPage />} />
      </Routes>
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
