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

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText("Aún no tienes cursos.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nombre"), "Cálculo II");
    await user.selectOptions(screen.getByLabelText("Dificultad"), "5");
    await user.click(screen.getByText("Guardar"));

    expect(await screen.findByText("Cálculo II")).toBeInTheDocument();
    expect(screen.queryByText("Aún no tienes cursos.")).not.toBeInTheDocument();
  });
});
