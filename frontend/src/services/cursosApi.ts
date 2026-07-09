import type { Curso, NuevoCurso } from "../types";

// Solo fetch/HTTP a /api/cursos, sin lógica de negocio (docs/architecture.md
// §9 "No hay lógica de negocio en frontend/src/services/"). La validación de
// negocio real (rango de dificultad, formato de color) vive en
// `cursosService.js` del backend — ver specs/cursos_crud/design.md §4.
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

// listarCursos(): GET /api/cursos — cubre R15, R16 (el hook la llama al
// montar y en cada recarga de página).
export async function listarCursos(accessToken: string): Promise<Curso[]> {
  const res = await fetch(`${API_URL}/cursos`, {
    method: "GET",
    headers: headers(accessToken),
  });
  const data = await manejarRespuesta<{ cursos: Curso[] }>(res);
  return data.cursos;
}

// crearCurso(): POST /api/cursos — cubre R13.
export async function crearCurso(accessToken: string, datos: NuevoCurso): Promise<Curso> {
  const res = await fetch(`${API_URL}/cursos`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify(datos),
  });
  return manejarRespuesta<Curso>(res);
}

// actualizarCurso(): PUT /api/cursos/:id.
export async function actualizarCurso(
  accessToken: string,
  id: string,
  cambios: Partial<NuevoCurso>
): Promise<Curso> {
  const res = await fetch(`${API_URL}/cursos/${id}`, {
    method: "PUT",
    headers: headers(accessToken),
    body: JSON.stringify(cambios),
  });
  return manejarRespuesta<Curso>(res);
}

// eliminarCurso(): DELETE /api/cursos/:id — responde 204 sin cuerpo.
export async function eliminarCurso(accessToken: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/cursos/${id}`, {
    method: "DELETE",
    headers: headers(accessToken),
  });
  await manejarRespuesta<void>(res);
}
