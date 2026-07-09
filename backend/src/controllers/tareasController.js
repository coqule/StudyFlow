const tareasService = require("../services/tareasService");

function crearError(mensaje, status, code) {
  const error = new Error(mensaje);
  error.status = status;
  error.code = code;
  return error;
}

// list(): responde 200 con las tareas del usuario del token (R1), o lista
// vacía si no tiene ninguna (R2). `req.usuario_id` lo adjunta `requireAuth`.
async function list(req, res, next) {
  try {
    const tareas = await tareasService.listarTareas(req.usuario_id);
    res.status(200).json({ tareas });
  } catch (err) {
    next(err);
  }
}

// create(): valida `tipo`/`prioridad`/`fecha_limite` (400/VALIDATION_ERROR
// si falla — R4, R5, R6) antes de llamar al service; verifica
// `perteneceUsuario(curso_id, usuario_id)` (403/FORBIDDEN si no — R7).
async function create(req, res, next) {
  try {
    const { curso_id, titulo, tipo, fecha_limite, duracion_estimada_h, prioridad } = req.body || {};

    if (!tareasService.validarTipo(tipo)) {
      throw crearError(
        "El tipo debe ser uno de: tarea, examen, proyecto",
        400,
        "VALIDATION_ERROR"
      );
    }
    if (!tareasService.validarPrioridad(prioridad)) {
      throw crearError(
        "La prioridad debe ser un entero entre 1 y 5",
        400,
        "VALIDATION_ERROR"
      );
    }
    if (!tareasService.validarFechaLimite(fecha_limite)) {
      throw crearError(
        "La fecha límite debe ser una fecha futura en formato YYYY-MM-DD",
        400,
        "VALIDATION_ERROR"
      );
    }

    const esPropio = await tareasService.perteneceUsuario(curso_id, req.usuario_id);
    if (!esPropio) {
      throw crearError("No tienes permiso sobre este curso", 403, "FORBIDDEN");
    }

    const tarea = await tareasService.crearTarea({
      curso_id,
      titulo,
      tipo,
      fecha_limite,
      duracion_estimada_h,
      prioridad,
    });

    res.status(201).json(tarea);
  } catch (err) {
    next(err);
  }
}

// update(): valida solo los campos presentes en el body que tengan
// validador (`tipo`, `prioridad`, `fecha_limite` — R10); delega en el
// service la verificación de propiedad (R9). Responde 200 con el objeto
// actualizado (R8).
async function update(req, res, next) {
  try {
    const { curso_id, titulo, tipo, fecha_limite, duracion_estimada_h, prioridad, estado } =
      req.body || {};
    const cambios = {};

    if (tipo !== undefined) {
      if (!tareasService.validarTipo(tipo)) {
        throw crearError(
          "El tipo debe ser uno de: tarea, examen, proyecto",
          400,
          "VALIDATION_ERROR"
        );
      }
      cambios.tipo = tipo;
    }
    if (prioridad !== undefined) {
      if (!tareasService.validarPrioridad(prioridad)) {
        throw crearError(
          "La prioridad debe ser un entero entre 1 y 5",
          400,
          "VALIDATION_ERROR"
        );
      }
      cambios.prioridad = prioridad;
    }
    if (fecha_limite !== undefined) {
      if (!tareasService.validarFechaLimite(fecha_limite)) {
        throw crearError(
          "La fecha límite debe ser una fecha futura en formato YYYY-MM-DD",
          400,
          "VALIDATION_ERROR"
        );
      }
      cambios.fecha_limite = fecha_limite;
    }
    if (curso_id !== undefined) {
      cambios.curso_id = curso_id;
    }
    if (titulo !== undefined) {
      cambios.titulo = titulo;
    }
    if (duracion_estimada_h !== undefined) {
      cambios.duracion_estimada_h = duracion_estimada_h;
    }
    if (estado !== undefined) {
      cambios.estado = estado;
    }

    const tarea = await tareasService.actualizarTarea({
      usuario_id: req.usuario_id,
      tarea_id: req.params.id,
      cambios,
    });

    res.status(200).json(tarea);
  } catch (err) {
    next(err);
  }
}

// remove(): 403 si la tarea no pertenece al usuario del token (R12), 204
// sin cuerpo si se elimina correctamente (R11).
async function remove(req, res, next) {
  try {
    await tareasService.eliminarTarea({
      usuario_id: req.usuario_id,
      tarea_id: req.params.id,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
