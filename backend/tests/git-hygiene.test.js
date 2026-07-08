const { execSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");

function gitLsFiles() {
  return execSync("git ls-files", { cwd: ROOT })
    .toString()
    .split("\n")
    .filter(Boolean);
}

describe("Higiene de git (R4, R5)", () => {
  it("no rastrea ningún archivo .env (solo .env.example está permitido)", () => {
    const files = gitLsFiles();
    const envFiles = files.filter((f) => /(^|\/)\.env$/.test(f));
    expect(envFiles).toEqual([]);
  });

  it("rastrea backend/src/services/ia/.gitkeep desde el primer commit", () => {
    const files = gitLsFiles();
    expect(files).toContain("backend/src/services/ia/.gitkeep");
  });
});
