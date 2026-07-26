import type { Disponibilidad } from "../../types";

// Utilidades para posicionar los bloques en el eje vertical de la grilla.
// Postgres `time` puede llegar como `HH:MM:SS`; todo se normaliza a minutos
// desde medianoche para el cálculo y a `HH:MM` para mostrar.

export function normalizarHora(hora: string): string {
  return hora.slice(0, 5);
}

export function aMinutos(hora: string): number {
  const [h, m] = normalizarHora(hora).split(":").map(Number);
  return h * 60 + m;
}

export interface Ventana {
  inicio: number; // minutos desde medianoche
  fin: number;
}

// La grilla siempre muestra el día completo, de 00:00 a 24:00 (sin recortar
// a un rango dinámico según los bloques existentes).
export const VENTANA_DIA: Ventana = { inicio: 0, fin: 24 * 60 };

// Posición vertical de un bloque como porcentajes top/height dentro de la
// ventana, listos para un elemento posicionado en absoluto.
export function posicionBloque(
  bloque: Disponibilidad,
  ventana: Ventana,
): { top: string; height: string } {
  const span = ventana.fin - ventana.inicio;
  const desde = aMinutos(bloque.hora_inicio);
  const hasta = aMinutos(bloque.hora_fin);
  const top = ((desde - ventana.inicio) / span) * 100;
  const alto = ((hasta - desde) / span) * 100;
  return { top: `${top}%`, height: `${alto}%` };
}

// Marcas horarias enteras dentro de la ventana, para las líneas de referencia
// del eje. Devuelve cada hora con su porcentaje de altura.
export function marcasHorarias(ventana: Ventana): { hora: number; top: number }[] {
  const span = ventana.fin - ventana.inicio;
  const marcas: { hora: number; top: number }[] = [];
  const primeraHora = Math.ceil(ventana.inicio / 60);
  const ultimaHora = Math.floor(ventana.fin / 60);
  for (let h = primeraHora; h <= ultimaHora; h++) {
    marcas.push({ hora: h, top: ((h * 60 - ventana.inicio) / span) * 100 });
  }
  return marcas;
}
