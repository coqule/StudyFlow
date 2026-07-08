const supabase = require("../services/supabase");

function unauthenticatedError() {
  const error = new Error("No autenticado");
  error.status = 401;
  error.code = "UNAUTHENTICATED";
  return error;
}

// requireAuth: verifica el JWT de Supabase en el header Authorization y
// adjunta `req.usuario_id`. Cubre R6 (sin header) y R7 (token inválido o
// expirado) con la misma respuesta 401 / UNAUTHENTICATED, sin ejecutar la
// lógica de la ruta protegida (ver specs/auth/design.md §2).
async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return next(unauthenticatedError());
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return next(unauthenticatedError());
    }

    req.usuario_id = data.user.id;
    next();
  } catch (e) {
    next(unauthenticatedError());
  }
}

module.exports = requireAuth;
