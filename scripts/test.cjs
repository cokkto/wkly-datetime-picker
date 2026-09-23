const esbuild = require('esbuild');
const { execFileSync } = require('child_process');
esbuild.buildSync({ entryPoints: ['tests/contracts.ts'], outfile: '.test-build/contracts.cjs', bundle: true, platform: 'node', format: 'cjs', target: 'node16' });
execFileSync(process.execPath, ['.test-build/contracts.cjs'], { stdio: 'inherit' });
