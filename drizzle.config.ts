import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./backend/db/drizzle",
  schema: "./backend/db/schema.ts",
  dialect: "sqlite",
});
