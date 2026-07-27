import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CajaAjuste } from "./CajaAjuste";

const props = {
  ajustar: jest.fn(),
  ajustando: false,
  generando: false,
  error: null as string | null,
};

describe("<CajaAjuste />", () => {
  it("envía la instrucción escrita al hacer submit", async () => {
    const user = userEvent.setup();
    const ajustar = jest.fn().mockResolvedValue(undefined);

    render(<CajaAjuste {...props} ajustar={ajustar} />);

    const campo = screen.getByLabelText(/instrucción/i);
    await user.type(campo, "el examen de Cálculo II se adelantó");
    await user.click(screen.getByRole("button", { name: /enviar/i }));

    expect(ajustar).toHaveBeenCalledWith("el examen de Cálculo II se adelantó");
  });

  it("no dispara ajustar con el campo vacío", async () => {
    const user = userEvent.setup();
    const ajustar = jest.fn();

    render(<CajaAjuste {...props} ajustar={ajustar} />);
    await user.click(screen.getByRole("button", { name: /enviar/i }));

    expect(ajustar).not.toHaveBeenCalled();
  });

  it("limpia el campo cuando el envío termina sin error", async () => {
    const user = userEvent.setup();
    const ajustar = jest.fn().mockResolvedValue(undefined);

    const { rerender } = render(<CajaAjuste {...props} ajustar={ajustar} />);

    const campo = screen.getByLabelText(/instrucción/i);
    await user.type(campo, "el examen de Cálculo II se adelantó");
    await user.click(screen.getByRole("button", { name: /enviar/i }));

    // Simula el ciclo real de useHorarios: `ajustando` pasa a true mientras
    // la petición está en curso y vuelve a false al terminar sin error.
    rerender(<CajaAjuste {...props} ajustar={ajustar} ajustando={true} />);
    rerender(<CajaAjuste {...props} ajustar={ajustar} ajustando={false} error={null} />);

    await waitFor(() => expect(campo).toHaveValue(""));
  });

  it("conserva el texto tipeado cuando el ajuste termina con error, en vez de vaciarlo (evita que el usuario tenga que retipearlo)", async () => {
    const user = userEvent.setup();
    const ajustar = jest.fn().mockResolvedValue(undefined);
    const texto = "el examen de Cálculo II se adelantó";

    const { rerender } = render(<CajaAjuste {...props} ajustar={ajustar} />);

    const campo = screen.getByLabelText(/instrucción/i);
    await user.type(campo, texto);
    await user.click(screen.getByRole("button", { name: /enviar/i }));

    rerender(<CajaAjuste {...props} ajustar={ajustar} ajustando={true} />);
    rerender(<CajaAjuste {...props} ajustar={ajustar} ajustando={false} error="IA no disponible" />);

    expect(campo).toHaveValue(texto);
  });

  it("deshabilita el campo y el botón, y muestra el indicador de espera, mientras ajustando es true", () => {
    render(<CajaAjuste {...props} ajustando={true} />);

    expect(screen.getByLabelText(/instrucción/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /enviar/i })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(/esperando respuesta/i);
  });

  it("deshabilita el campo y el botón mientras generando ('Generar horario') está en curso, para no disparar ambas operaciones a la vez", () => {
    render(<CajaAjuste {...props} generando={true} />);

    expect(screen.getByLabelText(/instrucción/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /enviar/i })).toBeDisabled();
  });
});
