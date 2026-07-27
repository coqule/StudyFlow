import { render, screen } from "@testing-library/react";

import { HomePage } from "./HomePage";

jest.mock("../hooks/useCursos", () => ({
  useCursos: () => ({ data: [], loading: false, error: null }),
}));

jest.mock("../hooks/useTareas", () => ({
  useTareas: () => ({ data: [], loading: false, error: null }),
}));

describe("<HomePage />", () => {
  it("muestra el título de bienvenida", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "Bienvenido a StudyFlow" })).toBeInTheDocument();
  });
});
