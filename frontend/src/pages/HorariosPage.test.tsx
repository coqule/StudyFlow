import { render, screen } from "@testing-library/react";

import { HorariosPage } from "./HorariosPage";

const props = {
  data: [],
  loading: false,
  generando: false,
  error: null,
};

// HorariosPage.tsx deja de instanciar useHorarios() por su cuenta desde la
// feature 15 (R6) y recibe { data, loading, generando, error } por props —
// este test cubre R2: el overlay de carga superpuesto sobre CalendarioSemanal
// cuando generando es true (specs/generar_ui/design.md §5).
describe("<HorariosPage />", () => {
  it("muestra el overlay de carga sobre el calendario cuando generando es true (R2)", () => {
    render(<HorariosPage {...props} generando={true} />);

    const overlay = screen.getByRole("status");
    expect(overlay).toHaveTextContent(/Generando horario/);
  });

  it("no muestra el overlay cuando generando es false (R2)", () => {
    render(<HorariosPage {...props} generando={false} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("el overlay no oculta los bloques existentes: el calendario sigue en el DOM mientras generando es true (R2, R5)", () => {
    render(<HorariosPage {...props} generando={true} />);

    // "Sin bloques" es el texto que CalendarioSemanal pinta por cada columna
    // de día cuando `data` está vacío — confirma que el calendario se sigue
    // renderizando debajo del overlay, no se reemplaza por él.
    expect(screen.getAllByText("Sin bloques").length).toBeGreaterThan(0);
  });
});
