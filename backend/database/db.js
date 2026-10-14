const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const fs = require('fs');

const defaultDbPath = path.resolve(__dirname, 'g3transport.db');
const dbPath = (process.env.DATABASE_PATH && fs.existsSync(process.env.DATABASE_PATH))
  ? path.resolve(process.env.DATABASE_PATH)
  : defaultDbPath;

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to unified SQLite database:', err.message);
  } else {
    console.log(`Connected to unified SQLite database at ${dbPath}`);
  }
});

module.exports = db;
