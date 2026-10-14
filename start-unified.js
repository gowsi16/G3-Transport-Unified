const { spawn } = require('child_process');
const path = require('path');

console.log('================================================================');
console.log('       G3 TRANSPORT UNIFIED APPLICATION (SINGLE LOCALHOST)      ');
console.log('================================================================');
console.log('Single Entry Point: http://localhost:3000\n');
console.log('  • Public Landing:     http://localhost:3000/ (G3 Booking Site)');
console.log('  • Admin Access:       http://localhost:3000/admin (G3 Transport Admin)');
console.log('  • Internal Services:  Vite (5173), CRA (3002), Booking API (5000), Transport API (5001)\n');
console.log('The customer-facing G3 Booking Site opens first at http://localhost:3000.');
console.log('Press Ctrl+C at any time to gracefully terminate all services.');
console.log('================================================================\n');

const services = [
  {
    name: 'BOOKING-BACKEND (5000)  ',
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['start'],
    cwd: path.resolve(__dirname, 'G3_Booking_Site', 'backend'),
    color: '\x1b[33m' // Yellow
  },
  {
    name: 'TRANSPORT-BACKEND (5001)',
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['start'],
    cwd: path.resolve(__dirname, 'G3-Transport', 'backend'),
    color: '\x1b[36m' // Cyan
  },
  {
    name: 'BOOKING-SITE (5173)     ',
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
    cwd: path.resolve(__dirname, 'G3_Booking_Site', 'frontend'),
    color: '\x1b[32m' // Green
  },
  {
    name: 'ADMIN-DEV-SERVER (3002) ',
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['start'],
    cwd: path.resolve(__dirname, 'G3-Transport', 'frontend'),
    env: { ...process.env, PORT: '3002', BROWSER: 'none' },
    color: '\x1b[35m' // Magenta
  },
  {
    name: 'UNIFIED-GATEWAY (3000)  ',
    cmd: 'node',
    args: ['gateway.js'],
    cwd: __dirname,
    color: '\x1b[34m' // Blue
  }
];

const processes = [];

services.forEach(service => {
  const proc = spawn(service.cmd, service.args, {
    cwd: service.cwd,
    env: service.env || process.env,
    shell: true
  });

  proc.stdout.on('data', data => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(l => {
      if (l.trim()) {
        console.log(`${service.color}[${service.name}]\x1b[0m ${l}`);
      }
    });
  });

  proc.stderr.on('data', data => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(l => {
      if (l.trim()) {
        console.error(`${service.color}[${service.name} ERR]\x1b[0m ${l}`);
      }
    });
  });

  proc.on('close', code => {
    console.log(`${service.color}[${service.name}]\x1b[0m Exited with code ${code}`);
  });

  processes.push(proc);
});

// Automatically open the single entry point: http://localhost:3000
const openBrowser = (url) => {
  const cmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(cmd, [url], { shell: true, detached: true });
};

setTimeout(() => {
  console.log('\n\x1b[32m[LAUNCHER]\x1b[0m Opening G3 Booking Site at single localhost origin (http://localhost:3000)...\n');
  openBrowser('http://localhost:3000');
}, 3500);

const cleanup = () => {
  console.log('\nStopping all G3 Transport services...');
  processes.forEach(p => {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', p.pid, '/f', '/t']);
      } else {
        p.kill('SIGTERM');
      }
    } catch (e) {}
  });
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
