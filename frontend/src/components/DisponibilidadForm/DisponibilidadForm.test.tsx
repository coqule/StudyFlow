import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DisponibilidadForm } from "./DisponibilidadForm";

// MOCK: backend desactivado en este test (docs/conventions.md §8) — `crear`
// llega por props, DisponibilidadForm nunca llama useDisponibilidad()/fetch
// real, solo se le pasa un mock de la prop.
const mockCrear = jest.fn();

describe("<DisponibilidadForm />", () => {
  beforeEach(() => {
    mockCrear.mockClear();
  });

  it("llama a crear() con los datos correctos al enviar con hora_fin > hora_inicio (R16, R17)", async () => {
    const user = userEvent.setup();
    render(<DisponibilidadForm crear={mockCrear} error={null} />);

    await user.selectOptions(screen.getByLabelText("Día"), "miercoles");
    await user.clear(screen.getByLabelText("Hora inicio"));
    await user.type(screen.getByLabelText("Hora inicio"), "18:00");
    await user.clear(screen.getByLabelText("Hora fin"));
    await user.type(screen.getByLabelText("Hora fin"), "20:00");
    await user.click(screen.getByText("Agregar bloque"));

    expect(mockCrear).toHaveBeenCalledWith({
      dia_semana: "miercoles",
      hora_inicio: "18:00",
      hora_fin: "20:00",
    });
  });

  it("muestra un error y no llama a crear() si hora_fin <= hora_inicio (R18)", async () => {
    const user = userEvent.setup();
    render(<DisponibilidadForm crear={mockCrear} error={null} />);

    await user.clear(screen.getByLabelText("Hora inicio"));
    await user.type(screen.getByLabelText("Hora inicio"), "10:00");
    await user.clear(screen.getByLabelText("Hora fin"));
    await user.type(screen.getByLabelText("Hora fin"), "09:00");
    await user.click(screen.getByText("Agregar bloque"));

    expect(screen.getByRole("alert")).toHaveTextContent(/hora de fin/i);
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it("muestra el error de solapamiento (409) que llega por prop (R19)", () => {
    render(
      <DisponibilidadForm crear={mockCrear} error="El bloque se solapa con otro del mismo día" />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/solapa/i);
  });
});
