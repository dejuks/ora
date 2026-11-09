import "dotenv/config";
import app from "./app.js";
import { pool } from "./config/db.js";

const port = Number(process.env.PORT || 4001);

const required = ["DATABASE_URL", "ACCESS_TOKEN_SECRET"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}. Copy .env.example to .env.`);
  process.exit(1);
}

const server = app.listen(port, () => {
  console.log(`ORA Journal Service running on http://localhost:${port}/api/v1/jms`);
});

const stop = async () => {
  server.close();
  await pool.end().catch(() => undefined);
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
