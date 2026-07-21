const fs = require("fs");
const path = require("path");
const request = require("supertest");

// Estrategia de mockeo (specs/ia_endpoint_generar/design.md §8): NO se hacen
// llamadas de red reales a Gemini ni a Supabase. Se mockea el MÓDULO IA
// completo y el cliente de Supabase. El auth se ejercita con el middleware
// real `requireAuth`, alimentado por el `supabase.auth.getUser` mockeado, para
// inyectar `req.usuario_id` sin depender de un JWT real (mismo criterio de
// aislamiento de red que las features 8/9/10).
//
// Los nombres de los espías llevan prefijo `mock` porque babel-plugin-jest-hoist
// solo permite que el factory de `jest.mock` (elevado al top del archivo)
// referencie variables externas cuyo nombre empieza por `mock`.

// MOCK: módulo IA desactivado en este test
jest.mock("../src/services/ia", () => ({
  construirContexto: jest.fn(),
  llamarGemini: jest.fn(),
  validarRespuesta: jest.fn(),
}));

// MOCK: Supabase desactivado en este test.
// Estado reconfigurable por test (se muta, no se reasigna, para que el factory
// hoisted siga viendo la misma referencia).
const mockSupabaseState = {
  deleteResult: { error: null },
  insertResult: { data: [], error: null },
  getUserResult: { data: { user: { id: "usuario-token-1" } }, error: null },
};
const mockFrom = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockIn = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockGetUser = jest.fn();

jest.mock("../src/services/supabase", () => {
  const builder = {
    delete: (...a) => {
      mockDelete(...a);
      return builder;
    },
    eq: (...a) => {
      mockEq(...a);
      return builder;
    },
    in: (...a) => {
      mockIn(...a);
      return Promise.resolve(mockSupabaseState.deleteResult);
    },
    insert: (...a) => {
      mockInsert(...a);
      return builder;
    },
    select: (...a) => {
      mockSelect(...a);
      return Promise.resolve(mockSupabaseState.insertResult);
    },
  };
  return {
    auth: { getUser: (...a) => mockGetUser(...a) },
    from: (...a) => {
      mockFrom(...a);
      return builder;
    },
  };
});

const app = require("../src/app");
const { construirContexto, llamarGemini, validarRespuesta } = require("../src/services/ia");

// Contexto fixture calcado del formato de docs/reglas-ia.md / ia-contexto.
const USUARIO_ID = "usuario-token-1";

function contextoFixture() {
  return {
    fecha_actual: "2026-07-06",
    disponibilidad: [
      { dia: "lunes", inicio: "18:00", fin: "21:00" },
      { dia: "martes", inicio: "14:00", fin: "16:00" },
    ],
    tareas_pendientes: [
      { id: "tarea-1", curso: "Cálculo II", dificultad: 5 },
      { id: "tarea-2", curso: "Física", dificultad: 3 },
    ],
  };
}

// Bloques tal como los devuelve `validarRespuesta` (sin id ni generado_por_ia).
function bloquesValidados() {
  return [
    {
      tarea_id: "tarea-1",
      fecha: "2026-07-06",
      hora_inicio: "18:00",
      hora_fin: "21:00",
      justificacion: "Cálculo II: fecha límite más próxima y dificultad 5.",
    },
    {
      tarea_id: "tarea-2",
      fecha: "2026-07-07",
      hora_inicio: "14:00",
      hora_fin: "16:00",
      justificacion: "Física: dificultad media.",
    },
  ];
}

// Filas ya persistidas (con id asignado por Postgres).
function filasPersistidas() {
  return bloquesValidados().map((b, i) => ({
    id: `bloque-${i + 1}`,
    tarea_id: b.tarea_id,
    fecha: b.fecha,
    hora_inicio: b.hora_inicio,
    hora_fin: b.hora_fin,
    generado_por_ia: true,
    justificacion: b.justificacion,
  }));
}

function generar(token, body) {
  const req = request(app).post("/api/horarios/generar");
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req.send(body || {});
}

// Configura el camino feliz por defecto.
function configurarCaminoFeliz() {
  const contexto = contextoFixture();
  construirContexto.mockResolvedValue(contexto);
  llamarGemini.mockResolvedValue("RAW_JSON");
  validarRespuesta.mockReturnValue(bloquesValidados());
  mockSupabaseState.deleteResult = { error: null };
  mockSupabaseState.insertResult = { data: filasPersistidas(), error: null };
  mockSupabaseState.getUserResult = { data: { user: { id: USUARIO_ID } }, error: null };
  mockGetUser.mockResolvedValue(mockSupabaseState.getUserResult);
  return contexto;
}

