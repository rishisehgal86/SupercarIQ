import { defineConfig } from "drizzle-kit";

// Support both a single DATABASE_URL and Railway's individual MySQL env vars.
// Railway uses MYSQLHOST/MYSQLPORT/MYSQLUSER/MYSQLPASSWORD (no underscore) + MYSQL_DATABASE.
function resolveConnectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.MYSQLHOST      ?? process.env.MYSQL_HOST;
  const port = process.env.MYSQLPORT      ?? process.env.MYSQL_PORT      ?? "3306";
  const user = process.env.MYSQLUSER      ?? process.env.MYSQL_USER;
  const pass = process.env.MYSQLPASSWORD  ?? process.env.MYSQL_PASSWORD;
  const db   = process.env.MYSQL_DATABASE ?? process.env.MYSQLDATABASE;
  if (host && user && pass && db) {
    return `mysql://${user}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
  }
  throw new Error(
    "Database connection not configured. Set DATABASE_URL or MYSQLHOST/MYSQLUSER/MYSQLPASSWORD/MYSQL_DATABASE."
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
