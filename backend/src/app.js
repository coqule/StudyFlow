const express = require("express");
const cors = require("cors");

const supabase = require("./services/supabase");
const authRouter = require("./routes/auth");
const cursosRouter = require("./routes/cursos");
const requireAuth = require("./middleware/auth");

const app = express();

app.use(cors());
app.use(express.json());

// Único endpoint público de esta feature — usado para confirmar que el
// proceso Express está vivo. No expone datos de negocio ni toca
// Supabase/Gemini para operaciones de negocio (ver docs/architecture.md §2).
//
// Además consulta `usuarios` a través de `services/supabase.js` (R9) para
// evidenciar conectividad real con Supabase. Si la consulta falla (o el
// cliente no está configurado porque faltan variables de entorno), el
// endpoint sigue respondiendo 200 con `db: "error"` — nunca lanza una
// excepción no controlada (ver design.md §4).
app.get("/health", async (req, res) => {
  let db = "error";

  try {
    if (supabase) {
      const { error } = await supabase
        .from("usuarios")
        .select("*", { count: "exact", head: true });

      if (!error) {
        db = "ok";
      }
    }
  } catch (e) {
    db = "error";
  }

  res.status(200).json({ status: "ok", db });
});

// /api/auth/register y /api/auth/login son las dos únicas rutas públicas de
// la API (docs/api-contratos.md) — se montan ANTES del middleware de
// autenticación global para no exigir JWT en ellas (R1, R4).
app.use("/api/auth", authRouter);

// Todo lo demás bajo /api requiere JWT válido (R6, R7). El middleware
// queda listo para que las siguientes features (`tareas_crud`,
// `disponibilidad_crud`, ...) lo reutilicen sin cambios
// (specs/auth/design.md §2).
app.use("/api", requireAuth);

// /api/cursos: CRUD de cursos (specs/cursos_crud/design.md §3). Montado
// DESPUÉS de requireAuth — todas sus rutas exigen JWT válido, y
// `req.usuario_id` ya está disponible para el controller/service (R1–R11).
app.use("/api/cursos", cursosRouter);

// Middleware de errores centralizado (docs/conventions.md §6): responde con
// el status/code que llevan los errores lanzados en controllers/services,
// nunca expone stack traces.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message || "Error interno del servidor",
    ...(err.code ? { code: err.code } : {}),
  });
});

module.exports = app;
