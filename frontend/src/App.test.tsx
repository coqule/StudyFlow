import { act, render, screen } from "@testing-library/react";
import App from "./App";

// MOCK: Supabase Auth desactivado en este test (docs/conventions.md §8) —
// App.tsx monta AuthProvider, que llama a supabaseClient en tiempo real al
// montar (getSession/onAuthStateChange). Este test de humo solo verifica
// que App renderiza sin sesión, no necesita Supabase real.
jest.mock("./services/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}));

describe("<App />", () => {
  it("renderiza sin lanzar excepción y muestra 'StudyFlow' en el DOM", async () => {
    // AuthProvider resuelve `getSession()` de forma asíncrona al montar —
    // se espera esa resolución dentro de act() para evitar actualizaciones
    // de estado fuera de act (ver AuthContext.tsx `useEffect`).
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText("StudyFlow")).toBeInTheDocument();
  });
});
