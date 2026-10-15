const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.resolve(__dirname, 'g3transport.db'));

db.all("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, rows) => {
  if (err) { console.error(err); db.close(); return; }
  rows.forEach(r => {
    console.log('=== ' + r.name + ' ===');
    console.log(r.sql);
    console.log('');
  });
  db.close();
});
