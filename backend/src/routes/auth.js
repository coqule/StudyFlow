const express = require("express");

const authController = require("../controllers/authController");

// Único router que se monta ANTES del middleware de autenticación global
// (ver app.js) — /api/auth/register y /api/auth/login son las dos únicas
// rutas públicas de toda la API (docs/api-contratos.md).
const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

module.exports = router;
