import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
    /*
     * The default 5s is a Node-unit-test default, and several suites here are
     * not Node unit tests: the release-retention and MCP side-effect suites
     * spawn shells and build real SQLite stores on disk, ten deployments at a
     * time. They pass in a second when run alone and time out at five when the
     * whole suite is running beside them — a property of the machine, not of
     * the assertions. Raising the ceiling makes a red run mean a real failure.
     */
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': rootDir,
      /*
       * `server-only` throws on import to stop server modules being pulled into
       * a client bundle. That is a bundling guard, and there is no bundle here:
       * the tests run in Node, which is the environment those modules are
       * written for. Next resolves this package to an empty module under the
       * `react-server` condition and the workers run with that condition set,
       * so pointing at the same empty module is what the real runtimes already
       * do rather than a hole opened for the tests.
       */
      'server-only': path.join(rootDir, 'node_modules/server-only/empty.js'),
    },
  },
});
