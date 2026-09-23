const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const ts = require('typescript');
const angularPlugin = { name: 'angular-ts', setup(build) {
  let emitted = new Map();
  build.onStart(() => {
    emitted = new Map();
    const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
    const compilerOptions = { ...parsed.options, noEmit: false, declaration: false, sourceMap: false };
    const host = ts.createCompilerHost(compilerOptions);
    const originalRead = host.readFile;
    host.readFile = file => {
      let source = originalRead(file);
      if (!source || file.includes('node_modules') || !file.endsWith('.ts')) return source;
      source = source.replace(/templateUrl:\s*'([^']+)'/g, (_, ref) => 'template: ' + JSON.stringify(fs.readFileSync(path.resolve(path.dirname(file), ref), 'utf8')));
      return source.replace(/styleUrls:\s*\[([^\]]+)\]/g, (_, files) => 'styles: [' + [...files.matchAll(/'([^']+)'/g)].map(m => JSON.stringify(fs.readFileSync(path.resolve(path.dirname(file), m[1]), 'utf8'))).join(',') + ']');
    };
    host.writeFile = (file, contents) => emitted.set(path.resolve(file).replace(/\.js$/, '.ts').toLowerCase(), contents);
    ts.createProgram(parsed.fileNames, compilerOptions, host).emit();
  });
  build.onLoad({ filter: /\.ts$/ }, args => {
    if (args.path.includes('node_modules')) return;
    return { contents: emitted.get(args.path.toLowerCase()), loader: 'js', resolveDir: path.dirname(args.path), watchFiles: [args.path, ...['.html', '.css'].map(ext => args.path.replace(/\.ts$/, ext)).filter(file => fs.existsSync(file))] };
  });
} };
const options = { entryPoints: ['projects/wkly-datetime-picker.showcase/src/main.ts'], bundle: true, outdir: 'dist/showcase', format: 'iife', sourcemap: true, target: 'es2018', plugins: [angularPlugin], define: { WKLY_E2E: process.env.WKLY_E2E === '1' ? 'true' : 'false' } };
function assets() { fs.mkdirSync('dist/showcase', { recursive: true }); fs.copyFileSync('projects/wkly-datetime-picker.showcase/src/index.html', 'dist/showcase/index.html'); }
module.exports = { options, assets };
if (require.main === module) { assets(); esbuild.build(options).catch(() => process.exit(1)); }
