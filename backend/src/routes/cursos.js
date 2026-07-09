const express = require("express");

const cursosController = require("../controllers/cursosController");

// Solo define el router + delega al controller (docs/conventions.md §3).
// Se monta en `app.js` después de `requireAuth` — todas estas rutas exigen
// JWT válido (R1–R11).
const router = express.Router();

router.get("/", cursosController.list);
router.post("/", cursosController.create);
router.put("/:id", cursosController.update);
router.delete("/:id", cursosController.remove);

module.exports = router;
