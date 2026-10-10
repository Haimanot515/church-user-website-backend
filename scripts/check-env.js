// Verifies that .env has every variable the server needs. Usage: npm run check:env
require("dotenv").config();
const { validateEnv } = require("../config/env");

try {
  validateEnv();
  console.log("Environment looks good.");
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
