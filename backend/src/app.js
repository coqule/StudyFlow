const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Único endpoint público de esta feature — usado para confirmar que el
// proceso Express está vivo. No expone datos de negocio ni toca
// Supabase/Gemini (ver docs/architecture.md §2).
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

module.exports = app;
