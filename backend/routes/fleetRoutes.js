const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAdminAuth } = require('../middleware/authMiddleware');

router.use(requireAdminAuth);

// ─── GET All Vehicles ─────────────────────────────────────────────────────────
router.get('/admin/fleet', (req, res) => {
  const { status, search } = req.query;
  let query = `SELECT * FROM vehicles WHERE 1=1`;
  const params = [];

  if (status && status !== 'all') {
    query += ` AND status = ?`;
    params.push(status);
  }
  if (search) {
    const term = `%${search}%`;
    query += ` AND (vehicle_no LIKE ? OR vehicle_type LIKE ? OR driver LIKE ?)`;
    params.push(term, term, term);
  }
  query += ` ORDER BY vehicle_no ASC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// ─── GET Vehicle Details with Trip History ────────────────────────────────────
router.get('/admin/fleet/:id', (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM vehicles WHERE id = ?`, [id], (err, vehicle) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

    db.all(
      `SELECT * FROM trips WHERE vehicle_no = ? ORDER BY date DESC LIMIT 50`,
      [vehicle.vehicle_no],
      (tErr, trips) => {
        if (tErr) return res.status(500).json({ error: tErr.message });

        const tripList = trips || [];
        const totalTrips = tripList.length;
        const totalRevenue = tripList.reduce((s, t) => s + (t.revenue || 0), 0);
        const totalExpenses = tripList.reduce((s, t) => s + (t.total_expense || 0), 0);
        const totalKm = tripList.reduce((s, t) => s + (t.total_km || 0), 0);
        const totalFuelLitres = tripList.reduce((s, t) => s + (t.fuel_litres || 0), 0);
        const avgMileage = totalFuelLitres > 0 ? (totalKm / totalFuelLitres).toFixed(2) : null;

        // Service due check
        const today = new Date();
        const nextService = vehicle.next_service_date ? new Date(vehicle.next_service_date) : null;
        const daysToService = nextService ? Math.ceil((nextService - today) / (1000 * 60 * 60 * 24)) : null;

        // Insurance expiry check
        const insExpiry = vehicle.insurance_expiry ? new Date(vehicle.insurance_expiry) : null;
        const daysToInsurance = insExpiry ? Math.ceil((insExpiry - today) / (1000 * 60 * 60 * 24)) : null;

        res.json({
          vehicle,
          stats: {
            totalTrips, totalRevenue, totalExpenses,
            totalProfit: totalRevenue - totalExpenses,
            totalKm, totalFuelLitres, avgMileage,
            daysToService,
            daysToInsurance,
            serviceDue: daysToService !== null && daysToService <= 30,
            insuranceAlert: daysToInsurance !== null && daysToInsurance <= 30
          },
          recentTrips: tripList.slice(0, 10)
        });
      }
    );
  });
});

