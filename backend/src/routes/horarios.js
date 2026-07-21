const express = require("express");

const horariosController = require("../controllers/horariosController");

// Solo define el router + delega al controller (docs/conventions.md §3).
// Se monta en `app.js` después de `requireAuth` — esta ruta exige JWT válido
// y `req.usuario_id` ya está disponible para el controller (R1).
const router = express.Router();

router.post("/generar", horariosController.generar);

module.exports = router;
