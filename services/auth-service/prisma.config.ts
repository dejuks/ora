import "dotenv/config";
import { defineConfig } from "prisma/config";

// "prisma generate" never connects to the database, so a placeholder is
// enough when .env does not exist yet (fresh clone, first npm install).
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@127.0.0.1:5433/ora_platform";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
