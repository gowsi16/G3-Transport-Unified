const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAdminAuth } = require('../middleware/authMiddleware');

// All driver management routes require admin auth
router.use(requireAdminAuth);

// ─── GET All Drivers (with trip stats) ───────────────────────────────────────
router.get('/admin/drivers/all', (req, res) => {
  const { status, search } = req.query;
  let query = `SELECT * FROM drivers WHERE 1=1`;
  const params = [];

  if (status && status !== 'all') {
    query += ` AND status = ?`;
    params.push(status);
  }
  if (search) {
    const term = `%${search}%`;
    query += ` AND (name LIKE ? OR mobile LIKE ? OR licence_no LIKE ?)`;
    params.push(term, term, term);
  }
  query += ` ORDER BY name ASC`;

  db.all(query, params, (err, drivers) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(drivers || []);
  });
});

// ─── GET Driver Performance Stats ────────────────────────────────────────────
router.get('/admin/drivers/:id/stats', (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM drivers WHERE id = ?`, [id], (err, driver) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!driver) return res.status(404).json({ error: 'Driver not found.' });

    // Trip stats from trips table (by driver name)
    db.all(
      `SELECT * FROM trips WHERE driverName = ? ORDER BY date DESC`,
      [driver.name],
      (tErr, trips) => {
        if (tErr) return res.status(500).json({ error: tErr.message });

        const tripList = trips || [];
        const totalTrips = tripList.length;
        const completedTrips = tripList.filter(t => t.status === 'Completed' || !t.status || t.status === '').length;
        const totalRevenue = tripList.reduce((s, t) => s + (t.revenue || 0), 0);
        const totalExpenses = tripList.reduce((s, t) => s + (t.total_expense || 0), 0);
        const totalProfit = totalRevenue - totalExpenses;
        const avgProfit = totalTrips > 0 ? totalProfit / totalTrips : 0;
        const totalKm = tripList.reduce((s, t) => s + (t.total_km || 0), 0);

        // Monthly performance (last 6 months)
        const monthlyMap = {};
        tripList.forEach(t => {
          if (!t.date) return;
          const month = t.date.substring(0, 7); // YYYY-MM
          if (!monthlyMap[month]) monthlyMap[month] = { trips: 0, revenue: 0, expenses: 0, profit: 0 };
          monthlyMap[month].trips++;
          monthlyMap[month].revenue += t.revenue || 0;
          monthlyMap[month].expenses += t.total_expense || 0;
          monthlyMap[month].profit += (t.revenue || 0) - (t.total_expense || 0);
        });

        const monthlyTrend = Object.entries(monthlyMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([month, data]) => ({ month, ...data }));

        res.json({
          driver,
          stats: {
            totalTrips,
            completedTrips,
            totalRevenue,
            totalExpenses,
            totalProfit,
            avgProfit,
            totalKm,
            completionRate: totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0
          },
          monthlyTrend,
          recentTrips: tripList.slice(0, 10)
        });
      }
    );
  });
});

// ─── POST Create Driver ───────────────────────────────────────────────────────
router.post('/admin/drivers/create', (req, res) => {
  const {
    name, mobile, email, address, licence_no,
    licence_expiry, joining_date, status = 'Active',
    emergency_contact, notes
  } = req.body || {};

  if (!name || !name.trim()) return res.status(400).json({ error: 'Driver full name is required.' });
  if (!mobile || !mobile.trim()) return res.status(400).json({ error: 'Mobile number is required.' });
  if (!licence_no || !licence_no.trim()) return res.status(400).json({ error: 'Driving licence number is required.' });

  // Duplicate phone check
  db.get(`SELECT id FROM drivers WHERE mobile = ?`, [mobile.trim()], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (existing) return res.status(409).json({ error: `A driver with mobile ${mobile.trim()} already exists.` });

    // Duplicate licence check
    db.get(`SELECT id FROM drivers WHERE licence_no = ?`, [licence_no.trim()], (lErr, existingLic) => {
      if (lErr) return res.status(500).json({ error: lErr.message });
      if (existingLic) return res.status(409).json({ error: `Licence number ${licence_no.trim()} is already registered.` });

      db.run(
        `INSERT INTO drivers (name, mobile, email, address, licence_no, licence_expiry, joining_date, status, emergency_contact, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name.trim(), mobile.trim(), email || '', address || '',
          licence_no.trim(), licence_expiry || '', joining_date || '',
          status, emergency_contact || '', notes || ''
        ],
        function (insErr) {
          if (insErr) {
            if (insErr.message.includes('UNIQUE constraint')) {
              return res.status(409).json({ error: `Driver "${name.trim()}" already exists.` });
            }
            return res.status(500).json({ error: insErr.message });
          }
          res.status(201).json({
            success: true,
            id: this.lastID,
            message: `Driver ${name.trim()} registered successfully.`
          });
        }
      );
    });
  });
});

