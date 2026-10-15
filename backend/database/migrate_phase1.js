/**
 * G3 Transport - Phase 1 Migration
 * Adds: contact_messages table, enhances drivers table, adds fleet mgmt columns
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.resolve(__dirname, 'g3transport.db'), (err) => {
  if (err) { console.error('DB open failed:', err.message); process.exit(1); }
  console.log('Connected to g3transport.db for Phase 1 migration');
});

db.serialize(() => {
  // 1. Contact Messages /  Inbox table
  db.run(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      subject TEXT NOT NULL,
      order_id TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'New',
      internal_notes TEXT DEFAULT '',
      assigned_to TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('contact_messages:', err.message);
    else console.log('✓ contact_messages table ready');
  });

  // 2. Enhance drivers table with full registration fields
  const driverColumns = [
    ["mobile", "TEXT DEFAULT ''"],
    ["email", "TEXT DEFAULT ''"],
    ["address", "TEXT DEFAULT ''"],
    ["licence_no", "TEXT DEFAULT ''"],
    ["licence_expiry", "TEXT DEFAULT ''"],
    ["joining_date", "TEXT DEFAULT ''"],
    ["emergency_contact", "TEXT DEFAULT ''"],
    ["notes", "TEXT DEFAULT ''"],
    ["assigned_vehicle", "TEXT DEFAULT ''"],
    ["updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"]
  ];

  driverColumns.forEach(([col, def]) => {
    db.run(`ALTER TABLE drivers ADD COLUMN ${col} ${def}`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error(`drivers.${col}:`, err.message);
      } else if (!err) {
        console.log(`✓ drivers.${col} added`);
      }
    });
  });

  // 3. Enhance vehicles table with full fleet fields
  const vehicleColumns = [
    ["registration_no", "TEXT DEFAULT ''"],
    ["make", "TEXT DEFAULT ''"],
    ["model", "TEXT DEFAULT ''"],
    ["year", "TEXT DEFAULT ''"],
    ["fuel_type", "TEXT DEFAULT 'Diesel'"],
    ["last_service_date", "TEXT DEFAULT ''"],
    ["next_service_date", "TEXT DEFAULT ''"],
    ["insurance_expiry", "TEXT DEFAULT ''"],
    ["fc_expiry", "TEXT DEFAULT ''"],
    ["notes", "TEXT DEFAULT ''"],
    ["odometer_km", "REAL DEFAULT 0"],
    ["updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"]
  ];

  vehicleColumns.forEach(([col, def]) => {
    db.run(`ALTER TABLE vehicles ADD COLUMN ${col} ${def}`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error(`vehicles.${col}:`, err.message);
      } else if (!err) {
        console.log(`✓ vehicles.${col} added`);
      }
    });
  });

  // 4. Enhance trips table with additional fields
  const tripColumns = [
    ["status", "TEXT DEFAULT 'Completed'"],
    ["order_id", "TEXT DEFAULT ''"],
    ["customer_name", "TEXT DEFAULT ''"],
    ["load_weight_kg", "REAL DEFAULT 0"],
    ["distance_km", "REAL DEFAULT 0"],
    ["fuel_cost", "REAL DEFAULT 0"],
    ["toll_cost", "REAL DEFAULT 0"],
    ["driver_wage", "REAL DEFAULT 0"],
    ["commission", "REAL DEFAULT 0"],
    ["other_expenses", "REAL DEFAULT 0"],
    ["helper_count", "INTEGER DEFAULT 0"],
    ["helper_charges", "REAL DEFAULT 0"],
    ["start_datetime", "TEXT DEFAULT ''"],
    ["end_datetime", "TEXT DEFAULT ''"],
    ["updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"]
  ];

  tripColumns.forEach(([col, def]) => {
    db.run(`ALTER TABLE trips ADD COLUMN ${col} ${def}`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error(`trips.${col}:`, err.message);
      } else if (!err) {
        console.log(`✓ trips.${col} added`);
      }
    });
  });

  // 5. Pricing history table
  db.run(`
    CREATE TABLE IF NOT EXISTS pricing_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_snapshot TEXT NOT NULL,
      effective_from DATETIME DEFAULT CURRENT_TIMESTAMP,
      changed_by TEXT DEFAULT 'Admin',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('pricing_history:', err.message);
    else console.log('✓ pricing_history table ready');
  });

  setTimeout(() => {
    console.log('\nPhase 1 Migration Complete.');
    db.close();
  }, 1500);
});
