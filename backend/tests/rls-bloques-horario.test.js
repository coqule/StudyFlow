const {
  createServiceClient,
  createAndSignInTestUser,
  crearPerfilUsuario,
  deleteTestUser,
} = require("./helpers/rlsTestUsers");

// Verifica R8 (specs/base_datos/requirements.md): un usuario autenticado no
// puede leer ni modificar bloques_horario cuya cadena
// tarea_id -> curso_id -> usuario_id no resuelva a su propio auth.uid().
// Mismo patrón que rls-cursos-tareas-disponibilidad.test.js (T13): usuarios
// reales vía Admin API + JWTs reales de sesión (design.md §5).
describe("RLS — bloques_horario, cadena tarea->curso->usuario (R8)", () => {
  let serviceClient;
  let userA;
  let userB;
  let cursoIdA;
  let tareaIdA;
  let bloqueIdA;

  beforeAll(async () => {
    serviceClient = createServiceClient();

    userA = await createAndSignInTestUser(serviceClient, "rls-bloq-a");
    userB = await createAndSignInTestUser(serviceClient, "rls-bloq-b");

    await crearPerfilUsuario(serviceClient, userA);
    await crearPerfilUsuario(serviceClient, userB);

    const { data: curso, error: cursoError } = await userA.client
      .from("cursos")
      .insert({
        usuario_id: userA.id,
        nombre: "Curso RLS bloques A",
        color: "#10B981",
        dificultad: 2,
      })
      .select()
      .single();
    if (cursoError) throw cursoError;
    cursoIdA = curso.id;

    const { data: tarea, error: tareaError } = await userA.client
      .from("tareas")
      .insert({
        curso_id: cursoIdA,
        titulo: "Tarea RLS bloques A",
        tipo: "tarea",
        estado: "pendiente",
      })
      .select()
      .single();
    if (tareaError) throw tareaError;
    tareaIdA = tarea.id;

    const { data: bloque, error: bloqueError } = await userA.client
      .from("bloques_horario")
      .insert({
        tarea_id: tareaIdA,
        fecha: "2026-08-01",
        hora_inicio: "18:00",
        hora_fin: "19:30",
        generado_por_ia: false,
        justificacion: "Bloque de prueba RLS",
      })
      .select()
      .single();
    if (bloqueError) throw bloqueError;
    bloqueIdA = bloque.id;
  }, 30000);

  afterAll(async () => {
    if (bloqueIdA) await serviceClient.from("bloques_horario").delete().eq("id", bloqueIdA);
    if (tareaIdA) await serviceClient.from("tareas").delete().eq("id", tareaIdA);
    if (cursoIdA) await serviceClient.from("cursos").delete().eq("id", cursoIdA);
    await deleteTestUser(serviceClient, userA && userA.id);
    await deleteTestUser(serviceClient, userB && userB.id);
  }, 30000);

  it("usuario B no puede leer el bloque de usuario A (0 filas, sin error)", async () => {
    const { data, error } = await userB.client
      .from("bloques_horario")
      .select("*")
      .eq("id", bloqueIdA);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("usuario B no puede modificar el bloque de usuario A", async () => {
    const { data, error } = await userB.client
      .from("bloques_horario")
      .update({ justificacion: "hackeado" })
      .eq("id", bloqueIdA)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: sinCambios } = await serviceClient
      .from("bloques_horario")
      .select("justificacion")
      .eq("id", bloqueIdA)
      .single();
    expect(sinCambios.justificacion).toBe("Bloque de prueba RLS");
  });

  it("usuario B no puede eliminar el bloque de usuario A", async () => {
    const { data, error } = await userB.client
      .from("bloques_horario")
      .delete()
      .eq("id", bloqueIdA)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: sigueExistiendo } = await serviceClient
      .from("bloques_horario")
      .select("id")
      .eq("id", bloqueIdA)
      .single();
    expect(sigueExistiendo.id).toBe(bloqueIdA);
  });

  it("control positivo: usuario A sí puede leer su propio bloque", async () => {
    const { data, error } = await userA.client
      .from("bloques_horario")
      .select("*")
      .eq("id", bloqueIdA);
    expect(error).toBeNull();
    expect(data.length).toBe(1);
  });
});
