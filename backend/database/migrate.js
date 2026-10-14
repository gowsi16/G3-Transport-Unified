const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname);
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const targetDbPath = path.resolve(targetDir, 'g3transport.db');
const sourceBookingDb = path.resolve(__dirname, '../../G3_Booking_Site/backend/g3transport.db');
const sourceTransportDb = path.resolve(__dirname, '../../G3-Transport/backend/database.sqlite');

console.log('--- G3 Database Consolidation & Migration ---');
console.log(`Target database: ${targetDbPath}`);

// If target doesn't exist, copy from source booking db
if (!fs.existsSync(targetDbPath) && fs.existsSync(sourceBookingDb)) {
  console.log(`Copying base schema and booking data from ${sourceBookingDb}...`);
  fs.copyFileSync(sourceBookingDb, targetDbPath);
  console.log('Base copy successful.');
}

const db = new sqlite3.Database(targetDbPath, (err) => {
  if (err) {
    console.error('Failed to open target database:', err.message);
    process.exit(1);
  }
  console.log('Connected to target unified database.');
});

db.serialize(() => {
  // 1. Ensure users table exists (for Transport Admin credentials)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      name TEXT,
      role TEXT
    )
  `);

  // 2. Ensure trips table exists (for Transport trips & P&L)
  db.run(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      date TEXT,
      vehicle_no TEXT,
      driverName TEXT,
      from_city TEXT,
      to_city TEXT,
      revenue REAL,
      total_expense REAL,
      profit REAL,
      incomeItems TEXT,
      expenseItems TEXT,
      notes TEXT,
      total_km REAL,
      fuel_litres REAL,
      mileage REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Ensure notifications table exists
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. Migrate users from database.sqlite if available
  if (fs.existsSync(sourceTransportDb)) {
    console.log(`Migrating transport data from ${sourceTransportDb}...`);
    const transportDb = new sqlite3.Database(sourceTransportDb);

    transportDb.all("SELECT * FROM users", [], (uErr, users) => {
      if (!uErr && users && users.length > 0) {
        const uStmt = db.prepare("INSERT OR IGNORE INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)");
        users.forEach(u => uStmt.run(u.id, u.username, u.password, u.name, u.role));
        uStmt.finalize(() => {
          console.log(`Preserved ${users.length} user records (including admin.g3).`);
        });
      }

      // Migrate trips
      transportDb.all("SELECT * FROM trips", [], (tErr, trips) => {
        if (!tErr && trips && trips.length > 0) {
          const tStmt = db.prepare(`
            INSERT OR IGNORE INTO trips (
              id, date, vehicle_no, driverName, from_city, to_city, revenue,
              total_expense, profit, incomeItems, expenseItems, notes, total_km, fuel_litres, mileage
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          trips.forEach(t => {
            tStmt.run(
              t.id, t.date, t.vehicle_no, t.driverName, t.from_city, t.to_city, t.revenue,
              t.total_expense, t.profit, t.incomeItems, t.expenseItems, t.notes, t.total_km, t.fuel_litres, t.mileage
            );
          });
          tStmt.finalize(() => {
            console.log(`Preserved ${trips.length} trip records.`);
            transportDb.close();
          });
        } else {
          transportDb.close();
        }
      });
    });
  }

  // Verify default admin user exists
  const bcrypt = require('bcryptjs');
  db.get("SELECT * FROM users WHERE username = 'admin.g3'", (err, row) => {
    if (!row) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync('gggbrothers', salt);
      db.run("INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)", [
        'admin.g3', hash, 'G3 Transport Admin', 'admin'
      ], (insErr) => {
        if (!insErr) console.log('Default admin.g3 user verified.');
      });
    } else {
      console.log('Verified admin.g3 exists.');
    }
  });

  // Verify counts
  setTimeout(() => {
    db.get("SELECT COUNT(*) as c FROM bookings", (e, r) => console.log(`Active bookings: ${r ? r.c : 0}`));
    db.get("SELECT COUNT(*) as c FROM trips", (e, r) => console.log(`Active trips: ${r ? r.c : 0}`));
    db.get("SELECT COUNT(*) as c FROM vehicles", (e, r) => console.log(`Registered vehicles: ${r ? r.c : 0}`));
    db.get("SELECT COUNT(*) as c FROM drivers", (e, r) => console.log(`Registered drivers: ${r ? r.c : 0}`));
    db.get("SELECT COUNT(*) as c FROM notifications", (e, r) => console.log(`Admin notifications: ${r ? r.c : 0}`));
    console.log('Consolidation & Migration Complete.');
  }, 1000);
});
