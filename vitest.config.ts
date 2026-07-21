import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // `forks` (default) spawns child processes that Cursor's sandbox cannot SIGKILL
    // (EACCES) — Vitest then waits ~10s per file before continuing. Threads stay in-process.
    pool: 'threads',
  },
});
