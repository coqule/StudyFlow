const { createClient } = require("@supabase/supabase-js");

const supabase = require("./supabase");

// Validación manual (sin librería nueva) — ver specs/auth/design.md §2
// "Validación de esquema": regex simple de correo, longitud mínima de
// password. Funciones puras y reutilizables por el controller para
// responder 400 sin llamar a Supabase (R2).
const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const ZONA_HORARIA_DEFAULT = "America/Costa_Rica";

// Variables de entorno leídas al inicio del módulo, no dentro de funciones
// de negocio (docs/conventions.md §7) — usadas por `iniciarSesion()` para
// crear un cliente efímero (ver design.md §1.2).
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function validarCorreo(correo) {
  return typeof correo === "string" && CORREO_REGEX.test(correo);
}

function validarPassword(password) {
  return typeof password === "string" && password.length >= PASSWORD_MIN_LENGTH;
}

function crearError(mensaje, status, code) {
  const error = new Error(mensaje);
  error.status = status;
  error.code = code;
  return error;
}

// Supabase Auth no siempre responde con un `error` cuando el correo ya
// existe: si tiene distintas versiones/config del error de duplicado
// (`user_already_exists`, `email_exists` en versiones recientes, o un
// mensaje de texto equivalente en versiones antiguas). Cubrimos todas las
// variantes documentadas para no dejar pasar un 201 con correo duplicado (R3).
function esErrorCorreoDuplicado(error) {
  if (!error) return false;
  const code = error.code || "";
  const mensaje = (error.message || "").toLowerCase();
  return (
    code === "user_already_exists" ||
    code === "email_exists" ||
    mensaje.includes("already registered") ||
    mensaje.includes("already exists")
  );
}

/**
 * Registra un usuario nuevo en Supabase Auth y crea su fila en `usuarios`.
 * Cubre R1 (happy path) y R3 (correo duplicado → 409). La validación de
 * formato (R2) la hace el controller antes de invocar esta función.
 *
 * Usa `supabase.auth.admin.createUser(...)` (no `supabase.auth.signUp(...)`)
 * sobre el cliente **compartido** de `services/supabase.js` — ver
 * `specs/auth/design.md` §1.2 (addendum, ronda 2 de review). `signUp()`
 * invoca internamente `_saveSession(...)` en el cliente sobre el que se
 * llama, lo que hace que ese cliente deje de operar con la `service role
 * key` en sus llamadas `.from(...)` posteriores y empiece a operar bajo RLS
 * con el JWT del usuario recién registrado — un defecto de integridad
 * confirmado en producción (ver `progress/review_auth.md`, segunda ronda).
 * `admin.createUser(...)` es una llamada REST sin estado: no invoca
 * `_saveSession`, así que el cliente compartido conserva siempre sus
 * privilegios de service role. Regla dura nueva (`design.md` §1.2): ningún
 * método de `auth.*` que invoque `_saveSession` (`signUp`,
 * `signInWithPassword`, `signOut`, `setSession`, `refreshSession`) debe
 * llamarse sobre este cliente.
 */
async function registrar({ correo, password, nombre }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: correo,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });

  if (error) {
    if (esErrorCorreoDuplicado(error)) {
      throw crearError("Ya existe una cuenta con ese correo", 409, "EMAIL_TAKEN");
    }
    throw crearError(error.message, error.status || 400, "AUTH_ERROR");
  }

  const usuarioCreado = data?.user;

  // A diferencia de `signUp()` (pensado para clientes públicos, con
  // protección anti-enumeración que devuelve un usuario "fantasma" sin
  // identidades para correos duplicados), `admin.createUser(...)` es un
  // endpoint autenticado que solo llama el backend con la service role key
  // — devuelve un `error` normal ante un correo duplicado, sin necesidad de
  // detectar una respuesta "fantasma". Esta comprobación queda como red de
  // seguridad por si Supabase alguna vez responde sin `error` y sin usuario.
  if (!usuarioCreado) {
    throw crearError("Ya existe una cuenta con ese correo", 409, "EMAIL_TAKEN");
  }

  // `upsert` con `onConflict: "id"` en vez de `insert`: desde R13
  // (specs/auth/requirements.md, design.md §1.1) existe un trigger de
  // Postgres (`supabase/migrations/0007_usuarios_auto_provision.sql`) que
  // auto-provisiona esta misma fila en cuanto se inserta en `auth.users`
  // (sin importar el método usado — `admin.createUser()` aquí, o
  // `signUp()` desde el frontend). Si el trigger ya corrió primero, un
  // `insert` simple fallaría por violación de PK — el `upsert` tolera esa
  // carrera sin romper el endpoint.
  const { error: insertError } = await supabase.from("usuarios").upsert(
    {
      id: usuarioCreado.id,
      correo,
      nombre,
      zona_horaria: ZONA_HORARIA_DEFAULT,
    },
    { onConflict: "id" }
  );

  if (insertError) {
    throw crearError("No se pudo crear el perfil del usuario", 500, "PROFILE_CREATE_ERROR");
  }

  return { id: usuarioCreado.id, correo, nombre };
}

/**
 * Inicia sesión contra Supabase Auth y devuelve el JWT + el perfil del
 * usuario desde la tabla `usuarios`. Cubre R4 (happy path) y R5
 * (credenciales inválidas → 401, sin distinguir cuál campo falló).
 *
 * `signInWithPassword(...)` también invoca `_saveSession(...)` (igual que
 * `signUp`, ver `registrar()` arriba), así que **nunca** se llama sobre el
 * cliente compartido de `services/supabase.js` — se crea un cliente
 * efímero, function-scoped, con la `SUPABASE_ANON_KEY` y
 * `persistSession: false` / `autoRefreshToken: false` (mismo patrón que ya
 * usan `backend/tests/helpers/rlsTestUsers.js` y el `anonClient` de
 * `backend/tests/auth.test.js`), exclusivamente para esta llamada. El
 * cliente efímero se descarta después de extraer `access_token`/`usuario`;
 * la consulta de perfil sigue usando el cliente compartido (`supabase`,
 * service role), que nunca se ve afectado.
 */
async function iniciarSesion({ correo, password }) {
  const clienteEfimero = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await clienteEfimero.auth.signInWithPassword({
    email: correo,
    password,
  });

  if (error || !data?.session || !data?.user) {
    throw crearError("Correo o contraseña incorrectos", 401, "INVALID_CREDENTIALS");
  }

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("id, correo, nombre")
    .eq("id", data.user.id)
    .maybeSingle();

  return {
    access_token: data.session.access_token,
    usuario: perfil ?? { id: data.user.id, correo, nombre: "" },
  };
}

module.exports = {
  validarCorreo,
  validarPassword,
  registrar,
  iniciarSesion,
};
