const request = require("supertest");

// Requiere credenciales reales de Supabase (SUPABASE_URL + SUPABASE_SERVICE_KEY
// + SUPABASE_ANON_KEY) cargadas desde backend/.env.test por
// tests/setupEnv.js, igual que backend/tests/auth.test.js. No mockea
// Supabase: crea usuarios reales vía los endpoints públicos de auth
// (correos únicos por test) y los borra en afterAll — el `ON DELETE
// CASCADE` de `usuarios`/`cursos` (supabase/migrations/0001, 0002) limpia
// también los cursos creados (docs/verification.md, docs/conventions.md §8).
describe("CRUD de cursos (cursos_crud) — specs/cursos_crud/requirements.md", () => {
  const app = require("../src/app");
  const supabase = require("../src/services/supabase");

  const usuariosCreados = [];
  const PASSWORD_VALIDA = "Test-Password-123!";

  function correoUnico(prefix) {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return `${prefix}-${unique}@studyflow-test.local`;
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

  afterAll(async () => {
    for (const id of usuariosCreados) {
      // Best-effort: no debe romper la suite si un usuario ya fue borrado.
      // El ON DELETE CASCADE se encarga de los cursos asociados.
      // eslint-disable-next-line no-await-in-loop
      await supabase.auth.admin.deleteUser(id).catch(() => {});
    }
  });

  describe("GET /api/cursos", () => {
    it("responde 200 con lista vacía si el usuario no tiene cursos (R2)", async () => {
      const usuario = await crearUsuarioAutenticado("get-vacio");

      const res = await request(app)
        .get("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.cursos).toEqual([]);
    }, 10000);

    it("responde 200 con únicamente los cursos del usuario autenticado (R1)", async () => {
      const usuarioA = await crearUsuarioAutenticado("get-propio-a");
      const usuarioB = await crearUsuarioAutenticado("get-propio-b");

      await request(app)
        .post("/api/cursos")
        .set("Authorization", `Bearer ${usuarioA.accessToken}`)
        .send({ nombre: "Cálculo II", color: "#3B82F6", dificultad: 5 });

      await request(app)
        .post("/api/cursos")
        .set("Authorization", `Bearer ${usuarioB.accessToken}`)
        .send({ nombre: "Física I", color: "#EF4444", dificultad: 3 });

      const res = await request(app)
        .get("/api/cursos")
        .set("Authorization", `Bearer ${usuarioA.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.cursos).toHaveLength(1);
      expect(res.body.cursos[0]).toMatchObject({
        nombre: "Cálculo II",
        usuario_id: usuarioA.id,
      });
    }, 15000);
  });

  describe("POST /api/cursos", () => {
    it("crea el curso asociado al usuario del token y responde 201 (R3)", async () => {
      const usuario = await crearUsuarioAutenticado("post-happy");

      const res = await request(app)
        .post("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({
          nombre: "Cálculo II",
          color: "#3B82F6",
          dificultad: 5,
          profesor: "Dr. García",
          creditos: 4,
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        nombre: "Cálculo II",
        color: "#3B82F6",
        dificultad: 5,
        profesor: "Dr. García",
        creditos: 4,
        usuario_id: usuario.id,
      });
      expect(res.body.id).toEqual(expect.any(String));
    }, 10000);

    it("ignora un usuario_id del body y usa siempre el del token (R3)", async () => {
      const usuario = await crearUsuarioAutenticado("post-usuario-id-body");

      const res = await request(app)
        .post("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({
          nombre: "Curso con usuario_id falso",
          color: "#3B82F6",
          dificultad: 3,
          usuario_id: "00000000-0000-0000-0000-000000000000",
        });

      expect(res.status).toBe(201);
      expect(res.body.usuario_id).toBe(usuario.id);
    }, 10000);

    it("responde 400 VALIDATION_ERROR si nombre está vacío y no crea el curso (R4)", async () => {
      const usuario = await crearUsuarioAutenticado("post-nombre-vacio");

      const res = await request(app)
        .post("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ nombre: "   ", color: "#3B82F6", dificultad: 3 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");

      const lista = await request(app)
        .get("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.cursos).toEqual([]);
    }, 10000);

    it("responde 400 VALIDATION_ERROR si dificultad está fuera de 1-5 y no crea el curso (R5)", async () => {
      const usuario = await crearUsuarioAutenticado("post-dificultad-invalida");

      const res = await request(app)
        .post("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ nombre: "Curso X", color: "#3B82F6", dificultad: 6 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");

      const lista = await request(app)
        .get("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.cursos).toEqual([]);
    }, 10000);

    it("responde 400 VALIDATION_ERROR si color no es hex válido y no crea el curso (R6)", async () => {
      const usuario = await crearUsuarioAutenticado("post-color-invalido");

      const res = await request(app)
        .post("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ nombre: "Curso X", color: "azul", dificultad: 3 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");

      const lista = await request(app)
        .get("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.cursos).toEqual([]);
    }, 10000);
  });

  describe("PUT /api/cursos/:id", () => {
    it("actualiza un curso propio y responde 200 con el objeto actualizado, persistiendo los cambios (R7)", async () => {
      const usuario = await crearUsuarioAutenticado("put-happy");

      const creado = await request(app)
        .post("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ nombre: "Cálculo II", color: "#3B82F6", dificultad: 3 });

      const res = await request(app)
        .put(`/api/cursos/${creado.body.id}`)
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ nombre: "Cálculo II Avanzado", dificultad: 5 });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ nombre: "Cálculo II Avanzado", dificultad: 5 });

      const lista = await request(app)
        .get("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.cursos[0]).toMatchObject({
        nombre: "Cálculo II Avanzado",
        dificultad: 5,
      });
    }, 10000);

    it("responde 403 FORBIDDEN sobre un curso ajeno y no lo modifica (R8)", async () => {
      const dueno = await crearUsuarioAutenticado("put-ajeno-dueno");
      const otro = await crearUsuarioAutenticado("put-ajeno-otro");

      const creado = await request(app)
        .post("/api/cursos")
        .set("Authorization", `Bearer ${dueno.accessToken}`)
        .send({ nombre: "Cálculo II", color: "#3B82F6", dificultad: 3 });

      const res = await request(app)
        .put(`/api/cursos/${creado.body.id}`)
        .set("Authorization", `Bearer ${otro.accessToken}`)
        .send({ nombre: "Hackeado" });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");

      const lista = await request(app)
        .get("/api/cursos")
        .set("Authorization", `Bearer ${dueno.accessToken}`);
      expect(lista.body.cursos[0]).toMatchObject({ nombre: "Cálculo II" });
    }, 15000);

    it("responde 403 FORBIDDEN sobre un id inexistente (R8)", async () => {
      const usuario = await crearUsuarioAutenticado("put-inexistente");

      const res = await request(app)
        .put("/api/cursos/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ nombre: "Nuevo nombre" });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");
    }, 10000);

    it("responde 400 VALIDATION_ERROR con dificultad fuera de rango y no modifica el curso (R9)", async () => {
      const usuario = await crearUsuarioAutenticado("put-dificultad-invalida");

      const creado = await request(app)
        .post("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ nombre: "Cálculo II", color: "#3B82F6", dificultad: 3 });

      const res = await request(app)
        .put(`/api/cursos/${creado.body.id}`)
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ dificultad: 9 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");

      const lista = await request(app)
        .get("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.cursos[0]).toMatchObject({ dificultad: 3 });
    }, 10000);

    it("responde 400 VALIDATION_ERROR con color inválido y no modifica el curso (R9)", async () => {
      const usuario = await crearUsuarioAutenticado("put-color-invalido");

      const creado = await request(app)
        .post("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ nombre: "Cálculo II", color: "#3B82F6", dificultad: 3 });

      const res = await request(app)
        .put(`/api/cursos/${creado.body.id}`)
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ color: "no-es-hex" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");

      const lista = await request(app)
        .get("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.cursos[0]).toMatchObject({ color: "#3B82F6" });
    }, 10000);
  });

  describe("DELETE /api/cursos/:id", () => {
    it("elimina un curso propio y responde 200 o 204 (R10)", async () => {
      const usuario = await crearUsuarioAutenticado("delete-happy");

      const creado = await request(app)
        .post("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ nombre: "Cálculo II", color: "#3B82F6", dificultad: 3 });

      const res = await request(app)
        .delete(`/api/cursos/${creado.body.id}`)
        .set("Authorization", `Bearer ${usuario.accessToken}`);

      expect([200, 204]).toContain(res.status);

      const lista = await request(app)
        .get("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.cursos).toEqual([]);
    }, 10000);

    it("responde 403 FORBIDDEN sobre un curso ajeno y no lo elimina (R11)", async () => {
      const dueno = await crearUsuarioAutenticado("delete-ajeno-dueno");
      const otro = await crearUsuarioAutenticado("delete-ajeno-otro");

      const creado = await request(app)
        .post("/api/cursos")
        .set("Authorization", `Bearer ${dueno.accessToken}`)
        .send({ nombre: "Cálculo II", color: "#3B82F6", dificultad: 3 });

      const res = await request(app)
        .delete(`/api/cursos/${creado.body.id}`)
        .set("Authorization", `Bearer ${otro.accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");

      const lista = await request(app)
        .get("/api/cursos")
        .set("Authorization", `Bearer ${dueno.accessToken}`);
      expect(lista.body.cursos).toHaveLength(1);
    }, 15000);
  });

  describe("Persistencia tras recargar (R16)", () => {
    it("GET /api/cursos tras un POST devuelve el curso creado", async () => {
      const usuario = await crearUsuarioAutenticado("persistencia");

      const creado = await request(app)
        .post("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ nombre: "Programación I", color: "#10B981", dificultad: 2 });
      expect(creado.status).toBe(201);

      // Simula "recargar la página": una nueva petición GET independiente.
      const res = await request(app)
        .get("/api/cursos")
        .set("Authorization", `Bearer ${usuario.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.cursos).toHaveLength(1);
      expect(res.body.cursos[0]).toMatchObject({
        id: creado.body.id,
        nombre: "Programación I",
      });
    }, 10000);
  });
});
