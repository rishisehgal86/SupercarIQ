import { defineConfig } from "drizzle-kit";

// Support both a single DATABASE_URL and Railway's individual MySQL env vars.
function resolveConnectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.MYSQL_HOST;
  const port = process.env.MYSQL_PORT ?? "3306";
  const user = process.env.MYSQL_USER;
  const pass = process.env.MYSQL_PASSWORD;
  const db   = process.env.MYSQL_DATABASE;
  if (host && user && pass && db) {
    return `mysql://${user}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
  }
  throw new Error(
    "Database connection not configured. Set DATABASE_URL or MYSQL_HOST/MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE."
  );
}

const connectionString = resolveConnectionString();

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
