import app from "./app";
import { logger } from "./lib/logger";
import { runRuntimeMigrations } from "./lib/runtimeMigrations";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Apply self-healing runtime migrations before the server accepts traffic, so
// the very first request can rely on the latest schema state. Errors here are
// logged inside runRuntimeMigrations and never block startup.
await runRuntimeMigrations();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
