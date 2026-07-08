const path = require("path");
const dotenv = require("dotenv");

// Carga las variables de entorno reales de Supabase para los tests de
// integración (health-db, RLS) desde `backend/.env.test` (no versionado,
// ver .gitignore raíz). Se usa un archivo separado del `.env` de desarrollo
// para no depender del entorno local de cada agente/desarrollador
// (docs/conventions.md §7, specs/base_datos/design.md §5).
//
// `setupFiles` de Jest corre antes de instalar el framework de test y antes
// de que el archivo de test haga sus `require(...)`, así que las variables
// ya están disponibles en `process.env` cuando `services/supabase.js` (u
// otro módulo) las lee al cargarse.
dotenv.config({ path: path.resolve(__dirname, "..", ".env.test") });
