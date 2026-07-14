const fs = require("fs");
const path = require("path");

// Estrategia de mock (design.md §6, docs/conventions.md §8): NO se hacen
// llamadas de red reales a Gemini. Se mockea `@google/genai` con una
// implementación manual que refleja la forma nueva del SDK
// (`ai.models.generateContent`). El nombre lleva prefijo `mock` porque
// babel-plugin-jest-hoist solo permite que el factory de `jest.mock` (que se
// eleva al top del archivo) referencie variables externas cuyo nombre empieza
// por `mock`.
const mockGenerateContent = jest.fn();

// MOCK: Gemini desactivado en este test
jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

const { GoogleGenAI } = require("@google/genai");
const { llamarGemini } = require("../src/services/ia/gemini");

// El constructor `new GoogleGenAI({ apiKey })` se ejecuta UNA sola vez al
// cargar `gemini.js` (arriba, a nivel de módulo). Capturamos su argumento aquí,
// antes de que el `jest.clearAllMocks()` de `beforeEach` borre
// `GoogleGenAI.mock.calls` — así el test de R9 sigue viendo el argumento real.
const argConstructor = GoogleGenAI.mock.calls[0][0];

// Copia LITERAL de la constante de design.md §3 (idéntica a la de gemini.js),
// para comparar carácter a carácter lo que `llamarGemini` envía en
// `systemInstruction` (R4/R8) sin importar la implementación interna.
const PROMPT_SISTEMA =
  "Eres el motor de planificación de un sistema experto de " +
  "organización académica. Tu única tarea es distribuir las " +
  "tareas_pendientes dentro de los bloques de disponibilidad, " +
  "siguiendo este orden de prioridad: 1) fecha_limite más " +
  "cercana primero (camino crítico), 2) mayor dificultad recibe " +
  "bloques más largos y en horas de mayor concentración, " +
  "3) prioridad_usuario como desempate. Nunca asignes dos " +
  "tareas al mismo bloque horario ni excedas la duracion del " +
  "bloque de disponibilidad. Responde EXCLUSIVAMENTE con un " +
  'objeto JSON con la forma: { "bloques": [ { "tarea_id", ' +
  '"fecha", "hora_inicio", "hora_fin", "justificacion" } ] }';

// Contexto de ejemplo calcado del formato de docs/reglas-ia.md.
const contextoFixture = {
  fecha_actual: "2025-07-07",
  disponibilidad: [{ dia: "lunes", inicio: "18:00", fin: "21:00" }],
  tareas_pendientes: [
    {
      id: "t12",
      curso: "Cálculo II",
      dificultad: 5,
      fecha_limite: "2025-07-10",
      duracion_estimada_h: 3,
      prioridad_usuario: 5,
    },
  ],
};

// Devuelve el objeto pasado a `generateContent` en la última invocación.
function ultimaLlamada() {
  return mockGenerateContent.mock.calls.at(-1)[0];
}

// Lista recursiva de rutas .js bajo `dir` (para el guard de aislamiento, R10).
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const completa = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return walk(completa);
    return entrada.isFile() && completa.endsWith(".js") ? [completa] : [];
  });
}

describe("llamarGemini (ia_llamar_gemini) — specs/ia_llamar_gemini/requirements.md", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Valor por defecto para los tests que solo inspeccionan los argumentos
    // (los tests de camino feliz / error lo sobreescriben con *Once).
    mockGenerateContent.mockResolvedValue({ text: "{}" });
  });

  // R1
  it("expone llamarGemini(contexto, promptAdicional='') y devuelve una Promise", () => {
    expect(typeof llamarGemini).toBe("function");
    expect(llamarGemini.length).toBe(1); // promptAdicional tiene valor por defecto
    const resultado = llamarGemini(contextoFixture);
    expect(resultado).toBeInstanceOf(Promise);
    return resultado; // evita un unhandled rejection warning
  });

  // R2, R3
  it("invoca generateContent en JSON mode y con el modelo gemini-3.5-flash", async () => {
    await llamarGemini(contextoFixture);
    const arg = ultimaLlamada();
    expect(arg.config.responseMimeType).toBe("application/json");
    expect(arg.model).toBe("gemini-3.5-flash");
  });

  // R4
  it("envía el prompt del sistema literal en config.systemInstruction, no en contents", async () => {
    await llamarGemini(contextoFixture);
    const arg = ultimaLlamada();
    expect(arg.config.systemInstruction).toBe(PROMPT_SISTEMA);
    expect(arg.contents).not.toContain(PROMPT_SISTEMA);
  });

  // R5
  it("incluye JSON.stringify(contexto) dentro de contents", async () => {
    await llamarGemini(contextoFixture);
    const arg = ultimaLlamada();
    expect(arg.contents).toContain(JSON.stringify(contextoFixture));
  });

  // R6
  it("devuelve el texto crudo de la respuesta (response.text) sin parsear", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: "RAW_JSON_STRING" });
    const resultado = await llamarGemini(contextoFixture);
    expect(resultado).toBe("RAW_JSON_STRING");
  });

  // R7
  it("propaga la excepción de Gemini sin capturarla ni transformarla", async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error("fallo de red"));
    await expect(llamarGemini(contextoFixture)).rejects.toThrow("fallo de red");
  });

  // R8
  it("anexa promptAdicional al final de systemInstruction sin separadores", async () => {
    await llamarGemini(contextoFixture, "TEXTO_EXTRA");
    const arg = ultimaLlamada();
    expect(arg.config.systemInstruction).toBe(PROMPT_SISTEMA + "TEXTO_EXTRA");
  });

  // R9
  it("inicializa el cliente con apiKey leída de process.env.GEMINI_API_KEY", () => {
    expect(argConstructor).toEqual({ apiKey: process.env.GEMINI_API_KEY });
  });

  // R10
  it("solo el módulo IA importa @google/genai (RNF-05, aislamiento)", () => {
    const SRC = path.resolve(__dirname, "..", "src");
    const IA_DIR = path.join(SRC, "services", "ia");
    const infractores = walk(SRC)
      .filter((archivo) => fs.readFileSync(archivo, "utf-8").includes("@google/genai"))
      .filter((archivo) => !archivo.startsWith(IA_DIR));
    expect(infractores).toEqual([]);
  });

  // R11
  it("re-exporta llamarGemini junto a construirContexto desde el índice del módulo IA", () => {
    const ia = require("../src/services/ia");
    expect(typeof ia.llamarGemini).toBe("function");
    expect(typeof ia.construirContexto).toBe("function");
  });
});
