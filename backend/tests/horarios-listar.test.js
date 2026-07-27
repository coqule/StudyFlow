const request = require("supertest");

// Estrategia de mockeo (specs/horarios_vista/design.md §8): sin llamadas de red
// reales. Se mockea el cliente de Supabase y `auth.getUser` (para alimentar el
// middleware real `requireAuth` e inyectar `req.usuario_id` sin JWT real), mismo
// criterio que horarios-generar.test.js. Este endpoint NO usa el módulo IA.
//
// La cadena que ejercita `listarHorario` es:
//   supabase.from("bloques_horario").select(<cols>).eq(<filtro>, usuario_id)
// donde `.eq()` es el punto await-eable. El builder de este archivo resuelve
// `.eq()` con un estado reconfigurable por test.

const mockSupabaseState = {
  selectResult: { data: [], error: null },
  getUserResult: { data: { user: { id: "usuario-token-1" } }, error: null },
};
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockGetUser = jest.fn();

jest.mock("../src/services/supabase", () => {
  const builder = {
    select: (...a) => {
      mockSelect(...a);
      return builder;
    },
    eq: (...a) => {
      mockEq(...a);
      return Promise.resolve(mockSupabaseState.selectResult);
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

const USUARIO_ID = "usuario-token-1";

// Filas tal como las devuelve Supabase con el JOIN anidado
// bloques_horario → tareas → cursos (horas con segundos, como PostgreSQL).
function filasCrudas() {
  return [
    {
      id: "bloque-1",
      tarea_id: "tarea-1",
      fecha: "2026-07-06",
      hora_inicio: "18:00:00",
      hora_fin: "21:00:00",
      generado_por_ia: true,
      justificacion: "Cálculo II: fecha límite más próxima.",
      tareas: {
        titulo: "Examen Cálculo II",
        tipo: "examen",
        prioridad: 5,
        cursos: { nombre: "Cálculo II", color: "#3B82F6", usuario_id: USUARIO_ID },
      },
    },
    {
      id: "bloque-2",
      tarea_id: "tarea-2",
      fecha: "2026-07-07",
      hora_inicio: "14:00:00",
      hora_fin: "16:00:00",
      generado_por_ia: false,
      justificacion: "Movido manualmente.",
      tareas: {
        titulo: "TP Física",
        tipo: "tarea",
        prioridad: 2,
        cursos: { nombre: "Física", color: "#EF4444", usuario_id: USUARIO_ID },
      },
    },
  ];
}

function listar(token) {
  const req = request(app).get("/api/horarios");
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req.send();
}

function configurarCaminoFeliz() {
  mockSupabaseState.selectResult = { data: filasCrudas(), error: null };
  mockSupabaseState.getUserResult = { data: { user: { id: USUARIO_ID } }, error: null };
  mockGetUser.mockResolvedValue(mockSupabaseState.getUserResult);
}

describe("GET /api/horarios (horarios_vista) — specs/horarios_vista/requirements.md", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configurarCaminoFeliz();
  });

  // R6
  it("responde 401 sin JWT válido y no consulta la base de datos (R6)", async () => {
    const res = await listar(null);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // R1, R7 — filtra por el usuario del token
  it("filtra bloques por el usuario_id del token (R1, R7)", async () => {
    await listar("token-valido");

    expect(mockFrom).toHaveBeenCalledWith("bloques_horario");
    expect(mockEq).toHaveBeenCalledWith("tareas.cursos.usuario_id", USUARIO_ID);
  });

  // R1, R2, R3 — shape aplanado del contrato + campos extendidos + horas HH:MM
  it("responde 200 con bloques aplanados al shape del contrato y horas HH:MM (R1, R2, R3)", async () => {
    const res = await listar("token-valido");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.bloques)).toBe(true);
    expect(res.body.bloques).toHaveLength(2);

    const [primero] = res.body.bloques;
    expect(primero).toEqual({
      id: "bloque-1",
      tarea_id: "tarea-1",
      tarea_titulo: "Examen Cálculo II",
      tarea_tipo: "examen",
      tarea_prioridad: 5,
      curso_nombre: "Cálculo II",
      curso_color: "#3B82F6",
      fecha: "2026-07-06",
      hora_inicio: "18:00",
      hora_fin: "21:00",
      generado_por_ia: true,
      justificacion: "Cálculo II: fecha límite más próxima.",
    });
    // No se filtra el join anidado crudo hacia el cliente.
    expect(primero.tareas).toBeUndefined();
  });

  // R4 — estado vacío
  it("responde 200 con bloques vacíos cuando el usuario no tiene bloques (R4)", async () => {
    mockSupabaseState.selectResult = { data: [], error: null };

    const res = await listar("token-valido");

    expect(res.status).toBe(200);
    expect(res.body.bloques).toEqual([]);
  });

  // R4 — data null también se trata como vacío
  it("trata data null como lista vacía (R4)", async () => {
    mockSupabaseState.selectResult = { data: null, error: null };

    const res = await listar("token-valido");

    expect(res.status).toBe(200);
    expect(res.body.bloques).toEqual([]);
  });

  // R5 — error de DB
  it("responde 500 DB_ERROR cuando la consulta falla, sin exponer el detalle (R5)", async () => {
    mockSupabaseState.selectResult = { data: null, error: { message: "boom interno" } };

    const res = await listar("token-valido");

    expect(res.status).toBe(500);
    expect(res.body.code).toBe("DB_ERROR");
    expect(JSON.stringify(res.body)).not.toContain("boom interno");
  });
});
