import { defineConfig } from 'vitest/config';
import path from 'node:path';

/** Phần 11 (tùy chọn): unit test cho helper pure của notification; không render React. */
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
  },
});
