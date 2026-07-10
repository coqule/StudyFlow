const request = require("supertest");

// Requiere credenciales reales de Supabase (SUPABASE_URL + SUPABASE_SERVICE_KEY
// + SUPABASE_ANON_KEY) cargadas desde backend/.env.test por
// tests/setupEnv.js, igual que backend/tests/cursos.test.js. No mockea
// Supabase: crea usuarios y cursos reales vía endpoints/cliente de servicio
// (correos únicos por test) y los borra en afterAll — el `ON DELETE CASCADE`
// de `usuarios`/`cursos`/`tareas` limpia también las tareas creadas
// (docs/verification.md, docs/conventions.md §8).
describe("CRUD de tareas (tareas_crud) — specs/tareas_crud/requirements.md", () => {
  const app = require("../src/app");
  const supabase = require("../src/services/supabase");

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

  function fechaPasada(dias = 1) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
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

  async function crearCursoPropio(usuario, nombre = "Cálculo II") {
    const res = await request(app)
      .post("/api/cursos")
      .set("Authorization", `Bearer ${usuario.accessToken}`)
      .send({ nombre, color: "#3B82F6", dificultad: 3 });
    expect(res.status).toBe(201);
    return res.body.id;
  }

  afterAll(async () => {
    for (const id of usuariosCreados) {
      // Best-effort: no debe romper la suite si un usuario ya fue borrado.
      // El ON DELETE CASCADE se encarga de cursos y tareas asociados.
      // eslint-disable-next-line no-await-in-loop
      await supabase.auth.admin.deleteUser(id).catch(() => {});
    }
  });

  describe("GET /api/tareas", () => {
    it("responde 200 con lista vacía si el usuario no tiene tareas (R2)", async () => {
      const usuario = await crearUsuarioAutenticado("get-vacio");

      const res = await request(app)
        .get("/api/tareas")
        .set("Authorization", `Bearer ${usuario.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tareas).toEqual([]);
    }, 10000);

    it("responde 200 con únicamente las tareas cuyo curso pertenece al usuario autenticado (R1)", async () => {
      const usuarioA = await crearUsuarioAutenticado("get-propio-a");
      const usuarioB = await crearUsuarioAutenticado("get-propio-b");
      const cursoA = await crearCursoPropio(usuarioA, "Cálculo II");
      const cursoB = await crearCursoPropio(usuarioB, "Física I");

      await request(app)
        .post("/api/tareas")
        .set("Authorization", `Bearer ${usuarioA.accessToken}`)
        .send({
          curso_id: cursoA,
          titulo: "Tarea A",
          tipo: "tarea",
          fecha_limite: fechaFutura(),
          duracion_estimada_h: 2,
          prioridad: 3,
        });

      await request(app)
        .post("/api/tareas")
        .set("Authorization", `Bearer ${usuarioB.accessToken}`)
        .send({
          curso_id: cursoB,
          titulo: "Tarea B",
          tipo: "tarea",
          fecha_limite: fechaFutura(),
          duracion_estimada_h: 2,
          prioridad: 3,
        });

      const res = await request(app)
        .get("/api/tareas")
        .set("Authorization", `Bearer ${usuarioA.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tareas).toHaveLength(1);
      expect(res.body.tareas[0]).toMatchObject({
        titulo: "Tarea A",
        curso_id: cursoA,
      });
    }, 20000);
  });

  describe("POST /api/tareas", () => {
    it("crea la tarea con estado 'pendiente' y responde 201 (R3)", async () => {
      const usuario = await crearUsuarioAutenticado("post-happy");
      const curso = await crearCursoPropio(usuario);

      const res = await request(app)
        .post("/api/tareas")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({
          curso_id: curso,
          titulo: "Examen parcial",
          tipo: "examen",
          fecha_limite: fechaFutura(),
          duracion_estimada_h: 3,
          prioridad: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        titulo: "Examen parcial",
        tipo: "examen",
        prioridad: 5,
        estado: "pendiente",
        curso_id: curso,
      });
      expect(res.body.id).toEqual(expect.any(String));
    }, 15000);

    it("responde 400 VALIDATION_ERROR si tipo no es válido y no crea la tarea (R4)", async () => {
      const usuario = await crearUsuarioAutenticado("post-tipo-invalido");
      const curso = await crearCursoPropio(usuario);

      const res = await request(app)
        .post("/api/tareas")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({
          curso_id: curso,
          titulo: "Tarea X",
          tipo: "no-existe",
          fecha_limite: fechaFutura(),
          duracion_estimada_h: 2,
          prioridad: 3,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");

      const lista = await request(app)
        .get("/api/tareas")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.tareas).toEqual([]);
    }, 15000);

    it("responde 400 VALIDATION_ERROR si prioridad está fuera de 1-5 y no crea la tarea (R5)", async () => {
      const usuario = await crearUsuarioAutenticado("post-prioridad-invalida");
      const curso = await crearCursoPropio(usuario);

      const res = await request(app)
        .post("/api/tareas")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({
          curso_id: curso,
          titulo: "Tarea X",
          tipo: "tarea",
          fecha_limite: fechaFutura(),
          duracion_estimada_h: 2,
          prioridad: 9,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");

      const lista = await request(app)
        .get("/api/tareas")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.tareas).toEqual([]);
    }, 15000);

    it("responde 400 VALIDATION_ERROR si fecha_limite no es futura y no crea la tarea (R6)", async () => {
      const usuario = await crearUsuarioAutenticado("post-fecha-invalida");
      const curso = await crearCursoPropio(usuario);

      const res = await request(app)
        .post("/api/tareas")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({
          curso_id: curso,
          titulo: "Tarea X",
          tipo: "tarea",
          fecha_limite: fechaPasada(),
          duracion_estimada_h: 2,
          prioridad: 3,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");

      const lista = await request(app)
        .get("/api/tareas")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.tareas).toEqual([]);
    }, 15000);

    it("responde 403 FORBIDDEN si curso_id no pertenece al usuario y no crea la tarea (R7)", async () => {
      const dueno = await crearUsuarioAutenticado("post-curso-ajeno-dueno");
      const otro = await crearUsuarioAutenticado("post-curso-ajeno-otro");
      const cursoDeOtro = await crearCursoPropio(dueno);

      const res = await request(app)
        .post("/api/tareas")
        .set("Authorization", `Bearer ${otro.accessToken}`)
        .send({
          curso_id: cursoDeOtro,
          titulo: "Tarea intrusa",
          tipo: "tarea",
          fecha_limite: fechaFutura(),
          duracion_estimada_h: 2,
          prioridad: 3,
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");

      const lista = await request(app)
        .get("/api/tareas")
        .set("Authorization", `Bearer ${otro.accessToken}`);
      expect(lista.body.tareas).toEqual([]);
    }, 20000);
  });

  describe("PUT /api/tareas/:id", () => {
    it("actualiza una tarea propia y responde 200 con el objeto actualizado, persistiendo los cambios (R8, R17)", async () => {
      const usuario = await crearUsuarioAutenticado("put-happy");
      const curso = await crearCursoPropio(usuario);

      const creada = await request(app)
        .post("/api/tareas")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({
          curso_id: curso,
          titulo: "Tarea original",
          tipo: "tarea",
          fecha_limite: fechaFutura(),
          duracion_estimada_h: 2,
          prioridad: 3,
        });

      const res = await request(app)
        .put(`/api/tareas/${creada.body.id}`)
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ titulo: "Tarea actualizada", prioridad: 5 });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ titulo: "Tarea actualizada", prioridad: 5 });

      // GET tras PUT confirma persistencia (R17).
      const lista = await request(app)
        .get("/api/tareas")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.tareas[0]).toMatchObject({
        titulo: "Tarea actualizada",
        prioridad: 5,
      });
    }, 15000);

    it("responde 403 FORBIDDEN sobre una tarea ajena y no la modifica (R9)", async () => {
      const dueno = await crearUsuarioAutenticado("put-ajeno-dueno");
      const otro = await crearUsuarioAutenticado("put-ajeno-otro");
      const curso = await crearCursoPropio(dueno);

      const creada = await request(app)
        .post("/api/tareas")
        .set("Authorization", `Bearer ${dueno.accessToken}`)
        .send({
          curso_id: curso,
          titulo: "Tarea del dueño",
          tipo: "tarea",
          fecha_limite: fechaFutura(),
          duracion_estimada_h: 2,
          prioridad: 3,
        });

      const res = await request(app)
        .put(`/api/tareas/${creada.body.id}`)
        .set("Authorization", `Bearer ${otro.accessToken}`)
        .send({ titulo: "Hackeado" });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");

      const lista = await request(app)
        .get("/api/tareas")
        .set("Authorization", `Bearer ${dueno.accessToken}`);
      expect(lista.body.tareas[0]).toMatchObject({ titulo: "Tarea del dueño" });
    }, 20000);

    it("responde 400 VALIDATION_ERROR con prioridad fuera de rango y no modifica la tarea (R10)", async () => {
      const usuario = await crearUsuarioAutenticado("put-prioridad-invalida");
      const curso = await crearCursoPropio(usuario);

      const creada = await request(app)
        .post("/api/tareas")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({
          curso_id: curso,
          titulo: "Tarea X",
          tipo: "tarea",
          fecha_limite: fechaFutura(),
          duracion_estimada_h: 2,
          prioridad: 3,
        });

      const res = await request(app)
        .put(`/api/tareas/${creada.body.id}`)
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ prioridad: 9 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");

      const lista = await request(app)
        .get("/api/tareas")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.tareas[0]).toMatchObject({ prioridad: 3 });
    }, 15000);
  });

  describe("DELETE /api/tareas/:id", () => {
    it("elimina una tarea propia y responde 200 o 204 (R11)", async () => {
      const usuario = await crearUsuarioAutenticado("delete-happy");
      const curso = await crearCursoPropio(usuario);

      const creada = await request(app)
        .post("/api/tareas")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({
          curso_id: curso,
          titulo: "Tarea a eliminar",
          tipo: "tarea",
          fecha_limite: fechaFutura(),
          duracion_estimada_h: 2,
          prioridad: 3,
        });

      const res = await request(app)
        .delete(`/api/tareas/${creada.body.id}`)
        .set("Authorization", `Bearer ${usuario.accessToken}`);

      expect([200, 204]).toContain(res.status);

      const lista = await request(app)
        .get("/api/tareas")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.tareas).toEqual([]);
    }, 15000);

    it("responde 403 FORBIDDEN sobre una tarea ajena y no la elimina (R12)", async () => {
      const dueno = await crearUsuarioAutenticado("delete-ajeno-dueno");
      const otro = await crearUsuarioAutenticado("delete-ajeno-otro");
      const curso = await crearCursoPropio(dueno);

      const creada = await request(app)
        .post("/api/tareas")
        .set("Authorization", `Bearer ${dueno.accessToken}`)
        .send({
          curso_id: curso,
          titulo: "Tarea del dueño",
          tipo: "tarea",
          fecha_limite: fechaFutura(),
          duracion_estimada_h: 2,
          prioridad: 3,
        });

      const res = await request(app)
        .delete(`/api/tareas/${creada.body.id}`)
        .set("Authorization", `Bearer ${otro.accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");

      const lista = await request(app)
        .get("/api/tareas")
        .set("Authorization", `Bearer ${dueno.accessToken}`);
      expect(lista.body.tareas).toHaveLength(1);
    }, 20000);
  });
});
