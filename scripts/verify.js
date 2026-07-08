#!/usr/bin/env node
/**
 * verify.js — Script de verificación del harness SDD para StudyFlow.
 *
 * Checks:
 *   1. Versión de Node.js >= 18
 *   2. Archivos de framework presentes
 *   3. feature_list.json parseable y válido
 *   4. Como máximo 1 feature en "in_progress"
 *   5. Toda feature "in_progress" tiene sus 3 archivos de spec
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
let errors = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  errors++;
}

function section(title) {
  console.log(`\n[${title}]`);
}

// ── Check 1: Node.js version ──────────────────────────────────────────────
section("Node.js");
const [major] = process.versions.node.split(".").map(Number);
if (major >= 18) {
  ok(`Node.js ${process.versions.node}`);
} else {
  fail(`Node.js >= 18 requerido. Versión actual: ${process.versions.node}`);
}

// ── Check 2: Framework files ──────────────────────────────────────────────
section("Archivos de framework");
const requiredFiles = [
  "AGENTS.md",
  "CHECKPOINTS.md",
  "CLAUDE.md",
  "feature_list.json",
  "docs/specs.md",
  "docs/verification.md",
  "docs/architecture.md",
  "docs/conventions.md",
  "progress/current.md",
  "progress/history.md",
];

for (const file of requiredFiles) {
  const fullPath = path.join(ROOT, file);
  if (fs.existsSync(fullPath)) {
    ok(file);
  } else {
    fail(`Falta: ${file}`);
  }
}

// ── Check 3 & 4: feature_list.json ───────────────────────────────────────
section("feature_list.json");
const featureListPath = path.join(ROOT, "feature_list.json");
let features = [];

try {
  const raw = fs.readFileSync(featureListPath, "utf-8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.features)) {
    fail('El campo "features" debe ser un array');
  } else {
    features = parsed.features;
    ok(`Parseado correctamente (${features.length} features)`);

    // Validate status values
    const validStatus = parsed.rules?.valid_status ?? [
      "pending", "spec_ready", "in_progress", "done", "blocked"
    ];
    for (const f of features) {
      if (!validStatus.includes(f.status)) {
        fail(`Feature "${f.name}" tiene status inválido: "${f.status}"`);
      }
    }

    // Check one-feature-at-a-time rule
    const inProgress = features.filter((f) => f.status === "in_progress");
    if (inProgress.length === 0) {
      ok("Ninguna feature en in_progress (listo para empezar)");
    } else if (inProgress.length === 1) {
      ok(`1 feature en in_progress: "${inProgress[0].name}"`);
    } else {
      fail(
        `Violación: ${inProgress.length} features en in_progress simultáneamente. ` +
        `Solo se permite 1. Features: ${inProgress.map((f) => f.name).join(", ")}`
      );
    }
  }
} catch (e) {
  fail(`No se pudo parsear feature_list.json: ${e.message}`);
}

// ── Check 5: Spec files for in_progress features ─────────────────────────
section("Specs de features in_progress");
const inProgressFeatures = features.filter((f) => f.status === "in_progress");

if (inProgressFeatures.length === 0) {
  ok("No hay features en in_progress — nada que verificar");
} else {
  for (const feature of inProgressFeatures) {
    const specDir = path.join(ROOT, "specs", feature.name);
    const specFiles = ["requirements.md", "design.md", "tasks.md"];
    for (const file of specFiles) {
      const fullPath = path.join(specDir, file);
      if (fs.existsSync(fullPath)) {
        ok(`specs/${feature.name}/${file}`);
      } else {
        fail(`Falta spec: specs/${feature.name}/${file}`);
      }
    }
  }
}

// ── Check 6: Specs for spec_ready features ────────────────────────────────
section("Specs de features spec_ready");
const specReadyFeatures = features.filter((f) => f.status === "spec_ready");

if (specReadyFeatures.length === 0) {
  ok("No hay features en spec_ready — nada que verificar");
} else {
  for (const feature of specReadyFeatures) {
    const specDir = path.join(ROOT, "specs", feature.name);
    const specFiles = ["requirements.md", "design.md", "tasks.md"];
    for (const file of specFiles) {
      const fullPath = path.join(specDir, file);
      if (fs.existsSync(fullPath)) {
        ok(`specs/${feature.name}/${file}`);
      } else {
        fail(`Falta spec: specs/${feature.name}/${file}`);
      }
    }
  }
}

// ── Check 7: Git branch para features in_progress ───────────────────────
section("Git");
if (inProgressFeatures.length === 0) {
  ok("Ninguna feature en in_progress — rama no requerida");
} else {
  const featureName = inProgressFeatures[0].name;
  const expectedBranch = `feature/${featureName}`;
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT })
      .toString().trim();
    if (branch === expectedBranch) {
      ok(`Rama correcta: ${branch}`);
    } else if (["main", "master", "develop"].includes(branch)) {
      fail(
        `Feature "${featureName}" está in_progress pero estás en "${branch}". ` +
        `Crea la rama: git checkout -b ${expectedBranch}`
      );
    } else {
      fail(
        `Feature "${featureName}" está in_progress pero la rama es "${branch}" ` +
        `en vez de "${expectedBranch}".`
      );
    }
  } catch (e) {
    fail(`No se pudo leer la rama git. ¿Está inicializado el repo? (git init)`);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────
console.log("");
if (errors === 0) {
  console.log("✅ Entorno listo. Todos los checks pasaron.");
  process.exit(0);
} else {
  console.error(`❌ ${errors} check(s) fallaron. Resuelve los errores antes de continuar.`);
  process.exit(1);
}
