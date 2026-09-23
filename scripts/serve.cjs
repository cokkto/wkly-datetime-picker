const { options, assets } = require('./showcase-build.cjs');
const esbuild = require('esbuild');
const fs = require('fs');
const http = require('http');
const path = require('path');
(async () => {
  assets(); const context = await esbuild.context(options); await context.rebuild(); await context.watch();
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = pathname === '/main.js' || pathname === '/main.css' || pathname.endsWith('.map') ? path.join('dist/showcase', path.basename(pathname)) : 'dist/showcase/index.html';
    if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'); res.setHeader('Cache-Control', 'no-store'); res.end(fs.readFileSync(file));
  });
  server.listen(4200, '127.0.0.1', () => console.log('WKLY showcase: http://127.0.0.1:4200 (library source watch enabled; refresh after changes)'));
  process.on('SIGINT', async () => { server.close(); await context.dispose(); process.exit(); });
})();
