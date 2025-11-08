import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'v3-fitness-gym-mgm',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/__tests__/setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.type.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    // Mocking settings
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    // Performance settings
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    // Timeout settings
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
