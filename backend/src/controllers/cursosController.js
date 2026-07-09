const cursosService = require("../services/cursosService");

function crearError(mensaje, status, code) {
  const error = new Error(mensaje);
  error.status = status;
  error.code = code;
  return error;
}

// list(): responde 200 con los cursos del usuario del token (R1), o lista
// vacía si no tiene ninguno (R2). `req.usuario_id` lo adjunta `requireAuth`.
async function list(req, res, next) {
  try {
    const cursos = await cursosService.listarCursos(req.usuario_id);
    res.status(200).json({ cursos });
  } catch (err) {
    next(err);
  }
}

// create(): valida `nombre`/`dificultad`/`color` (400/VALIDATION_ERROR si
// falla — R4, R5, R6) antes de llamar al service, para no crear ningún
// curso con datos inválidos. `usuario_id` viene siempre del token (R3),
// nunca del body.
async function create(req, res, next) {
  try {
    const { nombre, color, dificultad, profesor, creditos } = req.body || {};

    if (!cursosService.validarNombre(nombre)) {
      throw crearError("El nombre del curso es obligatorio", 400, "VALIDATION_ERROR");
    }
    if (!cursosService.validarDificultad(dificultad)) {
      throw crearError(
        "La dificultad debe ser un entero entre 1 y 5",
        400,
        "VALIDATION_ERROR"
      );
    }
    if (!cursosService.validarColorHex(color)) {
      throw crearError(
        "El color debe tener un formato hex válido (#RRGGBB o #RGB)",
        400,
        "VALIDATION_ERROR"
      );
    }

    const curso = await cursosService.crearCurso({
      usuario_id: req.usuario_id,
      nombre: nombre.trim(),
      color,
      dificultad,
      profesor,
      creditos,
    });

    res.status(201).json(curso);
  } catch (err) {
    next(err);
  }
}

// update(): valida solo los campos presentes en el body que tengan
// validador (`dificultad`, `color` — R9); delega en el service la
// verificación de propiedad, que responde 403 si el curso no es del
// usuario del token (R8). Responde 200 con el objeto actualizado (R7).
async function update(req, res, next) {
  try {
    const { nombre, color, dificultad, profesor, creditos } = req.body || {};
    const cambios = {};

    if (nombre !== undefined) {
      if (!cursosService.validarNombre(nombre)) {
        throw crearError("El nombre del curso es obligatorio", 400, "VALIDATION_ERROR");
      }
      cambios.nombre = nombre.trim();
    }
    if (dificultad !== undefined) {
      if (!cursosService.validarDificultad(dificultad)) {
        throw crearError(
          "La dificultad debe ser un entero entre 1 y 5",
          400,
          "VALIDATION_ERROR"
        );
      }
      cambios.dificultad = dificultad;
    }
    if (color !== undefined) {
      if (!cursosService.validarColorHex(color)) {
        throw crearError(
          "El color debe tener un formato hex válido (#RRGGBB o #RGB)",
          400,
          "VALIDATION_ERROR"
        );
      }
      cambios.color = color;
    }
    if (profesor !== undefined) {
      cambios.profesor = profesor;
    }
    if (creditos !== undefined) {
      cambios.creditos = creditos;
    }

    const curso = await cursosService.actualizarCurso({
      usuario_id: req.usuario_id,
      curso_id: req.params.id,
      cambios,
    });

    res.status(200).json(curso);
  } catch (err) {
    next(err);
  }
}

// remove(): 403 si el curso no es del usuario del token (R11), 204 sin
// cuerpo si se elimina correctamente (R10).
async function remove(req, res, next) {
  try {
    await cursosService.eliminarCurso({
      usuario_id: req.usuario_id,
      curso_id: req.params.id,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
