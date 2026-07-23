const fs = require("fs");
const path = require("path");
const request = require("supertest");

// Estrategia de mockeo (specs/ia_endpoint_ajustar/design.md §8): NO se hacen
// llamadas de red reales a Gemini ni a Supabase. Se mockea el MÓDULO IA
// completo y el cliente de Supabase. El auth se ejercita con el middleware
// real `requireAuth`, alimentado por el `supabase.auth.getUser` mockeado, para
// inyectar `req.usuario_id` sin depender de un JWT real (mismo criterio que
// horarios-generar.test.js).
//
// Los nombres de los espías llevan prefijo `mock` porque babel-plugin-jest-hoist
// solo permite que el factory de `jest.mock` (elevado al top del archivo)
// referencie variables externas cuyo nombre empieza por `mock`.

// MOCK: módulo IA desactivado en este test
jest.mock("../src/services/ia", () => ({
  construirContexto: jest.fn(),
  llamarGemini: jest.fn(),
  validarRespuesta: jest.fn(),
  validarRespuestaAjuste: jest.fn(),
  ANEXO_MODO_AJUSTE: "ANEXO_MODO_AJUSTE_FIXTURE",
}));

// MOCK: Supabase desactivado en este test.
// Estado reconfigurable por test (se muta, no se reasigna, para que el factory
// hoisted siga viendo la misma referencia).
const mockSupabaseState = {
  vigenteResult: { data: [], error: null },
  deleteResult: { error: null },
  insertResult: { data: [], error: null },
};
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockSelectEq = jest.fn();
const mockDelete = jest.fn();
const mockDeleteEq = jest.fn();
const mockIn = jest.fn();
const mockInsert = jest.fn();
const mockInsertSelect = jest.fn();
const mockGetUser = jest.fn();

