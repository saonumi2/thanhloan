// Static preview server; requires Node.js, no npm installation needed.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const port = Number(process.env.PORT || 5176);
const mime = { '.svg': 'image/svg+xml', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let pathname;
  let requestUrl;
  try { requestUrl = new URL(req.url, 'http://localhost'); pathname = decodeURIComponent(requestUrl.pathname); }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  const file = path.resolve(root, `.${pathname}`);
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(segment => segment.startsWith('.'))) { res.writeHead(403); res.end('Forbidden'); return; }
  function sendFile(filename) {
    fs.stat(filename, (error, stats) => {
      if (error || !stats.isFile()) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Content-Length': stats.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      if (req.method === 'HEAD') { res.end(); return; }
      const stream = fs.createReadStream(filename);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    });
  }
  fs.stat(file, (error, stats) => {
    if (error) { res.writeHead(404); res.end('Not found'); return; }
    if (stats.isDirectory()) {
      if (!requestUrl.pathname.endsWith('/')) {
        res.writeHead(301, { Location: requestUrl.pathname + '/' + requestUrl.search });
        res.end();
        return;
      }
      sendFile(path.join(file, 'index.html'));
      return;
    }
    sendFile(file);
  });
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is busy. Set PORT to another port and retry.` : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`NTTL preview: http://127.0.0.1:${port}\nPress Ctrl+C to stop.`));
