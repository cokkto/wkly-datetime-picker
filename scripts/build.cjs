const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildSync } = require('esbuild');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const tsc = require.resolve('typescript/bin/tsc');
const supported = require('../supported-angular.json');
const angularPackages = Object.entries(supported)
  .filter(([major]) => !process.env.WKLY_ANGULAR || major === process.env.WKLY_ANGULAR)
  .map(([, info]) => info.package);
for (const name of ['wkly-datetime-picker.core', 'wkly-datetime-picker.adapters', 'wkly-datetime-picker', ...angularPackages]) {
  if (process.argv[2] && process.argv[2] !== name) continue;
  const project = path.join('projects', name);
  const out = path.join('dist', name);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  if (!angularPackages.includes(name)) {
    buildSync({ entryPoints: [project + '/src/public-api.ts'], outfile: out + '/index.js', bundle: true, format: 'esm', platform: 'neutral', target: 'es2018', external: ['wkly-datetime-picker.core', 'wkly-datetime-picker.adapters'] });
    buildSync({ entryPoints: [project + '/src/public-api.ts'], outfile: out + '/index.cjs', bundle: true, format: 'cjs', platform: 'node', target: 'node16', external: ['wkly-datetime-picker.core', 'wkly-datetime-picker.adapters'] });
    const paths = { 'wkly-datetime-picker.core': ['dist/wkly-datetime-picker.core/public-api.d.ts'] };
    if (name === 'wkly-datetime-picker') paths['wkly-datetime-picker.adapters'] = ['dist/wkly-datetime-picker.adapters/public-api.d.ts'];
    const config = { extends: '../../tsconfig.json', compilerOptions: { declaration: true, emitDeclarationOnly: true, outDir: '../../dist/' + name, rootDir: 'src', paths, types: [] }, include: ['src/**/*.ts'] };
    fs.writeFileSync(project + '/tsconfig.lib.json', JSON.stringify(config, null, 2));
    execFileSync(process.execPath, [tsc, '-p', project + '/tsconfig.lib.json'], { stdio: 'inherit' });
    const manifest = JSON.parse(fs.readFileSync(project + '/package.json')); delete manifest.scripts;
    fs.writeFileSync(out + '/package.json', JSON.stringify({ ...manifest, main: 'index.cjs', module: 'index.js', types: 'public-api.d.ts' }, null, 2));
    if (name === 'wkly-datetime-picker') fs.copyFileSync(project + '/src/picker.component.css', out + '/picker.css');
  } else {
    execFileSync(process.execPath, [require.resolve('ng-packagr/cli/main.js'), '-p', project + '/ng-package.json', '-c', project + '/tsconfig.lib.json'], { stdio: 'inherit' });
  }
  fs.copyFileSync('LICENSE', out + '/LICENSE'); fs.copyFileSync('README.md', out + '/README.md');
  fs.copyFileSync('docs/API.md', out + '/API.md');
  const builtManifest = JSON.parse(fs.readFileSync(out + '/package.json')); delete builtManifest.scripts;
  if (builtManifest.files && !builtManifest.files.includes('API.md')) builtManifest.files.push('API.md');
  fs.writeFileSync(out + '/package.json', JSON.stringify(builtManifest, null, 2));
  const link = path.join(root, 'node_modules', name); if (!fs.existsSync(link)) fs.symlinkSync(path.join(root, out), link, 'junction');
}
