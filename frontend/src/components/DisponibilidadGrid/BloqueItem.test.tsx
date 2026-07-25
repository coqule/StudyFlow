import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BloqueItem } from "./BloqueItem";
import type { Disponibilidad } from "../../types";

const bloqueDePrueba: Disponibilidad = {
  id: "1",
  usuario_id: "u1",
  dia_semana: "lunes",
  hora_inicio: "08:00",
  hora_fin: "10:00",
};

// La hora se elige con dos <select> (hora 00-23, minutos), no un input time:
// se ajustan por su nombre accesible "<etiqueta>, hora" / ", minutos". El
// value de cada option es el número sin ceros a la izquierda.
async function fijarHora(
  user: ReturnType<typeof userEvent.setup>,
  etiqueta: string,
  hhmm: string
) {
  const [h, m] = hhmm.split(":");
  await user.selectOptions(screen.getByLabelText(`${etiqueta}, hora`), String(Number(h)));
  await user.selectOptions(screen.getByLabelText(`${etiqueta}, minutos`), String(Number(m)));
}

// MOCK: backend desactivado en este test (docs/conventions.md §8) —
// `actualizar`/`eliminar` llegan mockeadas por props, BloqueItem nunca llama
// a disponibilidadApi/fetch real. `window.confirm` también se mockea.
describe("<BloqueItem />", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("muestra botones 'Editar' y 'Eliminar' en vista normal (R21, R28)", () => {
    render(
      <BloqueItem bloque={bloqueDePrueba} actualizar={jest.fn()} eliminar={jest.fn()} error={null} />
    );

    expect(screen.getByText("Editar")).toBeInTheDocument();
    expect(screen.getByText("Eliminar")).toBeInTheDocument();
  });

  it("al activar 'Editar' muestra campos prellenados con los valores actuales (R22)", async () => {
    const user = userEvent.setup();
    render(
      <BloqueItem bloque={bloqueDePrueba} actualizar={jest.fn()} eliminar={jest.fn()} error={null} />
    );

    await user.click(screen.getByText("Editar"));

    expect(screen.getByLabelText("Día")).toHaveValue("lunes");
    expect(screen.getByLabelText("Hora inicio, hora")).toHaveValue("8");
    expect(screen.getByLabelText("Hora inicio, minutos")).toHaveValue("0");
    expect(screen.getByLabelText("Hora fin, hora")).toHaveValue("10");
    expect(screen.getByLabelText("Hora fin, minutos")).toHaveValue("0");
  });

  it("edición válida invoca actualizar() con los datos correctos y sale de modo edición (R23, R25)", async () => {
    const mockActualizar = jest.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(
      <BloqueItem
        bloque={bloqueDePrueba}
        actualizar={mockActualizar}
        eliminar={jest.fn()}
        error={null}
      />
    );

    await user.click(screen.getByText("Editar"));
    await fijarHora(user, "Hora inicio", "14:00");
    await fijarHora(user, "Hora fin", "16:00");
    await user.click(screen.getByText("Guardar"));

    expect(mockActualizar).toHaveBeenCalledWith("1", {
      dia_semana: "lunes",
      hora_inicio: "14:00",
      hora_fin: "16:00",
    });
    expect(screen.queryByLabelText("Hora inicio, hora")).not.toBeInTheDocument();
    expect(screen.getByText("Editar")).toBeInTheDocument();
  });

  it("con hora_fin <= hora_inicio muestra error en el bloque y no invoca actualizar() (R24)", async () => {
    const mockActualizar = jest.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(
      <BloqueItem
        bloque={bloqueDePrueba}
        actualizar={mockActualizar}
        eliminar={jest.fn()}
        error={null}
      />
    );

    await user.click(screen.getByText("Editar"));
    await fijarHora(user, "Hora fin", "07:00");
    await user.click(screen.getByText("Guardar"));

    expect(screen.getByRole("alert")).toHaveTextContent(/hora de fin/i);
    expect(mockActualizar).not.toHaveBeenCalled();
  });

  it("si actualizar() devuelve false muestra el error de la fila y permanece editable (R26)", async () => {
    const mockActualizar = jest.fn().mockResolvedValue(false);
    const user = userEvent.setup();
    render(
      <BloqueItem
        bloque={bloqueDePrueba}
        actualizar={mockActualizar}
        eliminar={jest.fn()}
        error="El bloque se solapa con otro del mismo día"
      />
    );

    await user.click(screen.getByText("Editar"));
    await user.click(screen.getByText("Guardar"));

    expect(screen.getByRole("alert")).toHaveTextContent("El bloque se solapa con otro del mismo día");
    expect(screen.getByLabelText("Hora inicio, hora")).toBeInTheDocument();
  });

  it("'Cancelar' descarta los cambios locales y no invoca actualizar() (R27)", async () => {
    const mockActualizar = jest.fn();
    const user = userEvent.setup();
    render(
      <BloqueItem
        bloque={bloqueDePrueba}
        actualizar={mockActualizar}
        eliminar={jest.fn()}
        error={null}
      />
    );

    await user.click(screen.getByText("Editar"));
    await fijarHora(user, "Hora inicio", "22:00");
    await user.click(screen.getByText("Cancelar"));

    expect(mockActualizar).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Hora inicio, hora")).not.toBeInTheDocument();
    expect(screen.getByText("08:00–10:00")).toBeInTheDocument();
  });

  it("'Eliminar' pide confirmación y solo invoca eliminar() si se confirma (R29, R31)", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const mockEliminar = jest.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(
      <BloqueItem
        bloque={bloqueDePrueba}
        actualizar={jest.fn()}
        eliminar={mockEliminar}
        error={null}
      />
    );

    await user.click(screen.getByText("Eliminar"));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockEliminar).toHaveBeenCalledWith("1");
  });

  it("si el usuario no confirma la eliminación no invoca eliminar() (R30)", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    const mockEliminar = jest.fn();
    const user = userEvent.setup();
    render(
      <BloqueItem
        bloque={bloqueDePrueba}
        actualizar={jest.fn()}
        eliminar={mockEliminar}
        error={null}
      />
    );

    await user.click(screen.getByText("Eliminar"));

    expect(mockEliminar).not.toHaveBeenCalled();
  });

  it("si eliminar() devuelve false muestra un error en la fila y el bloque permanece (R33)", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const mockEliminar = jest.fn().mockResolvedValue(false);
    const user = userEvent.setup();
    render(
      <BloqueItem
        bloque={bloqueDePrueba}
        actualizar={jest.fn()}
        eliminar={mockEliminar}
        error="No se pudo eliminar el bloque"
      />
    );

    await user.click(screen.getByText("Eliminar"));

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo eliminar el bloque");
    expect(screen.getByText("08:00–10:00")).toBeInTheDocument();
  });
});
