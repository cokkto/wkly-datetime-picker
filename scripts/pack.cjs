const { execFileSync } = require('child_process');
const fs = require('fs');
for (const name of ['wkly-datetime-picker.core', 'wkly-datetime-picker.adapters', 'wkly-datetime-picker', 'wkly-datetime-picker.11']) {
  const pkg = JSON.parse(fs.readFileSync('dist/' + name + '/package.json'));
  if (name === 'wkly-datetime-picker') {
    for (const dep of [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})])
      if (dep.startsWith('@angular/') || dep === 'rxjs') throw new Error('Angular dependency leaked into shared presentation: ' + dep);
  }
  for (const dep of Object.keys(pkg.dependencies || {})) if (/hebcal|material|playwright|showcase/.test(dep)) throw new Error('Forbidden dependency: ' + dep);
  const result = JSON.parse(execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', '--dry-run', '--json'], { cwd: 'dist/' + name, encoding: 'utf8', shell: process.platform === 'win32' }));
  for (const file of result[0].files) if (/showcase|e2e|snapshot|material|hebcal/.test(file.path)) throw new Error('Forbidden package file: ' + file.path);
  if (name === 'wkly-datetime-picker') for (const file of result[0].files)
    if (/component|ngfactory|\.metadata\.json|cdk-overlay/.test(file.path)) throw new Error('Angular artifact leaked into shared presentation: ' + file.path);
  console.log(name + ': ' + result[0].files.length + ' package files; boundaries verified');
}
