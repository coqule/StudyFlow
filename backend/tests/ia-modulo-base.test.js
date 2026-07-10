const fs = require("fs");
const path = require("path");

// backend/tests -> backend
const BACKEND = path.resolve(__dirname, "..");
const IA_DIR = path.join(BACKEND, "src", "services", "ia");

const iaModule = require("../src/services/ia");
const { construirContexto } = require("../src/services/ia/contexto");
const { llamarGemini } = require("../src/services/ia/gemini");
const { validarRespuesta } = require("../src/services/ia/validacion");

// Recorre recursivamente un directorio devolviendo las rutas absolutas de
// todos los archivos .js, saltando node_modules.
function walkJsFiles(dir) {
  const resultados = [];
  const entradas = fs.readdirSync(dir, { withFileTypes: true });
  for (const entrada of entradas) {
    if (entrada.name === "node_modules") continue;
    const rutaCompleta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      resultados.push(...walkJsFiles(rutaCompleta));
    } else if (entrada.isFile() && entrada.name.endsWith(".js")) {
      resultados.push(rutaCompleta);
    }
  }
  return resultados;
}

describe("Módulo IA — andamiaje base (R1)", () => {
  const archivosEsperados = [
    "index.js",
    "contexto.js",
    "gemini.js",
    "validacion.js",
  ];

  it.each(archivosEsperados)(
    "existe backend/src/services/ia/%s",
    (nombreArchivo) => {
      const rutaCompleta = path.join(IA_DIR, nombreArchivo);
      expect(fs.existsSync(rutaCompleta) && fs.statSync(rutaCompleta).isFile()).toBe(
        true
      );
    }
  );
});

describe("Módulo IA — interfaz pública de index.js (R2)", () => {
  it("exporta exactamente construirContexto, llamarGemini y validarRespuesta", () => {
    expect(Object.keys(iaModule).sort()).toEqual(
      ["construirContexto", "llamarGemini", "validarRespuesta"].sort()
    );
  });

  it("cada export es una función", () => {
    expect(typeof iaModule.construirContexto).toBe("function");
    expect(typeof iaModule.llamarGemini).toBe("function");
    expect(typeof iaModule.validarRespuesta).toBe("function");
  });
});

describe("Módulo IA — firmas de los stubs (R3, R4, R5)", () => {
  it("construirContexto(usuario_id) recibe un solo parámetro", () => {
    expect(typeof construirContexto).toBe("function");
    expect(construirContexto.length).toBe(1);
  });

  it("llamarGemini(contexto, promptAdicional = '') tiene aridad 1 (2do parámetro con default)", () => {
    expect(typeof llamarGemini).toBe("function");
    expect(llamarGemini.length).toBe(1);
  });

  it("validarRespuesta(respuestaRaw, disponibilidad) recibe dos parámetros", () => {
    expect(typeof validarRespuesta).toBe("function");
    expect(validarRespuesta.length).toBe(2);
  });
});

describe("Módulo IA — stubs lanzan 'no implementado' (R6)", () => {
  it("construirContexto lanza Error con mensaje de no implementado", () => {
    expect(() => construirContexto("usuario-1")).toThrow(/no implementado/i);
  });

  it("llamarGemini lanza Error con mensaje de no implementado", () => {
    expect(() => llamarGemini({ fecha_actual: "2025-07-07" })).toThrow(
      /no implementado/i
    );
  });

  it("validarRespuesta lanza Error con mensaje de no implementado", () => {
    expect(() => validarRespuesta("{}", [])).toThrow(/no implementado/i);
  });
});

describe("Módulo IA — carga sin errores (R8)", () => {
  it("require('../src/services/ia') no lanza ninguna excepción", () => {
    expect(() => require("../src/services/ia")).not.toThrow();
  });
});

describe("Módulo IA — aislamiento del SDK de Gemini (R7, R9)", () => {
  it("ningún archivo fuera de backend/src/services/ia contiene '@google/generative-ai'", () => {
    const archivosSrc = walkJsFiles(path.join(BACKEND, "src"));
    const infractores = archivosSrc
      .filter((archivo) =>
        fs.readFileSync(archivo, "utf-8").includes("@google/generative-ai")
      )
      .filter((archivo) => !archivo.startsWith(IA_DIR));

    expect(infractores).toEqual([]);
  });

  it("los archivos del módulo IA tampoco importan '@google/generative-ai' todavía (import diferido a ia_llamar_gemini)", () => {
    const archivosIa = walkJsFiles(IA_DIR);
    const conImportSdk = archivosIa.filter((archivo) =>
      fs.readFileSync(archivo, "utf-8").includes("@google/generative-ai")
    );

    expect(conImportSdk).toEqual([]);
  });
});
