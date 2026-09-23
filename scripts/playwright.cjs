const path = require('path');
const name = Number(process.versions.node.split('.')[0]) < 20 ? 'playwright-node16' : '@playwright/test';
if (name === 'playwright-node16' && !process.env.PLAYWRIGHT_DOWNLOAD_HOST) process.env.PLAYWRIGHT_DOWNLOAD_HOST = 'https://cdn.playwright.dev/dbazure/download/playwright';
require(path.join(path.dirname(require.resolve(name + '/package.json')), 'cli.js'));
