import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Carrega o .env.test — nunca o .env.local de dev normal
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  // Registra o setup global do Clerk — roda uma vez antes de todos os testes
  globalSetup: require.resolve('./e2e/global-setup.ts'),

  use: {
    baseURL: 'http://localhost:3010',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});