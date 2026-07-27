import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

// MOCK: Supabase Auth desactivado en este test (docs/conventions.md §8) —
// se simula una sesión ya activa para que AppShell renderice CursoForm +
// CursoList (el mismo mecanismo de mock que App.test.tsx, pero con
// `getSession()` devolviendo una sesión en vez de null).
// El objeto de sesión se define inline dentro del factory (no como const
// externa): `import App from "./App"` se hoistea por encima de cualquier
// `const` de nivel superior, así que una referencia externa dispararía un
// error de "acceso antes de inicialización" al requerirse el módulo
// mockeado antes de que la constante exista.
jest.mock("./services/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: "token-de-prueba",
            user: { id: "u1", email: "ana@ucr.ac.cr", user_metadata: { nombre: "Ana" } },
          },
        },
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      signOut: jest.fn(),
    },
  },
}));

// MOCK: backend desactivado en este test (docs/conventions.md §8) —
// `cursosApi.ts` usa `import.meta.env` (ESM) que `tsconfig.jest.json`
// (`module: commonjs`) no transforma; se mockea el módulo completo (mismo
// mecanismo que App.test.tsx).
jest.mock("./services/cursosApi", () => ({
  listarCursos: jest.fn().mockResolvedValue([]),
  crearCurso: jest.fn().mockResolvedValue({
    id: "c1",
    usuario_id: "u1",
    nombre: "Cálculo II",
    color: "#3B82F6",
    dificultad: 5,
  }),
  actualizarCurso: jest.fn(),
  eliminarCurso: jest.fn(),
}));

// MOCK: backend desactivado en este test (docs/conventions.md §8) —
// `tareasApi.ts` usa `import.meta.env` (ESM), mismo motivo que el mock de
// `cursosApi` de arriba (specs/tareas_crud/design.md §5). `App` ahora monta
// también `TareaForm`/`TareaList` vía `useTareas()`.
jest.mock("./services/tareasApi", () => ({
  listarTareas: jest.fn().mockResolvedValue([]),
  crearTarea: jest.fn(),
  actualizarTarea: jest.fn(),
  eliminarTarea: jest.fn(),
}));

// MOCK: backend desactivado — `disponibilidadApi.ts` también usa
// `import.meta.env` (ESM que `tsconfig.jest.json` no transforma). App.tsx lo
// monta vía `useDisponibilidad`; se mockea por el mismo motivo que `cursosApi`.
jest.mock("./services/disponibilidadApi", () => ({
  listarDisponibilidad: jest.fn().mockResolvedValue([]),
  crearBloque: jest.fn(),
  actualizarBloque: jest.fn(),
  eliminarBloque: jest.fn(),
}));

// MOCK: backend desactivado — `horariosApi.ts` también usa `import.meta.env`
// (feature 14; feature 15 agrega `generarHorario`). Mismo motivo que el resto
// de los api.
jest.mock("./services/horariosApi", () => ({
  listarHorarios: jest.fn().mockResolvedValue([]),
  generarHorario: jest.fn().mockResolvedValue(undefined),
}));

// Regresión de R30 (bug real de R13 encontrado en pruebas manuales
// post-review, specs/cursos_crud/design.md §7.7): antes de este fix
// `CursoForm` llamaba su propia instancia de `useCursos()`, desconectada de
// la que efectivamente renderiza `CursoList` en `AppShell` — crear un curso
// no aparecía en la lista visible sin recargar la página. Este test ejercita
// el árbol completo de `App` (una sola instancia de `useCursos()` compartida
// vía props) para comprobar que el defecto no vuelve a introducirse.
describe("Integración CursoForm -> CursoList (R30)", () => {
  it("un curso creado vía CursoForm aparece en CursoList sin recargar la página", async () => {
    const user = userEvent.setup();

    // La raíz ("/") ahora es HomePage; este test ejercita el panel de
    // registro, así que navega ahí antes de montar.
    window.history.pushState({}, "", "/cursos");

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText("Aún no tienes cursos.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nombre del curso"), "Cálculo II");
    // `App` monta dos escalas de círculos (dificultad de curso y prioridad de
    // tarea), ambas con un radio "5"; se acota al grupo de dificultad por su
    // atributo name para no ambigüar la consulta.
    const radios5 = screen.getAllByRole("radio", { name: "5" });
    const dificultad5 = radios5.find((r) => r.getAttribute("name") === "curso-dificultad");
    await user.click(dificultad5!);
    // `App` ahora también monta `TareaForm` (tareas_crud), que tiene su
    // propio botón "Guardar" — se toma el primero (el de `CursoForm`,
    // montado antes en el árbol) para no ambigüar la consulta.
    await user.click(screen.getAllByText("Guardar")[0]);

    // `TareaForm` (tareas_crud) también muestra "Cálculo II" como opción de
    // su selector de curso una vez creado — se busca específicamente la
    // fila de `CursoList` (un <li>) para no ambigüar la consulta.
    expect(await screen.findByText("Cálculo II", { selector: "li *" })).toBeInTheDocument();
    expect(screen.queryByText("Aún no tienes cursos.")).not.toBeInTheDocument();
  });
});
