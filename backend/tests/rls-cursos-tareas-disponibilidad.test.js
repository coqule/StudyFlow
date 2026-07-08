const {
  createServiceClient,
  createAndSignInTestUser,
  crearPerfilUsuario,
  deleteTestUser,
} = require("./helpers/rlsTestUsers");

// Verifica R7 (specs/base_datos/requirements.md): un usuario autenticado no
// puede leer ni modificar filas de cursos/tareas/disponibilidad que no le
// pertenecen. Usa 2 usuarios de prueba reales creados vía Admin API y JWTs
// reales obtenidos con signInWithPassword (design.md §5) — no mockea
// Supabase ni Postgres.
describe("RLS — cursos, tareas, disponibilidad (R7)", () => {
  let serviceClient;
  let userA;
  let userB;
  let cursoIdA;
  let tareaIdA;
  let disponibilidadIdA;

  beforeAll(async () => {
    serviceClient = createServiceClient();

    userA = await createAndSignInTestUser(serviceClient, "rls-cta-a");
    userB = await createAndSignInTestUser(serviceClient, "rls-cta-b");

    await crearPerfilUsuario(serviceClient, userA);
    await crearPerfilUsuario(serviceClient, userB);

    // Usuario A crea sus propios datos con su propio cliente (anon key + JWT
    // real) — así los datos de prueba pasan por RLS igual que en producción.
    const { data: curso, error: cursoError } = await userA.client
      .from("cursos")
      .insert({
        usuario_id: userA.id,
        nombre: "Curso RLS test A",
        color: "#3B82F6",
        dificultad: 3,
      })
      .select()
      .single();
    if (cursoError) throw cursoError;
    cursoIdA = curso.id;

    const { data: tarea, error: tareaError } = await userA.client
      .from("tareas")
      .insert({
        curso_id: cursoIdA,
        titulo: "Tarea RLS test A",
        tipo: "tarea",
        estado: "pendiente",
      })
      .select()
      .single();
    if (tareaError) throw tareaError;
    tareaIdA = tarea.id;

    const { data: disponibilidad, error: dispError } = await userA.client
      .from("disponibilidad")
      .insert({
        usuario_id: userA.id,
        dia_semana: "lunes",
        hora_inicio: "18:00",
        hora_fin: "20:00",
      })
      .select()
      .single();
    if (dispError) throw dispError;
    disponibilidadIdA = disponibilidad.id;
  }, 30000);

  afterAll(async () => {
    // Limpieza completa: primero filas (respetando FKs), luego usuarios de
    // prueba (docs/conventions.md §8: cada test limpia sus propios datos).
    if (tareaIdA) await serviceClient.from("tareas").delete().eq("id", tareaIdA);
    if (cursoIdA) await serviceClient.from("cursos").delete().eq("id", cursoIdA);
    if (disponibilidadIdA) {
      await serviceClient.from("disponibilidad").delete().eq("id", disponibilidadIdA);
    }
    await deleteTestUser(serviceClient, userA && userA.id);
    await deleteTestUser(serviceClient, userB && userB.id);
  }, 30000);

  it("usuario B no puede leer el curso de usuario A (0 filas, sin error)", async () => {
    const { data, error } = await userB.client.from("cursos").select("*").eq("id", cursoIdA);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("usuario B no puede modificar el curso de usuario A", async () => {
    const { data, error } = await userB.client
      .from("cursos")
      .update({ nombre: "hackeado" })
      .eq("id", cursoIdA)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: sinCambios } = await serviceClient
      .from("cursos")
      .select("nombre")
      .eq("id", cursoIdA)
      .single();
    expect(sinCambios.nombre).toBe("Curso RLS test A");
  });

  it("usuario B no puede leer la tarea de usuario A (0 filas, sin error)", async () => {
    const { data, error } = await userB.client.from("tareas").select("*").eq("id", tareaIdA);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("usuario B no puede modificar la tarea de usuario A", async () => {
    const { data, error } = await userB.client
      .from("tareas")
      .update({ titulo: "hackeado" })
      .eq("id", tareaIdA)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: sinCambios } = await serviceClient
      .from("tareas")
      .select("titulo")
      .eq("id", tareaIdA)
      .single();
    expect(sinCambios.titulo).toBe("Tarea RLS test A");
  });

  it("usuario B no puede leer la disponibilidad de usuario A (0 filas, sin error)", async () => {
    const { data, error } = await userB.client
      .from("disponibilidad")
      .select("*")
      .eq("id", disponibilidadIdA);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("usuario B no puede modificar la disponibilidad de usuario A", async () => {
    const { data, error } = await userB.client
      .from("disponibilidad")
      .update({ hora_inicio: "00:00" })
      .eq("id", disponibilidadIdA)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: sinCambios } = await serviceClient
      .from("disponibilidad")
      .select("hora_inicio")
      .eq("id", disponibilidadIdA)
      .single();
    expect(sinCambios.hora_inicio).toBe("18:00:00");
  });

  it("control positivo: usuario A sí puede leer sus propios datos", async () => {
    const { data: cursoData, error: cursoError } = await userA.client
      .from("cursos")
      .select("*")
      .eq("id", cursoIdA);
    expect(cursoError).toBeNull();
    expect(cursoData.length).toBe(1);

    const { data: tareaData, error: tareaError } = await userA.client
      .from("tareas")
      .select("*")
      .eq("id", tareaIdA);
    expect(tareaError).toBeNull();
    expect(tareaData.length).toBe(1);

    const { data: dispData, error: dispError } = await userA.client
      .from("disponibilidad")
      .select("*")
      .eq("id", disponibilidadIdA);
    expect(dispError).toBeNull();
    expect(dispData.length).toBe(1);
  });
});
