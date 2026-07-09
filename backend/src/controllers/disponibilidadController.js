const disponibilidadService = require("../services/disponibilidadService");

function crearError(mensaje, status, code) {
  const error = new Error(mensaje);
  error.status = status;
  error.code = code;
  return error;
}

// Valida `dia_semana`, formato de `hora_inicio`/`hora_fin` y rango
// (`hora_fin > hora_inicio`) con los validadores puros del service. Lanza
// 400 `VALIDATION_ERROR` en el primer fallo (R4, R5, R6 en create; R9 en
// update). Reutilizado por `create` y `update`.
function validarCampos({ dia_semana, hora_inicio, hora_fin }) {
  if (!disponibilidadService.validarDiaSemana(dia_semana)) {
    throw crearError(
      "El día de la semana no es válido",
      400,
      "VALIDATION_ERROR"
    );
  }
  if (!disponibilidadService.validarHora(hora_inicio)) {
    throw crearError(
      "La hora de inicio debe tener formato HH:MM (24 h)",
      400,
      "VALIDATION_ERROR"
    );
  }
  if (!disponibilidadService.validarHora(hora_fin)) {
    throw crearError(
      "La hora de fin debe tener formato HH:MM (24 h)",
      400,
      "VALIDATION_ERROR"
    );
  }
  if (!disponibilidadService.rangoValido(hora_inicio, hora_fin)) {
    throw crearError(
      "La hora de fin debe ser mayor que la hora de inicio",
      400,
      "VALIDATION_ERROR"
    );
  }
}

// list(): responde 200 con los bloques del usuario del token (R1), o lista
// vacía si no tiene ninguno (R2). `req.usuario_id` lo adjunta `requireAuth`.
async function list(req, res, next) {
  try {
    const disponibilidad = await disponibilidadService.listarDisponibilidad(
      req.usuario_id
    );
    res.status(200).json({ disponibilidad });
  } catch (err) {
    next(err);
  }
}

// create(): valida `dia_semana`/formato de horas/rango (400/VALIDATION_ERROR
// si falla — R4, R5, R6) antes de llamar al service, para no crear ningún
// bloque con datos inválidos. `usuario_id` viene siempre del token (R3),
// nunca del body. El service propaga 409 `OVERLAP_CONFLICT` si solapa (R7).
async function create(req, res, next) {
  try {
    const { dia_semana, hora_inicio, hora_fin } = req.body || {};

    validarCampos({ dia_semana, hora_inicio, hora_fin });

    const bloque = await disponibilidadService.crearBloque({
      usuario_id: req.usuario_id,
      dia_semana,
      hora_inicio,
      hora_fin,
    });

    res.status(201).json(bloque);
  } catch (err) {
    next(err);
  }
}

// update(): valida los campos presentes en el body (R9). El body debe traer
// `dia_semana`/`hora_inicio`/`hora_fin` para poder validar el rango completo,
// mismo criterio que `POST`. Delega en el service la verificación de
// propiedad (404 `NOT_FOUND` si no es del usuario — R11) y el solapamiento
// excluyendo el propio bloque (409 `OVERLAP_CONFLICT` — R10). Responde 200
// con el objeto actualizado (R8).
async function update(req, res, next) {
  try {
    const { dia_semana, hora_inicio, hora_fin } = req.body || {};

    validarCampos({ dia_semana, hora_inicio, hora_fin });

    const bloque = await disponibilidadService.actualizarBloque({
      usuario_id: req.usuario_id,
      bloque_id: req.params.id,
      cambios: { dia_semana, hora_inicio, hora_fin },
    });

    res.status(200).json(bloque);
  } catch (err) {
    next(err);
  }
}

// remove(): 404 `NOT_FOUND` si el bloque no es del usuario del token (R13),
// 204 sin cuerpo si se elimina correctamente (R12).
async function remove(req, res, next) {
  try {
    await disponibilidadService.eliminarBloque({
      usuario_id: req.usuario_id,
      bloque_id: req.params.id,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
