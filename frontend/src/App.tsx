import { useEffect, useState } from "react";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PanelRegistroPage } from "./pages/PanelRegistroPage";
import { DisponibilidadPage } from "./pages/DisponibilidadPage";
import { AppLayout, type Destino } from "./components/ui/AppLayout";
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
  // Vista autenticada activa. Sin librería de routing: el mismo patrón de
  // conmutación por estado que login/registro decide qué página mostrar.
  const [vista, setVista] = useState<Destino>("registro");
  const [pedirFocoTarea, setPedirFocoTarea] = useState(false);
  const cursos = useCursos();
  const tareas = useTareas();
  // Instancia única de useDisponibilidad() en AppShell (design.md §6): ningún
  // componente hijo llama al hook por su cuenta — todos reciben sus funciones
  // por props para compartir el mismo estado que la grilla visible.
  const disponibilidad = useDisponibilidad();

  // «Nueva tarea» puede pulsarse desde cualquier vista: primero se vuelve al
  // panel (donde vive el formulario) y recién cuando el campo está montado se
  // le lleva el foco. Por eso el foco espera a un efecto y no se hace en el
  // mismo clic.
  useEffect(() => {
    if (!pedirFocoTarea || vista !== "registro") return;
    const campo = document.getElementById("tarea-titulo");
    campo?.scrollIntoView({ behavior: "smooth", block: "center" });
    campo?.focus({ preventScroll: true });
    setPedirFocoTarea(false);
  }, [pedirFocoTarea, vista]);

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
      destinoActivo={vista}
      onNavegar={setVista}
      onCerrarSesion={() => void logout()}
      onNuevaTarea={() => {
        setVista("registro");
        setPedirFocoTarea(true);
      }}
    >
      {vista === "registro" ? (
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
      ) : (
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
      )}
    </AppLayout>
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
