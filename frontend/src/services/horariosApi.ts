import type { BloqueHorario } from "../types";

// Solo fetch/HTTP a /api/horarios, sin lógica de negocio (docs/architecture.md
// §9 "No hay lógica de negocio en frontend/src/services/"). El enriquecimiento
// del bloque (JOIN tarea+curso) y la validación viven en el backend
// (`horariosService.listarHorario`) — ver specs/horarios_vista/design.md §3.
//
// Variable de entorno leída al inicio del módulo (docs/conventions.md §7).
const API_URL = import.meta.env.VITE_API_URL;

interface ErrorApi {
  error?: string;
  code?: string;
}

async function manejarRespuesta<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let cuerpo: ErrorApi = {};
    try {
      cuerpo = await res.json();
    } catch {
      // Respuesta sin cuerpo JSON — se usa el mensaje genérico de abajo.
    }
    throw new Error(cuerpo.error || "No se pudo completar la operación");
  }

  return res.json() as Promise<T>;
}

function headers(accessToken: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

// listarHorarios(): GET /api/horarios — cubre R8 (el hook la llama al montar).
export async function listarHorarios(accessToken: string): Promise<BloqueHorario[]> {
  const res = await fetch(`${API_URL}/horarios`, {
    method: "GET",
    headers: headers(accessToken),
  });
  const data = await manejarRespuesta<{ bloques: BloqueHorario[] }>(res);
  return data.bloques;
}

// generarHorario(): POST /api/horarios/generar — cubre R1 (feature 15). El
// backend genera los bloques y los persiste; no hace falta devolver el shape
// crudo de la respuesta (sin `tarea_titulo`/`curso_nombre`/`curso_color`,
// docs/api-contratos.md) porque el hook vuelve a llamar `listarHorarios()`
// para obtener el shape enriquecido (specs/generar_ui/design.md §2).
export async function generarHorario(accessToken: string): Promise<void> {
  const res = await fetch(`${API_URL}/horarios/generar`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({}),
  });
  await manejarRespuesta<{ bloques: unknown[] }>(res);
}

// ajustarHorario(): POST /api/horarios/ajustar — feature 16. Igual que
// generarHorario, la respuesta cruda de `bloques_creados` no trae los campos
// enriquecidos del JOIN (docs/api-contratos.md), así que el hook vuelve a
// llamar `listarHorarios()` en vez de usar este resultado directamente.
export async function ajustarHorario(accessToken: string, instruccion: string): Promise<void> {
  const res = await fetch(`${API_URL}/horarios/ajustar`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({ instruccion }),
  });
  await manejarRespuesta<{ bloques_eliminados: string[]; bloques_creados: unknown[] }>(res);
}
