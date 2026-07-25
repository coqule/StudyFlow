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

// Rango horario visible de la grilla, calculado a partir de los bloques para
// que ninguno quede recortado. Sin bloques cae a una jornada 8:00–20:00.
// Se redondea a horas enteras y se garantiza un mínimo de 6 h para que un
// único bloque corto no ocupe toda la altura.
export function calcularVentana(bloques: Disponibilidad[]): Ventana {
  if (bloques.length === 0) {
    return { inicio: 8 * 60, fin: 20 * 60 };
  }

  let min = Infinity;
  let max = -Infinity;
  for (const b of bloques) {
    min = Math.min(min, aMinutos(b.hora_inicio));
    max = Math.max(max, aMinutos(b.hora_fin));
  }

  let inicio = Math.floor(min / 60) * 60;
  let fin = Math.ceil(max / 60) * 60;

  const MIN_SPAN = 6 * 60;
  if (fin - inicio < MIN_SPAN) {
    fin = Math.min(24 * 60, inicio + MIN_SPAN);
    inicio = Math.max(0, fin - MIN_SPAN);
  }

  return { inicio, fin };
}

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
