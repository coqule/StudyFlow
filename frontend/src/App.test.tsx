import { render, screen } from "@testing-library/react";
import App from "./App";

describe("<App />", () => {
  it("renderiza sin lanzar excepción y muestra 'StudyFlow' en el DOM", () => {
    expect(() => render(<App />)).not.toThrow();
    expect(screen.getByText("StudyFlow")).toBeInTheDocument();
  });
});
