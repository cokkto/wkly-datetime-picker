const path = require('path');
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: __dirname,
  testMatch: 'picker.spec.cjs',
  timeout: 30000,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4300', timezoneId: 'UTC', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'node tests/compatibility/server.cjs', cwd: path.resolve(__dirname, '../..'), url: 'http://127.0.0.1:4300', reuseExistingServer: false },
});
