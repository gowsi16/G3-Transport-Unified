const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const fs = require('fs');
const net = require('net');

const PORT = process.env.PORT || 3000;
const VITE_PORT = process.env.VITE_PORT || 5173;
const CRA_PORT = process.env.CRA_PORT || 3002;
const BOOKING_BACKEND_PORT = process.env.BOOKING_BACKEND_PORT || 5000;
const TRANSPORT_BACKEND_PORT = process.env.TRANSPORT_BACKEND_PORT || 5001;

const CRA_BUILD_DIR = path.resolve(__dirname, 'G3-Transport', 'frontend', 'build');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

// Check if CRA dev server is reachable
let isCraDevRunning = false;
const checkCraDevServer = () => {
  const req = http.request({
    hostname: 'localhost',
    port: CRA_PORT,
    path: '/admin',
    method: 'HEAD',
    timeout: 800
  }, (res) => {
    isCraDevRunning = true;
  });
  req.on('error', () => {
    isCraDevRunning = false;
  });
  req.on('timeout', () => {
    req.destroy();
    isCraDevRunning = false;
  });
  req.end();
};

setInterval(checkCraDevServer, 5000);
checkCraDevServer();

// Proxy HTTP request to target with optional fallback
const proxyRequest = (req, res, targetPort, targetPath, onErrorFallback) => {
  const options = {
    hostname: 'localhost',
    port: targetPort,
    path: targetPath || req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${targetPort}`,
      'x-forwarded-host': req.headers.host || `localhost:${PORT}`,
      'x-forwarded-proto': 'http',
      'x-forwarded-for': req.socket.remoteAddress
    }
  };

  const proxy = http.request(options, (targetRes) => {
    if (targetRes.statusCode === 404 && onErrorFallback) {
      const parsedPath = url.parse(req.url).pathname;
      const isSpaRoute = parsedPath.startsWith('/admin') && !path.extname(parsedPath.replace(/^\/admin/, ''));
      if (isSpaRoute) {
        return onErrorFallback(new Error('Dev server returned 404 for SPA route'));
      }
    }
    res.writeHead(targetRes.statusCode, targetRes.headers);
    targetRes.pipe(res);
  });

  proxy.on('error', (err) => {
    if (onErrorFallback && !res.headersSent) {
      return onErrorFallback(err);
    }
    console.error(`[Gateway Proxy Error] targetPort=${targetPort} url=${req.url} err=${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Bad Gateway: Backend or Frontend service is temporarily unreachable or starting up.',
        targetPort,
        path: req.url 
      }));
    }
  });

  req.pipe(proxy);
};

// Serve static file from CRA build directory for /admin
const serveAdminStatic = (req, res) => {
  const parsed = url.parse(req.url);
  let pathname = parsed.pathname;

  // Strip leading /admin
  let relativePath = pathname.replace(/^\/admin/, '');
  if (!relativePath || relativePath === '/') {
    relativePath = '/index.html';
  }

  const filePath = path.join(CRA_BUILD_DIR, relativePath);

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } else {
      const ext = path.extname(relativePath);
      if (ext && ext !== '.html') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end(`Static asset not found: ${pathname}`);
      }

      // SPA Fallback for /admin routes
      const indexPath = path.join(CRA_BUILD_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Transport Admin build not found. Please run "npm run build" in G3-Transport/frontend.');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        }
      });
    }
  });
};

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname;

  // 1. Transport Backend APIs (Trips, Invoices, OCR upload, Transport Admin Login)
  if (
    pathname.startsWith('/api/trips') || 
    pathname.startsWith('/api/transport') || 
    pathname === '/api/login'
  ) {
    return proxyRequest(req, res, TRANSPORT_BACKEND_PORT);
  }

  // 2. Booking Backend APIs (Customer bookings, availability, pricing, Admin OTP 2FA & dispatch)
  if (pathname.startsWith('/api/')) {
    return proxyRequest(req, res, BOOKING_BACKEND_PORT);
  }

  // 3. Admin Frontend (/admin, /admin/trips, /admin/ocr, /admin/invoices, /admin/dashboard, etc.)
  if (pathname.startsWith('/admin')) {
    const hasExtension = path.extname(pathname.replace(/^\/admin/, '')).length > 0;
    if (!hasExtension && (!req.headers.accept || !req.headers.accept.includes('text/html'))) {
      req.headers.accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
    }

    if (isCraDevRunning) {
      return proxyRequest(req, res, CRA_PORT, req.url, () => {
        serveAdminStatic(req, res);
      });
    } else {
      return serveAdminStatic(req, res);
    }
  }

  // 4. Default: Public G3 Booking Site Frontend (Vite)
  // Covers /, /book, /track, /about, /login, /@vite, /@fs, /src, /assets, etc.
  return proxyRequest(req, res, VITE_PORT);
});

// Proxy WebSocket upgrades for Vite & CRA Hot Module Reloading
server.on('upgrade', (req, socket, head) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname;

  let targetPort = VITE_PORT;
  if (pathname.startsWith('/admin') || pathname.startsWith('/ws')) {
    targetPort = isCraDevRunning ? CRA_PORT : VITE_PORT;
  }

  const proxySocket = net.connect(targetPort, 'localhost', () => {
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n` +
      `Upgrade: ${req.headers.upgrade}\r\n` +
      `Connection: Upgrade\r\n\r\n`);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxySocket.on('error', (err) => {
    console.error(`[Gateway WS Error] targetPort=${targetPort} err=${err.message}`);
    socket.destroy();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================================`);
  console.log(`     G3 TRANSPORT UNIFIED GATEWAY (SINGLE LOCALHOST ORIGIN)     `);
  console.log(`================================================================`);
  console.log(`  Single Entry Point:  http://localhost:${PORT}`);
  console.log(`  Default Public Site: http://localhost:${PORT}/ (G3 Booking Site)`);
  console.log(`  Admin Access Portal: http://localhost:${PORT}/admin (G3 Transport Admin)`);
  console.log(`  Backend APIs Proxied Internally:`);
  console.log(`    - Booking Backend:   http://127.0.0.1:${BOOKING_BACKEND_PORT}`);
  console.log(`    - Transport Backend: http://127.0.0.1:${TRANSPORT_BACKEND_PORT}`);
  console.log(`================================================================`);
});
