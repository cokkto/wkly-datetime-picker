// Current browser releases require modern Node. Retain a Node 16-compatible
// runner for the minimum supported build environment without downgrading CI.
module.exports = require(Number(process.versions.node.split('.')[0]) < 20 ? 'playwright-node16' : '@playwright/test');
