const request = require("supertest");
const { createClient } = require("@supabase/supabase-js");

// Requiere credenciales reales de Supabase (SUPABASE_URL + SUPABASE_SERVICE_KEY)
// cargadas desde backend/.env.test por tests/setupEnv.js (ver jest.config.js),
// igual que backend/tests/health-db.test.js y las suites de RLS. No mockea
// Supabase Auth: crea usuarios reales (correos únicos por test) y los borra
// en afterAll (docs/verification.md, docs/conventions.md §8).
describe("Autenticación (auth) — specs/auth/requirements.md", () => {
  const app = require("../src/app");
  const supabase = require("../src/services/supabase");

  const usuariosCreados = [];
  const PASSWORD_VALIDA = "Test-Password-123!";

  function correoUnico(prefix) {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return `${prefix}-${unique}@studyflow-test.local`;
  }

  afterAll(async () => {
    for (const id of usuariosCreados) {
      // Best-effort: no debe romper la suite si un usuario ya fue borrado.
      // eslint-disable-next-line no-await-in-loop
      await supabase.auth.admin.deleteUser(id).catch(() => {});
    }
  });

  describe("POST /api/auth/register", () => {
    it("crea el usuario y responde 201 con el objeto usuario (R1)", async () => {
      const correo = correoUnico("register-happy");

      const res = await request(app)
        .post("/api/auth/register")
        .send({ correo, password: PASSWORD_VALIDA, nombre: "Ana Pérez" });

      expect(res.status).toBe(201);
      expect(res.body.usuario).toMatchObject({ correo, nombre: "Ana Pérez" });
      expect(res.body.usuario.id).toEqual(expect.any(String));

      usuariosCreados.push(res.body.usuario.id);

      const { data: fila, error } = await supabase
        .from("usuarios")
        .select("id, correo, nombre")
        .eq("id", res.body.usuario.id)
        .maybeSingle();

      expect(error).toBeNull();
      expect(fila).toMatchObject({ correo, nombre: "Ana Pérez" });
    }, 10000);

    it("responde 400 VALIDATION_ERROR con correo de formato inválido (R2)", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ correo: "no-es-un-correo", password: PASSWORD_VALIDA, nombre: "Ana" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("responde 400 VALIDATION_ERROR con password de menos de 8 caracteres (R2)", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ correo: correoUnico("password-corto"), password: "abc123", nombre: "Ana" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("responde 409 EMAIL_TAKEN si el correo ya existe y no crea un duplicado (R3)", async () => {
      const correo = correoUnico("duplicado");

      const primero = await request(app)
        .post("/api/auth/register")
        .send({ correo, password: PASSWORD_VALIDA, nombre: "Ana" });
      expect(primero.status).toBe(201);
      usuariosCreados.push(primero.body.usuario.id);

      const segundo = await request(app)
        .post("/api/auth/register")
        .send({ correo, password: PASSWORD_VALIDA, nombre: "Ana Otra Vez" });

      expect(segundo.status).toBe(409);
      expect(segundo.body.code).toBe("EMAIL_TAKEN");

      const { count } = await supabase
        .from("usuarios")
        .select("id", { count: "exact", head: true })
        .eq("correo", correo);
      expect(count).toBe(1);
    });
  });

  describe("POST /api/auth/login", () => {
    it("responde 200 con access_token y usuario para credenciales correctas (R4)", async () => {
      const correo = correoUnico("login-happy");
      const registro = await request(app)
        .post("/api/auth/register")
        .send({ correo, password: PASSWORD_VALIDA, nombre: "Carla" });
      usuariosCreados.push(registro.body.usuario.id);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ correo, password: PASSWORD_VALIDA });

      expect(res.status).toBe(200);
      expect(typeof res.body.access_token).toBe("string");
      expect(res.body.access_token.length).toBeGreaterThan(0);
      expect(res.body.usuario).toMatchObject({ correo, nombre: "Carla" });
    });

    it("responde 401 INVALID_CREDENTIALS con contraseña incorrecta (R5)", async () => {
      const correo = correoUnico("login-invalido");
      const registro = await request(app)
        .post("/api/auth/register")
        .send({ correo, password: PASSWORD_VALIDA, nombre: "Diego" });
      usuariosCreados.push(registro.body.usuario.id);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ correo, password: "contrasena-incorrecta" });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("Rutas protegidas (middleware requireAuth)", () => {
    it("responde 401 UNAUTHENTICATED si falta el header Authorization (R6)", async () => {
      const res = await request(app).get("/api/ruta-protegida-de-prueba");

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHENTICATED");
    });

    it("responde 401 UNAUTHENTICATED si el token es inválido o expiró (R7)", async () => {
      const res = await request(app)
        .get("/api/ruta-protegida-de-prueba")
        .set("Authorization", "Bearer token-invalido-o-expirado");

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHENTICATED");
    });
  });

  // R13 (specs/auth/requirements.md, design.md §1.1): el flujo real de la UI
  // (frontend/src/context/AuthContext.tsx#register) llama a
  // supabase.auth.signUp() directamente, NO a POST /api/auth/register. Este
  // test simula ese camino exacto — usa un cliente con la ANON KEY (igual
  // que el frontend, nunca la service role key) y nunca invoca
  // authService.registrar() — para verificar que la fila en `usuarios`
  // aparece igual, provista por el trigger de
  // supabase/migrations/0007_usuarios_auto_provision.sql, sin depender de
  // que el cliente que originó el registro haga la inserción.
  describe("Registro directo vía supabase.auth.signUp() — camino real de la UI (R13)", () => {
    it("crea la fila en public.usuarios vía el trigger de auth.users, sin pasar por POST /api/auth/register", async () => {
      const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const correo = correoUnico("frontend-signup-directo");

      const { data, error } = await anonClient.auth.signUp({
        email: correo,
        password: PASSWORD_VALIDA,
        options: { data: { nombre: "Registrada Vía UI" } },
      });

      expect(error).toBeNull();
      expect(data.user?.id).toEqual(expect.any(String));
      usuariosCreados.push(data.user.id);

      // Se consulta con el `supabase` singleton del archivo (mismo cliente
      // que usan las 8 pruebas anteriores, incluidas las que registran/
      // loguean vía los endpoints). Antes de T24/T25 esta consulta era
      // consistentemente `null` para la fila recién creada — el diagnóstico
      // original ("caché del cliente HTTP") era incorrecto (ver T27,
      // progress/impl_auth.md): la causa real era que `registrar()`
      // (`signUp`) y `iniciarSesion()` (`signInWithPassword`), llamados en
      // tests anteriores de este mismo archivo, mutaban la sesión de este
      // cliente compartido (`_saveSession`), haciendo que sus `.from(...)`
      // posteriores dejaran de usar la service role key y quedaran
      // acotados por RLS al último usuario autenticado. T24/T25 mueven esas
      // llamadas fuera del cliente compartido (`admin.createUser` /
      // cliente efímero), así que ya no hace falta un cliente "fresco" aquí
      // — confirmado con 2 corridas completas en verde.
      const { data: fila, error: filaError } = await supabase
        .from("usuarios")
        .select("id, correo, nombre")
        .eq("id", data.user.id)
        .maybeSingle();

      expect(filaError).toBeNull();
      expect(fila).toMatchObject({ correo, nombre: "Registrada Vía UI" });
    }, 10000);
  });

  // T26 (specs/auth/tasks.md, design.md §1.2, progress/review_auth.md
  // segunda ronda): regresión que reproduce en vivo el escenario exacto que
  // encontró el reviewer — tras registrar y loguear usuarios reales por los
  // endpoints públicos (el mismo código que corre en producción), una
  // consulta SIN FILTRO sobre `usuarios` con el cliente de
  // `services/supabase.js` (idéntico patrón al de `GET /health` en
  // `backend/src/app.js`) debe seguir devolviendo el total real de filas,
  // no un valor acotado por RLS al último usuario autenticado. Sin mocks:
  // usuarios reales, login real, conteo real contra el proyecto Supabase
  // real (docs/verification.md).
  describe("Regresión — el cliente compartido de services/supabase.js conserva privilegios de service role tras registrar/loguear (T26)", () => {
    it("un conteo sin filtro sobre usuarios vía services/supabase.js sigue devolviendo el total real, no el acotado por RLS del último usuario autenticado", async () => {
      const correoA = correoUnico("t26-service-role-a");
      const correoB = correoUnico("t26-service-role-b");

      const registroA = await request(app)
        .post("/api/auth/register")
        .send({ correo: correoA, password: PASSWORD_VALIDA, nombre: "T26 Usuario A" });
      expect(registroA.status).toBe(201);
      usuariosCreados.push(registroA.body.usuario.id);

      const registroB = await request(app)
        .post("/api/auth/register")
        .send({ correo: correoB, password: PASSWORD_VALIDA, nombre: "T26 Usuario B" });
      expect(registroB.status).toBe(201);
      usuariosCreados.push(registroB.body.usuario.id);

      // También ejercita iniciarSesion() (T25) — es el otro método que
      // podía mutar la sesión del cliente compartido.
      const login = await request(app)
        .post("/api/auth/login")
        .send({ correo: correoB, password: PASSWORD_VALIDA });
      expect(login.status).toBe(200);

      // Ground truth: cliente de service role recién creado, nunca usado
      // para auth.* con estado — su conteo es, por definición, el total
      // real sin restricción de RLS.
      const clienteGroundTruth = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const groundTruth = await clienteGroundTruth
        .from("usuarios")
        .select("id", { count: "exact", head: true });
      expect(groundTruth.error).toBeNull();

      // El cliente compartido de `services/supabase.js` — el mismo que
      // `registrar()`/`iniciarSesion()` acaban de ejercitar indirectamente
      // vía los endpoints, y el mismo patrón de consulta que `GET /health`.
      const viaSingletonCompartido = await supabase
        .from("usuarios")
        .select("id", { count: "exact", head: true });
      expect(viaSingletonCompartido.error).toBeNull();

      expect(viaSingletonCompartido.count).toBe(groundTruth.count);
      expect(viaSingletonCompartido.count).toBeGreaterThanOrEqual(2);
    }, 15000);
  });
});
