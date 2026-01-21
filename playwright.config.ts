import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: false, // Run tests sequentially for better stability
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Single worker to avoid conflicts
    reporter: 'html',
    timeout: 30000, // 30 seconds per test

    use: {
        baseURL: 'http://localhost:3001',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    // Don't start webserver automatically - user already has it running
    // webServer: {
    //   command: 'npm run dev',
    //   url: 'http://localhost:3001',
    //   reuseExistingServer: true,
    // },
});
