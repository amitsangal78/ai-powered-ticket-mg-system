import { loadEnv } from './config/env.js';
import { loadDotEnvFile } from './config/loadDotEnv.js';
import { createApp } from './app.js';
import { closePool, createPool } from './db/pool.js';

loadDotEnvFile();
const env = loadEnv();
createPool(env);

const app = createApp(env);
const server = app.listen(env.PORT, () => {
  console.info(`API listening on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  console.info(`${signal} received — shutting down`);
  server.close(async () => {
    try {
      await closePool();
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown', err);
      process.exit(1);
    }
  });
}

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.once('SIGINT', () => {
  void shutdown('SIGINT');
});