describe("POST /api/horarios/generar (ia_endpoint_generar) — specs/ia_endpoint_generar/requirements.md", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configurarCaminoFeliz();
  });

  // R1
  it("responde 401 si no hay JWT válido, sin ejecutar el flujo IA (R1)", async () => {
    const res = await generar(null);

    expect(res.status).toBe(401);
    expect(construirContexto).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // R2
  it("responde 200 con body.bloques cuyos elementos tienen exactamente las 7 claves del contrato (R2)", async () => {
    const res = await generar("token-valido");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.bloques)).toBe(true);
    expect(res.body.bloques).toHaveLength(2);
    for (const bloque of res.body.bloques) {
      expect(Object.keys(bloque).sort()).toEqual(
        [
          "fecha",
          "generado_por_ia",
          "hora_fin",
          "hora_inicio",
          "id",
          "justificacion",
          "tarea_id",
        ].sort()
      );
      expect(bloque.id).toEqual(expect.any(String));
    }
  });

  // R3
  it("orquesta construirContexto → llamarGemini → validarRespuesta con el usuario_id del token, ignorando el del body (R3)", async () => {
    const res = await generar("token-valido", { usuario_id: "usuario-falso-del-body" });

    expect(res.status).toBe(200);
    expect(construirContexto).toHaveBeenCalledTimes(1);
    expect(construirContexto).toHaveBeenCalledWith(USUARIO_ID);
    expect(construirContexto).not.toHaveBeenCalledWith("usuario-falso-del-body");
    expect(llamarGemini).toHaveBeenCalledTimes(1);
    expect(validarRespuesta).toHaveBeenCalledTimes(1);
  });

  // R4
  it("pasa contexto.disponibilidad como segundo argumento a validarRespuesta (R4)", async () => {
    const contexto = configurarCaminoFeliz();
    construirContexto.mockResolvedValue(contexto);

    await generar("token-valido");

    expect(validarRespuesta.mock.calls[0][1]).toEqual(contexto.disponibilidad);
  });

  // R5
  it("responde 422 IA_INVALID_RESPONSE y NO persiste si validarRespuesta lanza (R5)", async () => {
    validarRespuesta.mockImplementation(() => {
      throw new Error("Gemini devolvió un JSON inválido.");
    });

    const res = await generar("token-valido");

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("IA_INVALID_RESPONSE");
    expect(res.body.error).toBe("Respuesta de IA inválida");
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  // R6
  it("inserta filas con generado_por_ia=true y la justificacion del modelo (R6)", async () => {
    await generar("token-valido");

    const filas = mockInsert.mock.calls[0][0];
    expect(filas).toHaveLength(2);
    for (const fila of filas) {
      expect(fila.generado_por_ia).toBe(true);
    }
    expect(filas[0].justificacion).toBe(bloquesValidados()[0].justificacion);
    expect(filas[1].justificacion).toBe(bloquesValidados()[1].justificacion);
  });

  // R7
  it("responde 422 IA_INVALID_RESPONSE y NO persiste si un tarea_id no pertenece al usuario (R7)", async () => {
    validarRespuesta.mockReturnValue([
      {
        tarea_id: "tarea-ajena-o-alucinada",
        fecha: "2026-07-06",
        hora_inicio: "18:00",
        hora_fin: "21:00",
        justificacion: "Bloque con id intruso.",
      },
    ]);

    const res = await generar("token-valido");

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("IA_INVALID_RESPONSE");
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  // R8
  it("responde 500 DB_ERROR si el insert falla, sin reportar éxito (R8)", async () => {
    mockSupabaseState.insertResult = { data: null, error: { message: "boom" } };

    const res = await generar("token-valido");

    expect(res.status).toBe(500);
    expect(res.body.code).toBe("DB_ERROR");
    expect(res.body.bloques).toBeUndefined();
  });

  // R9
  it("responde 503 IA_UNAVAILABLE y NO persiste si llamarGemini rechaza (R9)", async () => {
    llamarGemini.mockRejectedValue(new Error("Gemini no responde"));

    const res = await generar("token-valido");

    expect(res.status).toBe(503);
    expect(res.body.code).toBe("IA_UNAVAILABLE");
    expect(res.body.error).toBe("IA no disponible");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // R10
  it("los archivos de horarios consumen el módulo IA solo vía require('../services/ia') (R10)", () => {
    const SRC = path.resolve(__dirname, "..", "src");
    const archivos = [
      path.join(SRC, "services", "horariosService.js"),
      path.join(SRC, "controllers", "horariosController.js"),
      path.join(SRC, "routes", "horarios.js"),
    ];
    const prohibidos = ["@google/genai", "./gemini", "./contexto", "./validacion"];

    for (const archivo of archivos) {
      const contenido = fs.readFileSync(archivo, "utf-8");
      for (const patron of prohibidos) {
        expect(contenido).not.toContain(patron);
      }
    }
  });

  // R11
  it("borra los bloques generado_por_ia=true de las tareas del usuario ANTES de insertar (R11)", async () => {
    await generar("token-valido");

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockEq).toHaveBeenCalledWith("generado_por_ia", true);
    expect(mockIn).toHaveBeenCalledWith("tarea_id", ["tarea-1", "tarea-2"]);
    // El delete ocurre antes del insert (orden global de invocación).
    expect(mockDelete.mock.invocationCallOrder[0]).toBeLessThan(
      mockInsert.mock.invocationCallOrder[0]
    );
  });

  // R12
  it("realiza una única llamada batch a Gemini por petición (R12)", async () => {
    await generar("token-valido");

    expect(llamarGemini).toHaveBeenCalledTimes(1);
  });
});
