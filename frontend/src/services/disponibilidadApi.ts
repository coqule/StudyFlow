import type { Disponibilidad, NuevaDisponibilidad } from "../types";

// Solo fetch/HTTP a /api/disponibilidad, sin lógica de negocio
// (docs/architecture.md §9). La validación de negocio real (día, formato de
// hora, rango, solapamiento, propiedad) vive en `disponibilidadService.js` /
// `disponibilidadController.js` del backend — ver design.md §7.
//
// Variable de entorno leída al inicio del módulo (docs/conventions.md §7).
const API_URL = import.meta.env.VITE_API_URL;

interface ErrorApi {
  error?: string;
  code?: string;
}

// Error que preserva el `code` del body (OVERLAP_CONFLICT / NOT_FOUND /
// VALIDATION_ERROR) para que la UI distinga el solapamiento (R19, R26) de
// otros fallos.
class ApiError extends Error {
  code?: string;

  constructor(mensaje: string, code?: string) {
    super(mensaje);
    this.name = "ApiError";
    this.code = code;
  }
}

async function manejarRespuesta<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let cuerpo: ErrorApi = {};
    try {
      cuerpo = await res.json();
    } catch {
      // Respuesta sin cuerpo JSON — se usa el mensaje genérico de abajo.
    }
    throw new ApiError(
      cuerpo.error || "No se pudo completar la operación",
      cuerpo.code
    );
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

// listarDisponibilidad(): GET /api/disponibilidad — el hook la llama al
// montar y en cada recarga de página (R15, R20).
export async function listarDisponibilidad(
  accessToken: string
): Promise<Disponibilidad[]> {
  const res = await fetch(`${API_URL}/disponibilidad`, {
    method: "GET",
    headers: headers(accessToken),
  });
  const data = await manejarRespuesta<{ disponibilidad: Disponibilidad[] }>(res);
  return data.disponibilidad;
}

// crearBloque(): POST /api/disponibilidad (R17).
export async function crearBloque(
  accessToken: string,
  datos: NuevaDisponibilidad
): Promise<Disponibilidad> {
  const res = await fetch(`${API_URL}/disponibilidad`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify(datos),
  });
  return manejarRespuesta<Disponibilidad>(res);
}

// actualizarBloque(): PUT /api/disponibilidad/:id (R23).
export async function actualizarBloque(
  accessToken: string,
  id: string,
  cambios: Partial<NuevaDisponibilidad>
): Promise<Disponibilidad> {
  const res = await fetch(`${API_URL}/disponibilidad/${id}`, {
    method: "PUT",
    headers: headers(accessToken),
    body: JSON.stringify(cambios),
  });
  return manejarRespuesta<Disponibilidad>(res);
}

// eliminarBloque(): DELETE /api/disponibilidad/:id — responde 204 sin cuerpo
// (R31).
export async function eliminarBloque(
  accessToken: string,
  id: string
): Promise<void> {
  const res = await fetch(`${API_URL}/disponibilidad/${id}`, {
    method: "DELETE",
    headers: headers(accessToken),
  });
  await manejarRespuesta<void>(res);
}
