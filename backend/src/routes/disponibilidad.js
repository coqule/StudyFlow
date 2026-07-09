const express = require("express");

const disponibilidadController = require("../controllers/disponibilidadController");

// Solo define el router + delega al controller (docs/conventions.md §3).
// Se monta en `app.js` después de `requireAuth` — todas estas rutas exigen
// JWT válido (R1–R13).
const router = express.Router();

router.get("/", disponibilidadController.list);
router.post("/", disponibilidadController.create);
router.put("/:id", disponibilidadController.update);
router.delete("/:id", disponibilidadController.remove);

module.exports = router;
