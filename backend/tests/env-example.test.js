const fs = require("fs");
const path = require("path");

// Raíz del repo (backend/tests -> backend -> raíz)
const ROOT = path.resolve(__dirname, "..", "..");
const ENV_EXAMPLE_PATH = path.join(ROOT, "backend", ".env.example");

const REQUIRED_VARS = [
  "PORT",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "GEMINI_API_KEY",
];

// Variables que nunca deben llevar un valor real (secretos/URLs de proyecto).
const SENSITIVE_VARS = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "GEMINI_API_KEY"];

function parseEnvExample() {
  const raw = fs.readFileSync(ENV_EXAMPLE_PATH, "utf-8");
  const values = {};
  raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .forEach((line) => {
      const [key, ...rest] = line.split("=");
      values[key.trim()] = rest.join("=").trim();
    });
  return values;
}

describe("backend/.env.example (R8)", () => {
  it("existe el archivo backend/.env.example", () => {
    expect(fs.existsSync(ENV_EXAMPLE_PATH) && fs.statSync(ENV_EXAMPLE_PATH).isFile()).toBe(true);
  });

  it.each(REQUIRED_VARS)("documenta la variable %s", (varName) => {
    const values = parseEnvExample();
    expect(Object.prototype.hasOwnProperty.call(values, varName)).toBe(true);
  });

  it.each(SENSITIVE_VARS)("no asigna un valor real a %s (debe quedar vacío)", (varName) => {
    const values = parseEnvExample();
    expect(values[varName]).toBe("");
  });
});
