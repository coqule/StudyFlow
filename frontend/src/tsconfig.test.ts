// Verifica que TypeScript esté en modo estricto (R6). Lee los tsconfig
// relevantes desde disco y comprueba explícitamente compilerOptions.strict.
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

// Los tsconfig de Vite incluyen comentarios (JSONC), que JSON.parse no
// admite. Se despojan antes de parsear — no hay "//" dentro de valores de
// string en estos archivos, así que la sustitución es segura aquí.
function stripJsonComments(raw: string): string {
  return raw.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
}

function readCompilerOptions(relPath: string) {
  const fullPath = path.join(ROOT, relPath);
  const raw = fs.readFileSync(fullPath, "utf-8");
  const json = JSON.parse(stripJsonComments(raw)) as {
    compilerOptions?: { strict?: boolean };
  };
  return json.compilerOptions;
}

describe("Configuración de TypeScript estricta (R6)", () => {
  it("frontend/tsconfig.json tiene compilerOptions.strict === true", () => {
    const compilerOptions = readCompilerOptions("tsconfig.json");
    expect(compilerOptions?.strict).toBe(true);
  });

  it("frontend/tsconfig.app.json tiene compilerOptions.strict === true", () => {
    const compilerOptions = readCompilerOptions("tsconfig.app.json");
    expect(compilerOptions?.strict).toBe(true);
  });
});
