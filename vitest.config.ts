import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
