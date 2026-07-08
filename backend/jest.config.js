module.exports = {
  testEnvironment: "node",
  // Carga backend/.env.test antes de cada test file — ver tests/setupEnv.js.
  setupFiles: ["<rootDir>/tests/setupEnv.js"],
};
