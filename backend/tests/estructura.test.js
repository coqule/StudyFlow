const fs = require("fs");
const path = require("path");

// Raíz del repo (backend/tests -> backend -> raíz)
const ROOT = path.resolve(__dirname, "..", "..");

const requiredDirs = [
  "backend/src/routes",
  "backend/src/controllers",
  "backend/src/services",
  "backend/src/services/ia",
  "backend/src/middleware",
  "backend/tests",
  "frontend/src/components",
  "frontend/src/pages",
  "frontend/src/hooks",
  "frontend/src/services",
  "frontend/src/types",
];

const requiredFiles = [
  "backend/src/app.js",
  "backend/package.json",
  "frontend/package.json",
  "package.json",
];

describe("Estructura de carpetas del monorepo (docs/architecture.md §9)", () => {
  it.each(requiredDirs)("existe el directorio %s", (relDir) => {
    const fullPath = path.join(ROOT, relDir);
    expect(fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()).toBe(true);
  });

  it.each(requiredFiles)("existe el archivo %s", (relFile) => {
    const fullPath = path.join(ROOT, relFile);
    expect(fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()).toBe(true);
  });

  it("el package.json raíz solo define el script verify", () => {
    const rootPkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
    );
    expect(Object.keys(rootPkg.scripts || {})).toEqual(["verify"]);
  });
});
