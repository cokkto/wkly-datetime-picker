const { defineConfig, devices } = require('./scripts/playwright-api.cjs');
export default defineConfig({
  testDir: './projects/wkly-datetime-picker.showcase/e2e', fullyParallel: true, timeout: 30000, expect: { timeout: 7000 }, retries: process.env.CI ? 1 : 0, workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4200', timezoneId: 'UTC', reducedMotion: 'reduce', trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' },
  projects: [ { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }, { name: 'firefox', use: { ...devices['Desktop Firefox'] } }, { name: 'webkit', use: { ...devices['Desktop Safari'] } }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', viewport: { width: 390, height: 844 } } } ],
  webServer: { command: 'node scripts/serve.cjs', url: 'http://127.0.0.1:4200', reuseExistingServer: false, env: { WKLY_E2E: '1' }, timeout: 60000 },
  snapshotPathTemplate: '{testDir}/baselines/{projectName}/{arg}{ext}'
});
