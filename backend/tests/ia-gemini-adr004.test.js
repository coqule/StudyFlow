const { GoogleGenAI } = require("@google/genai");

// ---------------------------------------------------------------------------
// Feature 13 — RNF-03 / ADR-004: Timeout + Retry con backoff
// ---------------------------------------------------------------------------
// Este archivo se mantiene separado de ia-gemini.test.js porque los tests de
// timeout requieren recargar el módulo con GEMINI_TIMEOUT_MS pequeño para
// no esperar 10 s reales. Se mockea @google/genai igual que en el otro
// archivo y se fuerza el timeout a 50 ms vía env var antes de cada require.

const mockGenerateContent = jest.fn();

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

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

function crearError503() {
  const err = new Error("503 UNAVAILABLE — high demand");
  err.status = 503;
  err.name = "ApiError";
  return err;
}

function crearError400() {
  const err = new Error("400 BAD REQUEST");
  err.status = 400;
  err.name = "ApiError";
  return err;
}

// Helper: generateContent que cuelga hasta que abortSignal lo aborte.
function colgarHastaTimeout() {
  return ({ config }) =>
    new Promise((_, reject) => {
      const signal = config?.abortSignal;
      if (signal) {
        signal.addEventListener("abort", () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      }
    });
}

describe("llamarGemini — ADR-004 timeout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env.GEMINI_TIMEOUT_MS = "50";
  });

  it("lanza error cuando el timeout vence (AbortError)", async () => {
    const { llamarGemini } = require("../src/services/ia/gemini");
    mockGenerateContent.mockImplementation(colgarHastaTimeout());
    await expect(llamarGemini(contextoFixture)).rejects.toThrow(
      "The operation was aborted"
    );
  }, 5000);

  it("no reintenta AbortError (timeout)", async () => {
    const { llamarGemini } = require("../src/services/ia/gemini");
    mockGenerateContent.mockImplementation(colgarHastaTimeout());
    await expect(llamarGemini(contextoFixture)).rejects.toThrow(
      "The operation was aborted"
    );
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  }, 5000);
});

describe("llamarGemini — ADR-004 retry", () => {
  let llamarGemini;

  beforeAll(() => {
    jest.resetModules();
    process.env.GEMINI_TIMEOUT_MS = "5000";
    llamarGemini = require("../src/services/ia/gemini").llamarGemini;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateContent.mockResolvedValue({ text: "{}" });
  });

  it("reintenta una vez ante 503 y recupera si el segundo es exitoso", async () => {
    mockGenerateContent
      .mockRejectedValueOnce(crearError503())
      .mockResolvedValueOnce({ text: '{"ok": true}' });

    const resultado = await llamarGemini(contextoFixture);
    expect(resultado).toBe('{"ok": true}');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  }, 10000);

  it("lanza error tras agotar reintentos si el 503 persiste", async () => {
    mockGenerateContent.mockRejectedValue(crearError503());
    await expect(llamarGemini(contextoFixture)).rejects.toThrow("503 UNAVAILABLE");
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  }, 10000);

  it("NO reintenta errores no transitorios (ej. 400)", async () => {
    mockGenerateContent.mockRejectedValue(crearError400());
    await expect(llamarGemini(contextoFixture)).rejects.toThrow("400 BAD REQUEST");
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it("reintenta 503 y propaga el último error si el segundo falla con otro código", async () => {
    mockGenerateContent
      .mockRejectedValueOnce(crearError503())
      .mockRejectedValueOnce(crearError400());

    await expect(llamarGemini(contextoFixture)).rejects.toThrow("400 BAD REQUEST");
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  }, 10000);
});
