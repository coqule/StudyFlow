const express = require("express");
const cors = require("cors");

const supabase = require("./services/supabase");

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

module.exports = app;