// ─── PUT Update Driver ────────────────────────────────────────────────────────
router.put('/admin/drivers/:id/update', (req, res) => {
  const { id } = req.params;
  const {
    name, mobile, email, address, licence_no,
    licence_expiry, joining_date, status,
    emergency_contact, notes, assigned_vehicle
  } = req.body || {};

  db.get(`SELECT * FROM drivers WHERE id = ?`, [id], (err, driver) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!driver) return res.status(404).json({ error: 'Driver not found.' });

    const updated = {
      name: name !== undefined ? name.trim() : driver.name,
      mobile: mobile !== undefined ? mobile.trim() : driver.mobile,
      email: email !== undefined ? email : driver.email,
      address: address !== undefined ? address : driver.address,
      licence_no: licence_no !== undefined ? licence_no.trim() : driver.licence_no,
      licence_expiry: licence_expiry !== undefined ? licence_expiry : driver.licence_expiry,
      joining_date: joining_date !== undefined ? joining_date : driver.joining_date,
      status: status !== undefined ? status : driver.status,
      emergency_contact: emergency_contact !== undefined ? emergency_contact : driver.emergency_contact,
      notes: notes !== undefined ? notes : driver.notes,
      assigned_vehicle: assigned_vehicle !== undefined ? assigned_vehicle : driver.assigned_vehicle
    };

    db.run(
      `UPDATE drivers SET name=?, mobile=?, email=?, address=?, licence_no=?, licence_expiry=?,
       joining_date=?, status=?, emergency_contact=?, notes=?, assigned_vehicle=? WHERE id=?`,
      [
        updated.name, updated.mobile, updated.email, updated.address,
        updated.licence_no, updated.licence_expiry, updated.joining_date,
        updated.status, updated.emergency_contact, updated.notes,
        updated.assigned_vehicle, id
      ],
      function (uErr) {
        if (uErr) return res.status(500).json({ error: uErr.message });
        res.json({ success: true, message: `Driver ${updated.name} updated successfully.` });
      }
    );
  });
});

// ─── PUT Toggle Driver Status ─────────────────────────────────────────────────
router.put('/admin/drivers/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const valid = ['Active', 'Inactive', 'On Leave', 'Terminated'];
  if (!valid.includes(status)) return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });

  db.run(`UPDATE drivers SET status = ? WHERE id = ?`, [status, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Driver not found.' });
    res.json({ success: true, message: `Driver status updated to ${status}.` });
  });
});

// ─── GET Licence Expiry Alerts ────────────────────────────────────────────────
router.get('/admin/drivers/licence-alerts', (req, res) => {
  db.all(
    `SELECT id, name, mobile, licence_no, licence_expiry, status
     FROM drivers
     WHERE licence_expiry != '' AND licence_expiry IS NOT NULL
       AND status = 'Active'
     ORDER BY licence_expiry ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const today = new Date();
      const alerts = (rows || []).map(d => {
        const expiry = new Date(d.licence_expiry);
        const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        return {
          ...d,
          daysLeft,
          alertLevel: daysLeft < 0 ? 'expired' : daysLeft <= 30 ? 'critical' : daysLeft <= 90 ? 'warning' : 'ok'
        };
      }).filter(d => d.alertLevel !== 'ok');
      res.json(alerts);
    }
  );
});

module.exports = router;
