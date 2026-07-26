import { render, screen } from "@testing-library/react";

import { HomePage } from "./HomePage";

describe("<HomePage />", () => {
  it("muestra el título de bienvenida", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "Bienvenido a StudyFlow" })).toBeInTheDocument();
  });
});
