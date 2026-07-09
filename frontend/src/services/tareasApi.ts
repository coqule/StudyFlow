import type { NuevaTarea, Tarea } from "../types";

// Solo fetch/HTTP a /api/tareas, sin lógica de negocio (docs/architecture.md
// §9 "No hay lógica de negocio en frontend/src/services/"). La validación de
// negocio real (tipo, prioridad, fecha futura, propiedad del curso) vive en
// `tareasService.js` del backend — ver specs/tareas_crud/design.md §4.
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

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

function headers(accessToken: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

// listarTareas(): GET /api/tareas — cubre R16, R17 (el hook la llama al
// montar y en cada recarga de página).
export async function listarTareas(accessToken: string): Promise<Tarea[]> {
  const res = await fetch(`${API_URL}/tareas`, {
    method: "GET",
    headers: headers(accessToken),
  });
  const data = await manejarRespuesta<{ tareas: Tarea[] }>(res);
  return data.tareas;
}

// crearTarea(): POST /api/tareas — cubre R14.
export async function crearTarea(accessToken: string, datos: NuevaTarea): Promise<Tarea> {
  const res = await fetch(`${API_URL}/tareas`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify(datos),
  });
  return manejarRespuesta<Tarea>(res);
}

// actualizarTarea(): PUT /api/tareas/:id.
export async function actualizarTarea(
  accessToken: string,
  id: string,
  cambios: Partial<NuevaTarea>
): Promise<Tarea> {
  const res = await fetch(`${API_URL}/tareas/${id}`, {
    method: "PUT",
    headers: headers(accessToken),
    body: JSON.stringify(cambios),
  });
  return manejarRespuesta<Tarea>(res);
}

// eliminarTarea(): DELETE /api/tareas/:id — responde 204 sin cuerpo.
export async function eliminarTarea(accessToken: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/tareas/${id}`, {
    method: "DELETE",
    headers: headers(accessToken),
  });
  await manejarRespuesta<void>(res);
}
