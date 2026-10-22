import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/app/core/**/*.spec.ts', 'src/app/shared/**/*.spec.ts', 'tests/unit/**/*.spec.ts'],
    environment: 'node',
    reporters: ['default'],
  },
});
