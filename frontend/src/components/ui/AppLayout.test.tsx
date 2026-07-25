import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AppLayout } from "./AppLayout";

const props = {
  nombreUsuario: "Ana",
  destinoActivo: "registro" as const,
  onNavegar: jest.fn(),
  onCerrarSesion: jest.fn(),
  onNuevaTarea: jest.fn(),
};

// jsdom no evalúa media queries, así que la columna fija de escritorio está
// siempre en el DOM. Las consultas del cajón se acotan con `within` sobre el
// diálogo para no confundir una versión con la otra.
function abrirCajon() {
  return screen.getByRole("dialog", { name: "Menú de secciones" });
}

describe("<AppLayout />", () => {
  beforeEach(() => {
    props.onNavegar.mockClear();
    props.onCerrarSesion.mockClear();
    props.onNuevaTarea.mockClear();
  });

  it("no monta el cajón hasta que se abre el menú", () => {
    render(<AppLayout {...props}>contenido</AppLayout>);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("abre el cajón y lleva el foco al botón de cerrar", async () => {
    const user = userEvent.setup();
    render(<AppLayout {...props}>contenido</AppLayout>);

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));

    const cajon = abrirCajon();
    expect(cajon).toBeInTheDocument();
    expect(within(cajon).getByRole("button", { name: "Cerrar" })).toHaveFocus();
  });

  it("cierra el cajón con la tecla Escape", async () => {
    const user = userEvent.setup();
    render(<AppLayout {...props}>contenido</AppLayout>);

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("devuelve el foco al botón de menú al cerrar", async () => {
    const user = userEvent.setup();
    render(<AppLayout {...props}>contenido</AppLayout>);

    const botonMenu = screen.getByRole("button", { name: "Abrir menú" });
    await user.click(botonMenu);
    await user.click(within(abrirCajon()).getByRole("button", { name: "Cerrar" }));

    expect(botonMenu).toHaveFocus();
  });

  it("«Nueva tarea» desde el cajón lo cierra y ejecuta la acción", async () => {
    const user = userEvent.setup();
    render(<AppLayout {...props}>contenido</AppLayout>);

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    await user.click(within(abrirCajon()).getByRole("button", { name: "Nueva tarea" }));

    expect(props.onNuevaTarea).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // Los destinos sin página no deben ser alcanzables por teclado (ADR-006).
  it("mantiene deshabilitados los destinos que aún no tienen página", () => {
    render(<AppLayout {...props}>contenido</AppLayout>);

    for (const etiqueta of ["Calendario", "Historial", "Configuración", "Ayuda"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${etiqueta}`) })).toBeDisabled();
    }
  });

  it("navegar a un destino disponible invoca onNavegar con su id", async () => {
    const user = userEvent.setup();
    render(<AppLayout {...props}>contenido</AppLayout>);

    // La columna de escritorio siempre está en el DOM; "Disponibilidad" es un
    // destino disponible (no deshabilitado).
    await user.click(screen.getByRole("button", { name: "Disponibilidad" }));

    expect(props.onNavegar).toHaveBeenCalledWith("disponibilidad");
  });

  it("marca el destino activo con aria-current", () => {
    render(
      <AppLayout {...props} destinoActivo="disponibilidad">
        contenido
      </AppLayout>,
    );

    expect(screen.getByRole("button", { name: "Disponibilidad" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Cursos" })).not.toHaveAttribute("aria-current");
  });
});
