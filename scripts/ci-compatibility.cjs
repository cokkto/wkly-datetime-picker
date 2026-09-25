const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const supported = require('../supported-angular.json');

function entries() {
  const rows = Object.entries(supported).map(([angular, info]) => {
    if (!/^\d+$/.test(angular)) throw new Error(`Invalid Angular major: ${angular}`);
    if (!/^\d+(?:\.\d+){0,2}$/.test(String(info.node))) throw new Error(`Invalid Node version for Angular ${angular}`);
    if (!Array.isArray(info.verify) || !info.verify.length) throw new Error(`Missing verification scripts for Angular ${angular}`);
    const runtimeDir = path.resolve(root, path.dirname(path.dirname(info.runtimeEntry)));
    const runtimePackage = require(path.join(runtimeDir, 'package.json')).name;
    return { angular, node: String(info.node), runtimePackage };
  });
  if (!rows.length) throw new Error('No supported Angular versions');
  return rows;
}

const command = process.argv[2];
if (command === 'matrix') {
  process.stdout.write(`matrix=${JSON.stringify({ include: entries() })}\n`);
} else if (command === 'verify') {
  const angular = process.argv[3];
  if (!entries().some(row => row.angular === angular)) throw new Error(`Unsupported Angular major: ${angular}`);
  for (const script of supported[angular].verify) {
    if (typeof script !== 'string' || !/^scripts\/[a-z0-9./-]+\.cjs$/.test(script)) throw new Error(`Invalid verification script for Angular ${angular}`);
    const scriptPath = path.resolve(root, script);
    if (!scriptPath.startsWith(path.join(root, 'scripts') + path.sep) || !fs.existsSync(scriptPath)) throw new Error(`Missing verification script: ${script}`);
    console.log(`Angular ${angular}: ${script}`);
    execFileSync(process.execPath, [scriptPath], { cwd: root, stdio: 'inherit' });
  }
} else {
  throw new Error('Usage: node scripts/ci-compatibility.cjs matrix | verify <angular-major>');
}