jest.mock("../src/services/supabase", () => {
  // Builder encadenable que cubre las tres cadenas usadas por el service:
  //   - select(...).eq(...)        → lectura del horario vigente
  //   - delete().in("id", ids)     → borrado incremental (y eq como espía
  //     para detectar filtros amplios prohibidos — T23)
  //   - insert(filas).select(...)  → inserción con retorno de filas
  const builder = {
    select: (...a) => {
      mockSelect(...a);
      return {
        eq: (...b) => {
          mockSelectEq(...b);
          return Promise.resolve(mockSupabaseState.vigenteResult);
        },
      };
    },
    delete: (...a) => {
      mockDelete(...a);
      const cadenaDelete = {
        eq: (...b) => {
          mockDeleteEq(...b);
          return cadenaDelete;
        },
        in: (...b) => {
          mockIn(...b);
          return Promise.resolve(mockSupabaseState.deleteResult);
        },
      };
      return cadenaDelete;
    },
    insert: (...a) => {
      mockInsert(...a);
      return {
        select: (...b) => {
          mockInsertSelect(...b);
          return Promise.resolve(mockSupabaseState.insertResult);
        },
      };
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
const {
  construirContexto,
  llamarGemini,
  validarRespuestaAjuste,
  ANEXO_MODO_AJUSTE,
} = require("../src/services/ia");

const USUARIO_ID = "usuario-token-1";
const INSTRUCCION = "el examen de Cálculo II se adelantó para mañana";

// Contexto base calcado del formato de docs/reglas-ia.md.
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

// Filas del horario vigente tal como las devuelve Supabase (horas HH:MM:SS y
// join auxiliar de propiedad incluidos — el service debe normalizar/limpiar).
function vigenteFilasSupabase() {
  return [
    {
      id: "bloque-viejo-1",
      tarea_id: "tarea-1",
      fecha: "2026-07-06",
      hora_inicio: "18:00:00",
      hora_fin: "20:00:00",
      generado_por_ia: true,
      tareas: { cursos: { usuario_id: USUARIO_ID } },
    },
    {
      id: "bloque-intacto-2",
      tarea_id: "tarea-2",
      fecha: "2026-07-07",
      hora_inicio: "14:00:00",
      hora_fin: "15:00:00",
      generado_por_ia: false,
      tareas: { cursos: { usuario_id: USUARIO_ID } },
    },
  ];
}

// Resultado que devuelve validarRespuestaAjuste (mockeada) en el camino feliz.
function resultadoValidado() {
  return {
    eliminados: ["bloque-viejo-1"],
    creados: [
      {
        tarea_id: "tarea-1",
        fecha: "2026-07-07",
        hora_inicio: "14:00",
        hora_fin: "16:00",
        justificacion: "El examen se adelantó: se estudia el día anterior.",
      },
    ],
  };
}

// Filas persistidas (con id asignado por Postgres).
function filasPersistidas() {
  return resultadoValidado().creados.map((b, i) => ({
    id: `bloque-nuevo-${i + 1}`,
    tarea_id: b.tarea_id,
    fecha: b.fecha,
    hora_inicio: b.hora_inicio,
    hora_fin: b.hora_fin,
    generado_por_ia: true,
    justificacion: b.justificacion,
  }));
}

function ajustar(token, body) {
  const req = request(app).post("/api/horarios/ajustar");
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req.send(body === undefined ? { instruccion: INSTRUCCION } : body);
}

// Configura el camino feliz por defecto.
function configurarCaminoFeliz() {
  construirContexto.mockResolvedValue(contextoFixture());
  llamarGemini.mockResolvedValue("RAW_JSON_AJUSTE");
  validarRespuestaAjuste.mockReturnValue(resultadoValidado());
  mockSupabaseState.vigenteResult = { data: vigenteFilasSupabase(), error: null };
  mockSupabaseState.deleteResult = { error: null };
  mockSupabaseState.insertResult = { data: filasPersistidas(), error: null };
  mockGetUser.mockResolvedValue({ data: { user: { id: USUARIO_ID } }, error: null });
}

describe("POST /api/horarios/ajustar (ia_endpoint_ajustar) — specs/ia_endpoint_ajustar/requirements.md", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configurarCaminoFeliz();
  });

  // R1 — T15
  it("responde 401 si no hay JWT válido, sin ejecutar el flujo IA (R1)", async () => {
    const res = await ajustar(null);

    expect(res.status).toBe(401);
    expect(construirContexto).not.toHaveBeenCalled();
    expect(llamarGemini).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // R2 — T16 (DECISIÓN A)
  it.each([
    ["body sin instruccion", {}],
    ["instruccion vacía", { instruccion: "" }],
    ["instruccion de solo espacios", { instruccion: "   " }],
    ["instruccion no-string", { instruccion: 42 }],
  ])(
    "responde 400 VALIDATION_ERROR con %s, sin invocar el módulo IA (R2)",
    async (_caso, body) => {
      const res = await ajustar("token-valido", body);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(construirContexto).not.toHaveBeenCalled();
      expect(llamarGemini).not.toHaveBeenCalled();
      expect(validarRespuestaAjuste).not.toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
    }
  );

  // R3 — T17
  it("construye el contexto de ajuste con el usuario_id del token y lo extiende con horario_vigente e instruccion_usuario (R3)", async () => {
    const res = await ajustar("token-valido", {
      instruccion: INSTRUCCION,
      usuario_id: "usuario-falso-del-body",
    });

    expect(res.status).toBe(200);
    expect(construirContexto).toHaveBeenCalledTimes(1);
    expect(construirContexto).toHaveBeenCalledWith(USUARIO_ID);
    expect(construirContexto).not.toHaveBeenCalledWith("usuario-falso-del-body");

    const contextoEnviado = llamarGemini.mock.calls[0][0];
    // Claves base + exactamente las dos claves adicionales del modo ajuste.
    expect(Object.keys(contextoEnviado).sort()).toEqual(
      [
        "fecha_actual",
        "disponibilidad",
        "tareas_pendientes",
        "horario_vigente",
        "instruccion_usuario",
      ].sort()
    );
    expect(contextoEnviado.instruccion_usuario).toBe(INSTRUCCION);
    // Horario vigente con horas normalizadas HH:MM y sin el join auxiliar.
    expect(contextoEnviado.horario_vigente).toEqual([
      {
        id: "bloque-viejo-1",
        tarea_id: "tarea-1",
        fecha: "2026-07-06",
        hora_inicio: "18:00",
        hora_fin: "20:00",
        generado_por_ia: true,
      },
      {
        id: "bloque-intacto-2",
        tarea_id: "tarea-2",
        fecha: "2026-07-07",
        hora_inicio: "14:00",
        hora_fin: "15:00",
        generado_por_ia: false,
      },
    ]);
  });

  // R4 — T18 (ADR-002)
  it("invoca llamarGemini una sola vez con ANEXO_MODO_AJUSTE como prompt adicional, sin la instrucción del usuario en él (R4)", async () => {
    await ajustar("token-valido");

    expect(llamarGemini).toHaveBeenCalledTimes(1);
    const promptAdicional = llamarGemini.mock.calls[0][1];
    expect(promptAdicional).toBe(ANEXO_MODO_AJUSTE);
    expect(promptAdicional).not.toContain(INSTRUCCION);
  });

  // R10 — T19
  it("responde 422 IA_INVALID_RESPONSE sin tocar la BD si validarRespuestaAjuste lanza (R10)", async () => {
    validarRespuestaAjuste.mockImplementation(() => {
      throw new Error("Gemini devolvió un JSON inválido.");
    });

    const res = await ajustar("token-valido");

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("IA_INVALID_RESPONSE");
    expect(res.body.error).toBe("Respuesta de IA inválida");
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // R8 — T20 (DECISIÓN B)
  it("responde 422 sin tocar la BD si un bloque creado tiene un tarea_id ajeno a tareas_pendientes (R8)", async () => {
    validarRespuestaAjuste.mockReturnValue({
      eliminados: [],
      creados: [
        {
          tarea_id: "tarea-ajena-o-alucinada",
          fecha: "2026-07-07",
          hora_inicio: "14:00",
          hora_fin: "16:00",
          justificacion: "Bloque con id intruso.",
        },
      ],
    });

    const res = await ajustar("token-valido");

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("IA_INVALID_RESPONSE");
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // R9 — T21 (DECISIÓN B)
  it("responde 422 sin tocar la BD si un id de bloques_eliminados no existe en el horario vigente del usuario (R9)", async () => {
    validarRespuestaAjuste.mockReturnValue({
      eliminados: ["bloque-ajeno-o-alucinado"],
      creados: [],
    });

    const res = await ajustar("token-valido");

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("IA_INVALID_RESPONSE");
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // R11, R12 — T22
  it("camino feliz: 200 con bloques_eliminados y bloques_creados; delete exacto antes del insert; filas con generado_por_ia y justificacion del modelo (R11, R12)", async () => {
    const res = await ajustar("token-valido");

    expect(res.status).toBe(200);
    expect(res.body.bloques_eliminados).toEqual(["bloque-viejo-1"]);
    expect(Array.isArray(res.body.bloques_creados)).toBe(true);
    expect(res.body.bloques_creados).toHaveLength(1);
    for (const bloque of res.body.bloques_creados) {
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

    // El delete recibió EXACTAMENTE los ids del modelo y ocurrió antes del insert.
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockIn).toHaveBeenCalledWith("id", ["bloque-viejo-1"]);
    expect(mockDelete.mock.invocationCallOrder[0]).toBeLessThan(
      mockInsert.mock.invocationCallOrder[0]
    );

    // Las filas insertadas llevan generado_por_ia: true y la justificacion del modelo.
    const filas = mockInsert.mock.calls[0][0];
    expect(filas).toHaveLength(1);
    for (const fila of filas) {
      expect(fila.generado_por_ia).toBe(true);
    }
    expect(filas[0].justificacion).toBe(resultadoValidado().creados[0].justificacion);
  });

  // R11 (A2) — T23
  it("incrementalidad: el delete solo filtra por in('id', eliminados), sin filtros amplios (R11)", async () => {
    await ajustar("token-valido");

    // Ningún eq() en la cadena del delete (nada de eq('generado_por_ia', true)).
    expect(mockDeleteEq).not.toHaveBeenCalled();
    // Un único in(), sobre la columna id, con exactamente los ids del modelo.
    expect(mockIn).toHaveBeenCalledTimes(1);
    expect(mockIn).toHaveBeenCalledWith("id", ["bloque-viejo-1"]);
  });

  // R11 — T24
  it("responde 500 DB_ERROR si el delete falla (R11)", async () => {
    mockSupabaseState.deleteResult = { error: { message: "boom" } };

    const res = await ajustar("token-valido");

    expect(res.status).toBe(500);
    expect(res.body.code).toBe("DB_ERROR");
    expect(res.body.bloques_creados).toBeUndefined();
  });

  it("responde 500 DB_ERROR si el insert falla (R11)", async () => {
    mockSupabaseState.insertResult = { data: null, error: { message: "boom" } };

    const res = await ajustar("token-valido");

    expect(res.status).toBe(500);
    expect(res.body.code).toBe("DB_ERROR");
    expect(res.body.bloques_creados).toBeUndefined();
  });

  it("responde 500 DB_ERROR si falla la lectura del horario vigente (R3)", async () => {
    mockSupabaseState.vigenteResult = { data: null, error: { message: "boom" } };

    const res = await ajustar("token-valido");

    expect(res.status).toBe(500);
    expect(res.body.code).toBe("DB_ERROR");
    expect(llamarGemini).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // R13 — T25
  it("responde 503 IA_UNAVAILABLE sin tocar la BD si llamarGemini rechaza (R13)", async () => {
    llamarGemini.mockRejectedValue(new Error("Gemini no responde"));

    const res = await ajustar("token-valido");

    expect(res.status).toBe(503);
    expect(res.body.code).toBe("IA_UNAVAILABLE");
    expect(res.body.error).toBe("IA no disponible");
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // R14 — T26
  it("los archivos de horarios consumen el módulo IA solo vía require('../services/ia') (R14)", () => {
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
});
