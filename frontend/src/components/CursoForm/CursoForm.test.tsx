import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CursoForm } from "./CursoForm";

// `crear` se pasa por props (specs/cursos_crud/design.md §7.7 — fix del bug
// de R13/R30: CursoForm ya no llama useCursos() por su cuenta, así que ya
// no hace falta mockear ese módulo, solo pasar un mock de la prop).
const mockCrear = jest.fn();

describe("<CursoForm />", () => {
  beforeEach(() => {
    mockCrear.mockClear();
  });

  it("llama a crear() con los datos correctos al enviar el formulario con datos válidos (R12, R13)", async () => {
    const user = userEvent.setup();
    render(<CursoForm crear={mockCrear} />);

    await user.type(screen.getByLabelText("Nombre del curso"), "Cálculo II");
    await user.click(screen.getByRole("radio", { name: "5" }));
    await user.click(screen.getByText("Guardar"));

    expect(mockCrear).toHaveBeenCalledWith({
      nombre: "Cálculo II",
      color: expect.any(String),
      dificultad: 5,
    });
  });

  it("muestra un error y no llama a crear() si el nombre está vacío (R14)", async () => {
    const user = userEvent.setup();
    render(<CursoForm crear={mockCrear} />);

    await user.click(screen.getByText("Guardar"));

    expect(screen.getByRole("alert")).toHaveTextContent(/nombre/i);
    expect(mockCrear).not.toHaveBeenCalled();
  });

  // La dificultad se expone como grupo de radios y no como <span> clicables:
  // debe ser alcanzable y operable por el árbol de accesibilidad (el diseño
  // de Stitch usaba spans, que ningún lector de pantalla anuncia).
  it("expone la dificultad como radios accesibles con nombre 1 a 5", () => {
    render(<CursoForm crear={mockCrear} />);

    for (const valor of ["1", "2", "3", "4", "5"]) {
      expect(screen.getByRole("radio", { name: valor })).toBeInTheDocument();
    }
  });

  it("permite elegir un color sugerido y conserva el selector libre (R12)", async () => {
    const user = userEvent.setup();
    render(<CursoForm crear={mockCrear} />);

    expect(screen.getByLabelText("Color personalizado")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nombre del curso"), "Física");
    await user.click(screen.getByRole("radio", { name: "Verde" }));
    await user.click(screen.getByText("Guardar"));

    expect(mockCrear).toHaveBeenCalledWith({
      nombre: "Física",
      color: "#006c49",
      dificultad: 1,
    });
  });
});
