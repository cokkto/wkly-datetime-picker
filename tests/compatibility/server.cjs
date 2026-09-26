const fs = require('fs');
const path = require('path');
const http = require('http');
const major = process.env.ANGULAR_MAJOR;
if (!/^\d+$/.test(major || '')) throw new Error('Set ANGULAR_MAJOR');
const root = path.resolve('.compat', major, 'consumer/public');
http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
  fs.createReadStream(file).pipe(res);
}).listen(4300, '127.0.0.1');
