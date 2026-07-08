const request = require("supertest");

// Requiere credenciales reales de Supabase (SUPABASE_URL + SUPABASE_SERVICE_KEY)
// cargadas desde backend/.env.test por tests/setupEnv.js (ver jest.config.js).
// A diferencia de tests/health.test.js (que solo valida la forma del
// contrato, "ok" | "error"), este test exige conectividad real y db: "ok"
// (R9, specs/base_datos/requirements.md).
describe("GET /health con Supabase real (R9)", () => {
  it("responde 200 con { status: 'ok', db: 'ok' } cuando Supabase está disponible", async () => {
    expect(process.env.SUPABASE_URL).toBeTruthy();
    expect(process.env.SUPABASE_SERVICE_KEY).toBeTruthy();

    // Se requiere dentro del test (no en el top-level del archivo) para que
    // se evalúe después de que setupFiles ya haya cargado .env.test y
    // `services/supabase.js` instancie el cliente real al hacer `require`.
    const app = require("../src/app");

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "ok" });
  });
});
