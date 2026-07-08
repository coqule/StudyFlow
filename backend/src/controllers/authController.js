const authService = require("../services/authService");

function crearError(mensaje, status, code) {
  const error = new Error(mensaje);
  error.status = status;
  error.code = code;
  return error;
}

// register(): valida el input (400 con VALIDATION_ERROR si el formato es
// inválido, R2), delega en authService.registrar y responde 201 (R1).
// Los errores del service (p. ej. 409 EMAIL_TAKEN, R3) se propagan a
// next(err) → middleware de errores centralizado (docs/conventions.md §6).
async function register(req, res, next) {
  try {
    const { correo, password, nombre } = req.body || {};

    if (!authService.validarCorreo(correo)) {
      throw crearError("El correo no tiene un formato válido", 400, "VALIDATION_ERROR");
    }
    if (!authService.validarPassword(password)) {
      throw crearError(
        "La contraseña debe tener al menos 8 caracteres",
        400,
        "VALIDATION_ERROR"
      );
    }
    if (typeof nombre !== "string" || !nombre.trim()) {
      throw crearError("El nombre es obligatorio", 400, "VALIDATION_ERROR");
    }

    const usuario = await authService.registrar({ correo, password, nombre });
    res.status(201).json({ usuario });
  } catch (err) {
    next(err);
  }
}

// login(): mismo patrón, responde 200 (R4). Correo/password ausentes se
// tratan como credenciales inválidas (R5) sin llamar a Supabase.
async function login(req, res, next) {
  try {
    const { correo, password } = req.body || {};

    if (!correo || !password) {
      throw crearError("Correo o contraseña incorrectos", 401, "INVALID_CREDENTIALS");
    }

    const resultado = await authService.iniciarSesion({ correo, password });
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
