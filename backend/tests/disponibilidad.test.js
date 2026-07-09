const request = require("supertest");

// Requiere credenciales reales de Supabase (SUPABASE_URL + SUPABASE_SERVICE_KEY
// + SUPABASE_ANON_KEY) cargadas desde backend/.env.test por tests/setupEnv.js,
// igual que backend/tests/cursos.test.js. No mockea Supabase: crea usuarios
// reales vía los endpoints públicos de auth (correos únicos por test) y los
// borra en afterAll — el `ON DELETE CASCADE` de usuarios/disponibilidad limpia
// los bloques creados (docs/verification.md, docs/conventions.md §8).
describe("CRUD de disponibilidad (disponibilidad_crud) — specs/disponibilidad_crud/requirements.md", () => {
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

  function crear(usuario, bloque) {
    return request(app)
      .post("/api/disponibilidad")
      .set("Authorization", `Bearer ${usuario.accessToken}`)
      .send(bloque);
  }

  afterAll(async () => {
    for (const id of usuariosCreados) {
      // Best-effort: el ON DELETE CASCADE se encarga de la disponibilidad.
      // eslint-disable-next-line no-await-in-loop
      await supabase.auth.admin.deleteUser(id).catch(() => {});
    }
  }, 60000);

  describe("GET /api/disponibilidad", () => {
    it("responde 200 con lista vacía si el usuario no tiene bloques (R2)", async () => {
      const usuario = await crearUsuarioAutenticado("get-vacio");

      const res = await request(app)
        .get("/api/disponibilidad")
        .set("Authorization", `Bearer ${usuario.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.disponibilidad).toEqual([]);
    }, 10000);

    it("responde 200 con únicamente los bloques del usuario autenticado (R1)", async () => {
      const usuarioA = await crearUsuarioAutenticado("get-propio-a");
      const usuarioB = await crearUsuarioAutenticado("get-propio-b");

      await crear(usuarioA, { dia_semana: "lunes", hora_inicio: "08:00", hora_fin: "10:00" });
      await crear(usuarioB, { dia_semana: "martes", hora_inicio: "12:00", hora_fin: "14:00" });

      const res = await request(app)
        .get("/api/disponibilidad")
        .set("Authorization", `Bearer ${usuarioA.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.disponibilidad).toHaveLength(1);
      expect(res.body.disponibilidad[0]).toMatchObject({
        dia_semana: "lunes",
        usuario_id: usuarioA.id,
      });
    }, 15000);
  });

  describe("POST /api/disponibilidad", () => {
    it("crea el bloque asociado al usuario del token y responde 201 (R3)", async () => {
      const usuario = await crearUsuarioAutenticado("post-happy");

      const res = await crear(usuario, {
        dia_semana: "miercoles",
        hora_inicio: "18:00",
        hora_fin: "20:00",
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        dia_semana: "miercoles",
        usuario_id: usuario.id,
      });
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.hora_inicio).toMatch(/^18:00/);
      expect(res.body.hora_fin).toMatch(/^20:00/);
    }, 10000);

    it("responde 400 VALIDATION_ERROR si dia_semana no es válido y no crea el bloque (R4)", async () => {
      const usuario = await crearUsuarioAutenticado("post-dia-invalido");

      const res = await crear(usuario, {
        dia_semana: "lunnes",
        hora_inicio: "08:00",
        hora_fin: "10:00",
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");

      const lista = await request(app)
        .get("/api/disponibilidad")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.disponibilidad).toEqual([]);
    }, 10000);

    it("responde 400 VALIDATION_ERROR si la hora tiene formato inválido y no crea el bloque (R5)", async () => {
      const usuario = await crearUsuarioAutenticado("post-hora-invalida");

      const res = await crear(usuario, {
        dia_semana: "lunes",
        hora_inicio: "8am",
        hora_fin: "25:00",
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");

      const lista = await request(app)
        .get("/api/disponibilidad")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.disponibilidad).toEqual([]);
    }, 10000);

    it("responde 400 VALIDATION_ERROR si hora_fin <= hora_inicio y no crea el bloque (R6)", async () => {
      const usuario = await crearUsuarioAutenticado("post-rango-invalido");

      const res = await crear(usuario, {
        dia_semana: "lunes",
        hora_inicio: "10:00",
        hora_fin: "10:00",
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");

      const lista = await request(app)
        .get("/api/disponibilidad")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.disponibilidad).toEqual([]);
    }, 10000);

    it("responde 409 OVERLAP_CONFLICT si el bloque se solapa con otro del mismo día y no lo crea (R7)", async () => {
      const usuario = await crearUsuarioAutenticado("post-solapa");

      const primero = await crear(usuario, {
        dia_semana: "jueves",
        hora_inicio: "08:00",
        hora_fin: "10:00",
      });
      expect(primero.status).toBe(201);

      const res = await crear(usuario, {
        dia_semana: "jueves",
        hora_inicio: "09:00",
        hora_fin: "11:00",
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("OVERLAP_CONFLICT");

      const lista = await request(app)
        .get("/api/disponibilidad")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.disponibilidad).toHaveLength(1);
    }, 15000);

    it("permite bloques adyacentes (fin == inicio) en el mismo día (R7 — no es solape)", async () => {
      const usuario = await crearUsuarioAutenticado("post-adyacente");

      const primero = await crear(usuario, {
        dia_semana: "viernes",
        hora_inicio: "08:00",
        hora_fin: "10:00",
      });
      expect(primero.status).toBe(201);

      const segundo = await crear(usuario, {
        dia_semana: "viernes",
        hora_inicio: "10:00",
        hora_fin: "12:00",
      });
      expect(segundo.status).toBe(201);
    }, 15000);

    it("permite el mismo rango horario en días distintos (R7 — solape solo por día)", async () => {
      const usuario = await crearUsuarioAutenticado("post-otro-dia");

      const lunes = await crear(usuario, {
        dia_semana: "lunes",
        hora_inicio: "08:00",
        hora_fin: "10:00",
      });
      expect(lunes.status).toBe(201);

      const martes = await crear(usuario, {
        dia_semana: "martes",
        hora_inicio: "08:00",
        hora_fin: "10:00",
      });
      expect(martes.status).toBe(201);
    }, 15000);
  });

  describe("PUT /api/disponibilidad/:id", () => {
    it("actualiza un bloque propio y responde 200 con el objeto actualizado, persistiendo (R8)", async () => {
      const usuario = await crearUsuarioAutenticado("put-happy");

      const creado = await crear(usuario, {
        dia_semana: "lunes",
        hora_inicio: "08:00",
        hora_fin: "10:00",
      });

      const res = await request(app)
        .put(`/api/disponibilidad/${creado.body.id}`)
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ dia_semana: "lunes", hora_inicio: "14:00", hora_fin: "16:00" });

      expect(res.status).toBe(200);
      expect(res.body.hora_inicio).toMatch(/^14:00/);
      expect(res.body.hora_fin).toMatch(/^16:00/);

      const lista = await request(app)
        .get("/api/disponibilidad")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.disponibilidad[0].hora_inicio).toMatch(/^14:00/);
    }, 15000);

    it("permite mover un bloque dentro de un rango que solo choca consigo mismo (R10 — excluye su propio id)", async () => {
      const usuario = await crearUsuarioAutenticado("put-consigo");

      const creado = await crear(usuario, {
        dia_semana: "lunes",
        hora_inicio: "08:00",
        hora_fin: "10:00",
      });

      // Nuevo rango 09:00–11:00 se solapa con el rango ORIGINAL del propio
      // bloque; como se excluye su id, NO debe considerarse conflicto.
      const res = await request(app)
        .put(`/api/disponibilidad/${creado.body.id}`)
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ dia_semana: "lunes", hora_inicio: "09:00", hora_fin: "11:00" });

      expect(res.status).toBe(200);
      expect(res.body.hora_inicio).toMatch(/^09:00/);
    }, 15000);

    it("responde 409 OVERLAP_CONFLICT si el update solapa con OTRO bloque del día y no modifica (R10)", async () => {
      const usuario = await crearUsuarioAutenticado("put-solapa-otro");

      await crear(usuario, { dia_semana: "lunes", hora_inicio: "08:00", hora_fin: "10:00" });
      const segundo = await crear(usuario, {
        dia_semana: "lunes",
        hora_inicio: "12:00",
        hora_fin: "14:00",
      });

      // Mover el segundo bloque para que solape con el primero (08:00–10:00).
      const res = await request(app)
        .put(`/api/disponibilidad/${segundo.body.id}`)
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ dia_semana: "lunes", hora_inicio: "09:00", hora_fin: "11:00" });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("OVERLAP_CONFLICT");

      const lista = await request(app)
        .get("/api/disponibilidad")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      const sinCambios = lista.body.disponibilidad.find((b) => b.id === segundo.body.id);
      expect(sinCambios.hora_inicio).toMatch(/^12:00/);
    }, 15000);

    it("responde 400 VALIDATION_ERROR con hora_fin <= hora_inicio y no modifica (R9)", async () => {
      const usuario = await crearUsuarioAutenticado("put-rango-invalido");

      const creado = await crear(usuario, {
        dia_semana: "lunes",
        hora_inicio: "08:00",
        hora_fin: "10:00",
      });

      const res = await request(app)
        .put(`/api/disponibilidad/${creado.body.id}`)
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ dia_semana: "lunes", hora_inicio: "10:00", hora_fin: "09:00" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");

      const lista = await request(app)
        .get("/api/disponibilidad")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.disponibilidad[0].hora_inicio).toMatch(/^08:00/);
    }, 15000);

    it("responde 400 VALIDATION_ERROR con dia_semana inválido y no modifica (R9)", async () => {
      const usuario = await crearUsuarioAutenticado("put-dia-invalido");

      const creado = await crear(usuario, {
        dia_semana: "lunes",
        hora_inicio: "08:00",
        hora_fin: "10:00",
      });

      const res = await request(app)
        .put(`/api/disponibilidad/${creado.body.id}`)
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ dia_semana: "lunez", hora_inicio: "08:00", hora_fin: "10:00" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    }, 15000);

    it("responde 404 NOT_FOUND sobre un bloque ajeno y no lo modifica (R11)", async () => {
      const dueno = await crearUsuarioAutenticado("put-ajeno-dueno");
      const otro = await crearUsuarioAutenticado("put-ajeno-otro");

      const creado = await crear(dueno, {
        dia_semana: "lunes",
        hora_inicio: "08:00",
        hora_fin: "10:00",
      });

      const res = await request(app)
        .put(`/api/disponibilidad/${creado.body.id}`)
        .set("Authorization", `Bearer ${otro.accessToken}`)
        .send({ dia_semana: "lunes", hora_inicio: "14:00", hora_fin: "16:00" });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("NOT_FOUND");

      const lista = await request(app)
        .get("/api/disponibilidad")
        .set("Authorization", `Bearer ${dueno.accessToken}`);
      expect(lista.body.disponibilidad[0].hora_inicio).toMatch(/^08:00/);
    }, 15000);

    it("responde 404 NOT_FOUND sobre un id inexistente (R11)", async () => {
      const usuario = await crearUsuarioAutenticado("put-inexistente");

      const res = await request(app)
        .put("/api/disponibilidad/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${usuario.accessToken}`)
        .send({ dia_semana: "lunes", hora_inicio: "14:00", hora_fin: "16:00" });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("NOT_FOUND");
    }, 10000);
  });

  describe("DELETE /api/disponibilidad/:id", () => {
    it("elimina un bloque propio y responde 200 o 204 (R12)", async () => {
      const usuario = await crearUsuarioAutenticado("delete-happy");

      const creado = await crear(usuario, {
        dia_semana: "lunes",
        hora_inicio: "08:00",
        hora_fin: "10:00",
      });

      const res = await request(app)
        .delete(`/api/disponibilidad/${creado.body.id}`)
        .set("Authorization", `Bearer ${usuario.accessToken}`);

      expect([200, 204]).toContain(res.status);

      const lista = await request(app)
        .get("/api/disponibilidad")
        .set("Authorization", `Bearer ${usuario.accessToken}`);
      expect(lista.body.disponibilidad).toEqual([]);
    }, 15000);

    it("responde 404 NOT_FOUND sobre un bloque ajeno y no lo elimina (R13)", async () => {
      const dueno = await crearUsuarioAutenticado("delete-ajeno-dueno");
      const otro = await crearUsuarioAutenticado("delete-ajeno-otro");

      const creado = await crear(dueno, {
        dia_semana: "lunes",
        hora_inicio: "08:00",
        hora_fin: "10:00",
      });

      const res = await request(app)
        .delete(`/api/disponibilidad/${creado.body.id}`)
        .set("Authorization", `Bearer ${otro.accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("NOT_FOUND");

      const lista = await request(app)
        .get("/api/disponibilidad")
        .set("Authorization", `Bearer ${dueno.accessToken}`);
      expect(lista.body.disponibilidad).toHaveLength(1);
    }, 15000);

    it("responde 404 NOT_FOUND sobre un id inexistente (R13)", async () => {
      const usuario = await crearUsuarioAutenticado("delete-inexistente");

      const res = await request(app)
        .delete("/api/disponibilidad/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${usuario.accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("NOT_FOUND");
    }, 10000);
  });

  describe("Persistencia tras recargar (R20)", () => {
    it("GET /api/disponibilidad tras un POST devuelve el bloque creado", async () => {
      const usuario = await crearUsuarioAutenticado("persistencia");

      const creado = await crear(usuario, {
        dia_semana: "domingo",
        hora_inicio: "16:00",
        hora_fin: "18:00",
      });
      expect(creado.status).toBe(201);

      // Simula "recargar la página": una nueva petición GET independiente.
      const res = await request(app)
        .get("/api/disponibilidad")
        .set("Authorization", `Bearer ${usuario.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.disponibilidad).toHaveLength(1);
      expect(res.body.disponibilidad[0]).toMatchObject({
        id: creado.body.id,
        dia_semana: "domingo",
      });
    }, 10000);
  });
});
