const express = require("express");

const tareasController = require("../controllers/tareasController");

// Solo define el router + delega al controller (docs/conventions.md §3).
// Se monta en `app.js` después de `requireAuth` — todas estas rutas exigen
// JWT válido (R1–R12).
const router = express.Router();

router.get("/", tareasController.list);
router.post("/", tareasController.create);
router.put("/:id", tareasController.update);
router.delete("/:id", tareasController.remove);

module.exports = router;
