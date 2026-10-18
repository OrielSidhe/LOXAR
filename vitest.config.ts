import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['tests-gui/**/*', 'node_modules/**/*'],
  },
});