// ─── POST Create Vehicle ──────────────────────────────────────────────────────
router.post('/admin/fleet', (req, res) => {
  const {
    vehicle_no, vehicle_type, capacity_kg, status = 'Available', driver,
    make, model, year, fuel_type, registration_no,
    last_service_date, next_service_date, insurance_expiry, fc_expiry, notes
  } = req.body || {};

  if (!vehicle_no || !vehicle_no.trim()) return res.status(400).json({ error: 'Vehicle number is required.' });
  if (!vehicle_type || !vehicle_type.trim()) return res.status(400).json({ error: 'Vehicle type is required.' });
  if (!capacity_kg || isNaN(Number(capacity_kg))) return res.status(400).json({ error: 'Valid capacity (kg) is required.' });

  db.get(`SELECT id FROM vehicles WHERE vehicle_no = ?`, [vehicle_no.trim()], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (existing) return res.status(409).json({ error: `Vehicle ${vehicle_no.trim()} is already registered.` });

    db.run(
      `INSERT INTO vehicles (vehicle_no, vehicle_type, capacity_kg, status, driver,
         make, model, year, fuel_type, registration_no,
         last_service_date, next_service_date, insurance_expiry, fc_expiry, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicle_no.trim(), vehicle_type.trim(), Number(capacity_kg), status, driver || '',
        make || '', model || '', year || '', fuel_type || 'Diesel', registration_no || '',
        last_service_date || '', next_service_date || '', insurance_expiry || '', fc_expiry || '', notes || ''
      ],
      function (insErr) {
        if (insErr) return res.status(500).json({ error: insErr.message });
        res.status(201).json({
          success: true,
          id: this.lastID,
          message: `Vehicle ${vehicle_no.trim()} registered successfully.`
        });
      }
    );
  });
});

// ─── PUT Update Vehicle ───────────────────────────────────────────────────────
router.put('/admin/fleet/:id', (req, res) => {
  const { id } = req.params;
  const {
    vehicle_type, capacity_kg, status, driver,
    make, model, year, fuel_type, registration_no,
    last_service_date, next_service_date, insurance_expiry, fc_expiry, notes, odometer_km
  } = req.body || {};

  db.get(`SELECT * FROM vehicles WHERE id = ?`, [id], (err, v) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!v) return res.status(404).json({ error: 'Vehicle not found.' });

    db.run(
      `UPDATE vehicles SET
         vehicle_type = COALESCE(?, vehicle_type),
         capacity_kg = COALESCE(?, capacity_kg),
         status = COALESCE(?, status),
         driver = COALESCE(?, driver),
         make = COALESCE(?, make),
         model = COALESCE(?, model),
         year = COALESCE(?, year),
         fuel_type = COALESCE(?, fuel_type),
         registration_no = COALESCE(?, registration_no),
         last_service_date = COALESCE(?, last_service_date),
         next_service_date = COALESCE(?, next_service_date),
         insurance_expiry = COALESCE(?, insurance_expiry),
         fc_expiry = COALESCE(?, fc_expiry),
         notes = COALESCE(?, notes),
         odometer_km = COALESCE(?, odometer_km)
       WHERE id = ?`,
      [
        vehicle_type, capacity_kg ? Number(capacity_kg) : null, status, driver,
        make, model, year, fuel_type, registration_no,
        last_service_date, next_service_date, insurance_expiry, fc_expiry, notes,
        odometer_km ? Number(odometer_km) : null,
        id
      ],
      function (uErr) {
        if (uErr) return res.status(500).json({ error: uErr.message });
        res.json({ success: true, message: `Vehicle updated successfully.` });
      }
    );
  });
});

// ─── GET Vehicle Availability Check ──────────────────────────────────────────
router.get('/admin/fleet/:id/availability', (req, res) => {
  const { id } = req.params;
  const { date } = req.query;

  db.get(`SELECT * FROM vehicles WHERE id = ?`, [id], (err, vehicle) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

    if (!date) {
      return res.json({ vehicle, available: vehicle.status === 'Available', conflicts: [] });
    }

    db.all(
      `SELECT booking_id, expected_date, pickup, delivery, booking_status
       FROM bookings
       WHERE assigned_vehicle = ? AND expected_date = ?
         AND booking_status IN ('Confirmed', 'Accepted', 'Assigned', 'In Transit')`,
      [vehicle.vehicle_no, date],
      (bErr, conflicts) => {
        if (bErr) return res.status(500).json({ error: bErr.message });
        res.json({
          vehicle,
          available: vehicle.status === 'Available' && (!conflicts || conflicts.length === 0),
          conflicts: conflicts || []
        });
      }
    );
  });
});

// ─── GET Fleet Maintenance Alerts ─────────────────────────────────────────────
router.get('/admin/fleet/alerts', (req, res) => {
  db.all(`SELECT * FROM vehicles WHERE status != 'Retired'`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const today = new Date();

    const alerts = [];
    (rows || []).forEach(v => {
      const checks = [
        { field: 'next_service_date', label: 'Service Due', date: v.next_service_date },
        { field: 'insurance_expiry', label: 'Insurance Expiry', date: v.insurance_expiry },
        { field: 'fc_expiry', label: 'FC Expiry', date: v.fc_expiry }
      ];
      checks.forEach(c => {
        if (!c.date) return;
        const expiry = new Date(c.date);
        const days = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        if (days <= 30) {
          alerts.push({
            vehicle_no: v.vehicle_no, vehicle_type: v.vehicle_type,
            alert: c.label, date: c.date, daysLeft: days,
            level: days < 0 ? 'expired' : days <= 7 ? 'critical' : 'warning'
          });
        }
      });
    });

    res.json(alerts.sort((a, b) => a.daysLeft - b.daysLeft));
  });
});

module.exports = router;
