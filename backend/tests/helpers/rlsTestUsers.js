const { createClient } = require("@supabase/supabase-js");

// Helper compartido entre backend/tests/rls-cursos-tareas-disponibilidad.test.js
// (T13, R7) y backend/tests/rls-bloques-horario.test.js (T14, R8).
//
// Implementa exactamente el patrón descrito en specs/base_datos/design.md §5:
// 1) crear usuarios de prueba vía Admin API (service key),
// 2) iniciar sesión con cada uno para obtener un JWT real,
// 3) devolver un cliente Supabase por usuario que usa la ANON KEY + ese JWT,
//    para que las queries pasen por RLS de verdad (no se bypasea con la
//    service key). No mockea Supabase ni Postgres (docs/verification.md).
//
// No introduce requisitos ni decisiones de diseño nuevas: es infraestructura
// de test para evitar duplicar ~40 líneas de setup entre los dos archivos de
// test que exige tasks.md (T13/T14).

function createServiceClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function createAnonClientForToken(accessToken) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/**
 * Crea un usuario de prueba (email/password descartables) vía Admin API,
 * inicia sesión con él, y devuelve { id, email, client } donde `client` es
 * un cliente Supabase con la anon key + el JWT real de sesión de ese usuario.
 */
async function createAndSignInTestUser(serviceClient, prefix) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `${prefix}-${unique}@studyflow-test.local`;
  const password = "Test-Password-123!";

  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;

  const signInClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: session, error: signInError } = await signInClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;

  const client = createAnonClientForToken(session.session.access_token);

  return { id: created.user.id, email, client };
}

/**
 * Crea (o confirma) el perfil en `usuarios` (requerido por la FK
 * cursos.usuario_id -> usuarios.id) usando el cliente de service key. Es
 * dato de setup, no lo que se está verificando — R7/R8 se prueban sobre
 * cursos/tareas/disponibilidad/bloques_horario, no sobre la tabla
 * `usuarios` en sí.
 *
 * T23 (specs/auth/tasks.md, regresión detectada tras aplicar R13): desde
 * que existe el trigger de `supabase/migrations/0007_usuarios_auto_provision.sql`,
 * `serviceClient.auth.admin.createUser(...)` ya deja creada esta fila
 * automáticamente. Un `insert` aquí chocaba con
 * `duplicate key value violates unique constraint "usuarios_pkey"`. Se usa
 * `upsert(..., { onConflict: "id" })` — mismo patrón que
 * `backend/src/services/authService.js#registrar()` (T18) — para tolerar
 * que el trigger ya haya creado la fila sin dejar de garantizar que
 * `nombre`/`correo` queden con los valores que este helper espera para sus
 * fixtures de test.
 */
async function crearPerfilUsuario(serviceClient, usuario) {
  const { error } = await serviceClient.from("usuarios").upsert(
    { id: usuario.id, nombre: `Test ${usuario.email}`, correo: usuario.email },
    { onConflict: "id" }
  );
  if (error) throw error;
}

async function deleteTestUser(serviceClient, userId) {
  if (!userId) return;
  await serviceClient.auth.admin.deleteUser(userId);
}

module.exports = {
  createServiceClient,
  createAndSignInTestUser,
  crearPerfilUsuario,
  deleteTestUser,
};
