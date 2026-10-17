const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3333;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4'
};

const server = http.createServer((req, res) => {
  // Normalize URL to remove query parameters and hashes
  let reqPath = decodeURI(req.url.split('?')[0].split('#')[0]);
  
  if (reqPath === '/') {
    reqPath = '/index.html';
  }

  // Rewrite /sites/azimute/... paths to workspace root
  if (reqPath.startsWith('/sites/azimute/')) {
    reqPath = reqPath.replace('/sites/azimute/', '/');
  }

  let filePath = path.join(ROOT, reqPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      console.warn(`[404] Not Found: ${req.url}`);
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>404 Not Found</h1><p>${req.url} does not exist.</p>`);
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        console.error(`[500] Read error for ${filePath}:`, readErr);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });
      res.end(content);
      console.log(`[200] ${req.method} ${req.url} (${contentType})`);
    });
  });
});

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Azimute Residencial Localhost Server    `);
  console.log(` URL: http://localhost:${PORT}/           `);
  console.log(` Serving from: ${ROOT}                   `);
  console.log(`=========================================`);
});
