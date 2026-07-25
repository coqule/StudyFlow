import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { AppLayout } from "./AppLayout";

const props = {
  nombreUsuario: "Ana",
  onCerrarSesion: jest.fn(),
  onNuevaTarea: jest.fn(),
};

// AppLayout usa NavLink, que exige contexto de Router. Se envuelve en
// MemoryRouter con la ruta inicial indicada.
function renderLayout(rutaInicial = "/cursos") {
  return render(
    <MemoryRouter initialEntries={[rutaInicial]}>
      <AppLayout {...props}>contenido</AppLayout>
    </MemoryRouter>,
  );
}

// jsdom no evalúa media queries, así que la columna fija de escritorio está
// siempre en el DOM. Las consultas del cajón se acotan con `within` sobre el
// diálogo para no confundir una versión con la otra.
function abrirCajon() {
  return screen.getByRole("dialog", { name: "Menú de secciones" });
}

describe("<AppLayout />", () => {
  beforeEach(() => {
    props.onCerrarSesion.mockClear();
    props.onNuevaTarea.mockClear();
  });

  it("no monta el cajón hasta que se abre el menú", () => {
    renderLayout();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("abre el cajón y lleva el foco al botón de cerrar", async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));

    const cajon = abrirCajon();
    expect(cajon).toBeInTheDocument();
    expect(within(cajon).getByRole("button", { name: "Cerrar" })).toHaveFocus();
  });

  it("cierra el cajón con la tecla Escape", async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("devuelve el foco al botón de menú al cerrar", async () => {
    const user = userEvent.setup();
    renderLayout();

    const botonMenu = screen.getByRole("button", { name: "Abrir menú" });
    await user.click(botonMenu);
    await user.click(within(abrirCajon()).getByRole("button", { name: "Cerrar" }));

    expect(botonMenu).toHaveFocus();
  });

  it("«Nueva tarea» desde el cajón lo cierra y ejecuta la acción", async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    await user.click(within(abrirCajon()).getByRole("button", { name: "Nueva tarea" }));

    expect(props.onNuevaTarea).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // Los destinos sin página no deben ser alcanzables por teclado (ADR-006).
  it("mantiene deshabilitados los destinos que aún no tienen página", () => {
    renderLayout();

    for (const etiqueta of ["Calendario", "Historial", "Configuración", "Ayuda"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${etiqueta}`) })).toBeDisabled();
    }
  });

  // Los destinos con página son enlaces reales (NavLink), con su URL.
  it("los destinos con página son enlaces a su ruta", () => {
    renderLayout();

    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Cursos" })).toHaveAttribute("href", "/cursos");
    expect(screen.getByRole("link", { name: "Disponibilidad" })).toHaveAttribute(
      "href",
      "/disponibilidad",
    );
  });

  it("al hacer clic en un destino navega y lo marca como activo", async () => {
    const user = userEvent.setup();
    renderLayout("/cursos");

    await user.click(screen.getByRole("link", { name: "Disponibilidad" }));

    expect(screen.getByRole("link", { name: "Disponibilidad" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Cursos" })).not.toHaveAttribute("aria-current");
  });

  it("marca el destino activo según la URL con aria-current", () => {
    renderLayout("/disponibilidad");

    expect(screen.getByRole("link", { name: "Disponibilidad" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Cursos" })).not.toHaveAttribute("aria-current");
  });
});
