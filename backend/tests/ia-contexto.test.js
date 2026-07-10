const request = require("supertest");

// Requiere credenciales reales de Supabase (SUPABASE_URL + SUPABASE_SERVICE_KEY
// + SUPABASE_ANON_KEY) cargadas desde backend/.env.test por tests/setupEnv.js,
// igual que backend/tests/tareas.test.js. No mockea Supabase: crea usuarios,
// cursos, tareas y disponibilidad reales vía los endpoints públicos (correos
// únicos por test) y los borra en afterAll — el `ON DELETE CASCADE` de
// usuarios/cursos/tareas/disponibilidad limpia lo asociado
// (docs/verification.md, docs/conventions.md §8).
//
// `construirContexto` es un service (no un endpoint), así que se invoca
// directamente; los datos de entrada se siembran vía los endpoints REST.
describe("construirContexto (ia_construir_contexto) — specs/ia_construir_contexto/requirements.md", () => {
  const app = require("../src/app");
  const supabase = require("../src/services/supabase");
  const { construirContexto, normalizarHora, mapearDisponibilidad, mapearTarea } =
    require("../src/services/ia/contexto");

  const usuariosCreados = [];
  const PASSWORD_VALIDA = "Test-Password-123!";

  function correoUnico(prefix) {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return `${prefix}-${unique}@studyflow-test.local`;
  }

  function fechaFutura(dias = 7) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toISOString().slice(0, 10);
  }

  async function crearUsuarioAutenticado(prefix) {
    const correo = correoUnico(prefix);
    const registro = await request(app)
      .post("/api/auth/register")
      .send({ correo, password: PASSWORD_VALIDA, nombre: `Test ${prefix}` });
    expect(registro.status).toBe(201);
    usuariosCreados.push(registro.body.usuario.id);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ correo, password: PASSWORD_VALIDA });
    expect(login.status).toBe(200);

    return { id: registro.body.usuario.id, accessToken: login.body.access_token };
  }

  async function crearCurso(usuario, { nombre = "Cálculo II", dificultad = 3 } = {}) {
    const res = await request(app)
      .post("/api/cursos")
      .set("Authorization", `Bearer ${usuario.accessToken}`)
      .send({ nombre, color: "#3B82F6", dificultad });
    expect(res.status).toBe(201);
    return res.body.id;
  }

  async function crearTarea(usuario, curso_id, overrides = {}) {
    const res = await request(app)
      .post("/api/tareas")
      .set("Authorization", `Bearer ${usuario.accessToken}`)
      .send({
        curso_id,
        titulo: "Tarea de prueba",
        tipo: "tarea",
        fecha_limite: fechaFutura(),
        duracion_estimada_h: 2,
        prioridad: 3,
        ...overrides,
      });
    expect(res.status).toBe(201);
    return res.body;
  }

  async function cambiarEstado(usuario, tarea_id, estado) {
    const res = await request(app)
      .put(`/api/tareas/${tarea_id}`)
      .set("Authorization", `Bearer ${usuario.accessToken}`)
      .send({ estado });
    expect(res.status).toBe(200);
    return res.body;
  }

  async function crearDisponibilidad(usuario, bloque) {
    const res = await request(app)
      .post("/api/disponibilidad")
      .set("Authorization", `Bearer ${usuario.accessToken}`)
      .send(bloque);
    expect(res.status).toBe(201);
    return res.body;
  }

  afterAll(async () => {
    for (const id of usuariosCreados) {
      // Best-effort: el ON DELETE CASCADE limpia cursos, tareas y
      // disponibilidad asociados.
      // eslint-disable-next-line no-await-in-loop
      await supabase.auth.admin.deleteUser(id).catch(() => {});
    }
  }, 60000);

  describe("estructura del objeto devuelto (R1, R2)", () => {
    it("devuelve un objeto con exactamente las claves fecha_actual, disponibilidad y tareas_pendientes (R1)", async () => {
      const usuario = await crearUsuarioAutenticado("estructura");

      const ctx = await construirContexto(usuario.id);

      expect(Object.keys(ctx).sort()).toEqual([
        "disponibilidad",
        "fecha_actual",
        "tareas_pendientes",
      ]);
      expect(Array.isArray(ctx.disponibilidad)).toBe(true);
      expect(Array.isArray(ctx.tareas_pendientes)).toBe(true);
    }, 15000);

    it("fija fecha_actual con formato YYYY-MM-DD y valor de la fecha de calendario actual (R2)", async () => {
      const usuario = await crearUsuarioAutenticado("fecha");

      const ctx = await construirContexto(usuario.id);

      expect(ctx.fecha_actual).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(ctx.fecha_actual).toBe(new Date().toISOString().slice(0, 10));
    }, 15000);
  });

  describe("disponibilidad (R3, R6)", () => {
    it("mapea cada bloque a {dia, inicio, fin} con horas en HH:MM y sin campos extra (R3, R6)", async () => {
      const usuario = await crearUsuarioAutenticado("disp");
      await crearDisponibilidad(usuario, {
        dia_semana: "lunes",
        hora_inicio: "18:00",
        hora_fin: "21:00",
      });

      const ctx = await construirContexto(usuario.id);

      expect(ctx.disponibilidad).toHaveLength(1);
      const bloque = ctx.disponibilidad[0];
      expect(Object.keys(bloque).sort()).toEqual(["dia", "fin", "inicio"]);
      expect(bloque).toEqual({ dia: "lunes", inicio: "18:00", fin: "21:00" });
      expect(bloque.inicio).toMatch(/^\d{2}:\d{2}$/);
      expect(bloque.fin).toMatch(/^\d{2}:\d{2}$/);
      // R6 — sin id de fila, usuario_id ni segundos en las horas.
      expect(bloque).not.toHaveProperty("id");
      expect(bloque).not.toHaveProperty("usuario_id");
    }, 15000);
  });

  describe("tareas_pendientes (R4, R5, R6)", () => {
    it("mapea cada tarea a las claves exactas y toma dificultad del curso y prioridad_usuario de la tarea (R4, R5, R6)", async () => {
      const usuario = await crearUsuarioAutenticado("tareas");
      const curso = await crearCurso(usuario, { nombre: "Cálculo II", dificultad: 5 });
      const fecha_limite = fechaFutura(3);
      const tarea = await crearTarea(usuario, curso, {
        titulo: "Examen parcial",
        tipo: "examen",
        fecha_limite,
        duracion_estimada_h: 3,
        prioridad: 5,
      });

      const ctx = await construirContexto(usuario.id);

      expect(ctx.tareas_pendientes).toHaveLength(1);
      const item = ctx.tareas_pendientes[0];
      // R4 — claves exactas, sin extras.
      expect(Object.keys(item).sort()).toEqual([
        "curso",
        "dificultad",
        "duracion_estimada_h",
        "fecha_limite",
        "id",
        "prioridad_usuario",
      ]);
      // R5 — procedencia de cada valor.
      expect(item.id).toBe(tarea.id);
      expect(item.curso).toBe("Cálculo II");
      expect(item.dificultad).toBe(5); // de cursos.dificultad
      expect(item.prioridad_usuario).toBe(5); // de tareas.prioridad
      expect(item.fecha_limite).toBe(fecha_limite);
      expect(Number(item.duracion_estimada_h)).toBe(3);
      // R6 — sin campos irrelevantes/de auditoría.
      expect(item).not.toHaveProperty("titulo");
      expect(item).not.toHaveProperty("tipo");
      expect(item).not.toHaveProperty("estado");
      expect(item).not.toHaveProperty("curso_id");
      expect(item).not.toHaveProperty("usuario_id");
    }, 20000);
  });

  describe("filtrado por estado (R7)", () => {
    it("incluye solo tareas pendiente y en_progreso, nunca completada (R7)", async () => {
      const usuario = await crearUsuarioAutenticado("estados");
      const curso = await crearCurso(usuario);

      const pendiente = await crearTarea(usuario, curso, { titulo: "Pendiente" });
      const enProgreso = await crearTarea(usuario, curso, { titulo: "En progreso" });
      await cambiarEstado(usuario, enProgreso.id, "en_progreso");
      const completada = await crearTarea(usuario, curso, { titulo: "Completada" });
      await cambiarEstado(usuario, completada.id, "completada");

      const ctx = await construirContexto(usuario.id);

      const ids = ctx.tareas_pendientes.map((t) => t.id).sort();
      expect(ids).toEqual([pendiente.id, enProgreso.id].sort());
      expect(ids).not.toContain(completada.id);
    }, 30000);
  });

  describe("aislamiento por usuario (R8)", () => {
    it("no incluye disponibilidad ni tareas de otro usuario (R8)", async () => {
      const usuarioA = await crearUsuarioAutenticado("aisl-a");
      const usuarioB = await crearUsuarioAutenticado("aisl-b");

      const cursoA = await crearCurso(usuarioA, { nombre: "Curso A" });
      const tareaA = await crearTarea(usuarioA, cursoA, { titulo: "Tarea A" });
      await crearDisponibilidad(usuarioA, {
        dia_semana: "lunes",
        hora_inicio: "08:00",
        hora_fin: "10:00",
      });

      const cursoB = await crearCurso(usuarioB, { nombre: "Curso B" });
      const tareaB = await crearTarea(usuarioB, cursoB, { titulo: "Tarea B" });
      await crearDisponibilidad(usuarioB, {
        dia_semana: "martes",
        hora_inicio: "12:00",
        hora_fin: "14:00",
      });

      const ctx = await construirContexto(usuarioA.id);

      const idsTareas = ctx.tareas_pendientes.map((t) => t.id);
      expect(idsTareas).toContain(tareaA.id);
      expect(idsTareas).not.toContain(tareaB.id);

      const cursos = ctx.tareas_pendientes.map((t) => t.curso);
      expect(cursos).not.toContain("Curso B");

      const dias = ctx.disponibilidad.map((d) => d.dia);
      expect(dias).toContain("lunes");
      expect(dias).not.toContain("martes");
    }, 30000);
  });

  describe("estado vacío (R9)", () => {
    it("devuelve arrays vacíos (no null) cuando el usuario no tiene datos, con fecha_actual presente (R9)", async () => {
      const usuario = await crearUsuarioAutenticado("vacio");

      const ctx = await construirContexto(usuario.id);

      expect(ctx.disponibilidad).toEqual([]);
      expect(ctx.tareas_pendientes).toEqual([]);
      expect(ctx.disponibilidad).not.toBeNull();
      expect(ctx.tareas_pendientes).not.toBeNull();
      expect(ctx.fecha_actual).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }, 15000);
  });

  describe("helpers puros de transformación (R3, R5, R6) — sin Supabase", () => {
    it("normalizarHora convierte HH:MM:SS a HH:MM y deja HH:MM intacto (R3)", () => {
      expect(normalizarHora("18:00:00")).toBe("18:00");
      expect(normalizarHora("09:30:45")).toBe("09:30");
      expect(normalizarHora("21:00")).toBe("21:00");
    });

    it("mapearDisponibilidad produce {dia, inicio, fin} con horas normalizadas y sin campos extra (R3, R6)", () => {
      const fila = {
        id: "disp-1",
        usuario_id: "user-1",
        dia_semana: "miercoles",
        hora_inicio: "17:00:00",
        hora_fin: "20:00:00",
      };

      const resultado = mapearDisponibilidad(fila);

      expect(resultado).toEqual({ dia: "miercoles", inicio: "17:00", fin: "20:00" });
      expect(Object.keys(resultado).sort()).toEqual(["dia", "fin", "inicio"]);
    });

    it("mapearTarea toma dificultad/curso del curso embebido y prioridad_usuario de la tarea, sin campos extra (R5, R6)", () => {
      const fila = {
        id: "t12",
        titulo: "no debe aparecer",
        tipo: "examen",
        estado: "pendiente",
        curso_id: "c1",
        fecha_limite: "2025-07-10",
        duracion_estimada_h: 3,
        prioridad: 5,
        cursos: { nombre: "Cálculo II", dificultad: 5, usuario_id: "user-1" },
      };

      const resultado = mapearTarea(fila);

      expect(resultado).toEqual({
        id: "t12",
        curso: "Cálculo II",
        dificultad: 5,
        fecha_limite: "2025-07-10",
        duracion_estimada_h: 3,
        prioridad_usuario: 5,
      });
      expect(Object.keys(resultado).sort()).toEqual([
        "curso",
        "dificultad",
        "duracion_estimada_h",
        "fecha_limite",
        "id",
        "prioridad_usuario",
      ]);
    });
  });
});
