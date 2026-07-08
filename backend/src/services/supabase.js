const { createClient } = require("@supabase/supabase-js");

// Único archivo del backend que instancia el cliente de Supabase
// (ver backend/AGENT.md y docs/architecture.md §5: la service role key
// solo se usa aquí, nunca se expone al frontend).
//
// Variables de entorno leídas al inicio del módulo (docs/conventions.md §7),
// no dentro de funciones de negocio.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// `createClient` lanza una excepción síncrona si falta la URL o la key
// (ver @supabase/supabase-js). Si el entorno no tiene configuradas las
// variables (p. ej. no existe `.env`), exportamos `null` en vez de dejar
// que `require(...)` reviente todo el proceso — así GET /health puede
// degradar a `db: "error"` sin lanzar una excepción no controlada
// (ver design.md §4 y R9).
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    : null;

module.exports = supabase;
