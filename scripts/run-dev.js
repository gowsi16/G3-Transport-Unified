const { spawn } = require('child_process');
const path = require('path');

console.log('================================================================');
console.log('       G3 TRANSPORT UNIFIED APPLICATION LAUNCHER               ');
console.log('================================================================');
console.log('Single Entry Point: http://localhost:3000\n');
console.log('  • Public Landing:     http://localhost:3000/ (G3 Booking Site)');
console.log('  • Admin Portal:       http://localhost:3000/admin (G3 Transport Admin)');
console.log('  • Unified API:        http://localhost:5000/api (Unified Express Backend)\n');
console.log('Press Ctrl+C at any time to gracefully terminate both services.');
console.log('================================================================\n');

const services = [
  {
    name: 'UNIFIED-BACKEND (5000)',
    cmd: 'node',
    args: ['server.js'],
    cwd: path.resolve(__dirname, '..', 'backend'),
    color: '\x1b[36m' // Cyan
  },
  {
    name: 'UNIFIED-FRONTEND (3000)',
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
    cwd: path.resolve(__dirname, '..', 'frontend'),
    color: '\x1b[32m' // Green
  }
];

const processes = [];

services.forEach(service => {
  const proc = spawn(service.cmd, service.args, {
    cwd: service.cwd,
    env: process.env,
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

// Automatically open browser at http://localhost:3000
const openBrowser = (url) => {
  const cmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(cmd, [url], { shell: true, detached: true });
};

setTimeout(() => {
  console.log('\n\x1b[32m[LAUNCHER]\x1b[0m Opening G3 Transport Unified Application (http://localhost:3000)...\n');
  openBrowser('http://localhost:3000');
}, 3000);

const cleanup = () => {
  console.log('\nStopping all G3 Transport unified services...');
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
