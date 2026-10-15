const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const db = require('../database/db');
const { requireAdminAuth } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// Protect all trip routes with admin authentication
router.use(requireAdminAuth);

// 1. Get All Trips
router.get('/', (req, res) => {
  db.all('SELECT * FROM trips ORDER BY date DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const trips = (rows || []).map(trip => ({
      ...trip,
      incomeItems: JSON.parse(trip.incomeItems || '[]'),
      expenseItems: JSON.parse(trip.expenseItems || '[]')
    }));

    res.json(trips);
  });
});

// 2. Create Trip (with duplicate prevention and validation)
router.post('/', (req, res) => {
  const { 
    id, date, vehicle_no, driverName, from_city, to_city, 
    revenue, incomeItems = [], expenseItems = [], notes, 
    total_km = 0, fuel_litres = 0, mileage = 0 
  } = req.body;

  if (!vehicle_no) {
    return res.status(400).json({ error: 'Vehicle number is required' });
  }

  const parsedRevenue = Number(revenue) || 0;
  const parsedExpenseItems = Array.isArray(expenseItems) ? expenseItems : [];
  const parsedIncomeItems = Array.isArray(incomeItems) ? incomeItems : [];
  const total_expense = parsedExpenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const profit = parsedRevenue - total_expense;

  const tripId = id || `TRIP-${Date.now().toString().slice(-6)}`;
  const tripDate = date || new Date().toISOString().split('T')[0];

  // Check if trip already exists (duplicate prevention)
  db.get('SELECT id FROM trips WHERE id = ?', [tripId], (checkErr, existingTrip) => {
    if (checkErr) {
      return res.status(500).json({ error: checkErr.message });
    }

    if (existingTrip) {
      // Update existing record rather than failing on duplicate retry
      const updateSql = `
        UPDATE trips SET
          date = ?, vehicle_no = ?, driverName = ?, from_city = ?, to_city = ?,
          revenue = ?, total_expense = ?, profit = ?, incomeItems = ?, expenseItems = ?,
          notes = ?, total_km = ?, fuel_litres = ?, mileage = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const updateParams = [
        tripDate, vehicle_no, driverName || '', from_city || 'Salem', to_city || 'Chennai',
        parsedRevenue, total_expense, profit, JSON.stringify(parsedIncomeItems),
        JSON.stringify(parsedExpenseItems), notes || '', total_km, fuel_litres, mileage,
        tripId
      ];

      db.run(updateSql, updateParams, function(updateErr) {
        if (updateErr) {
          return res.status(400).json({ error: updateErr.message });
        }
        return res.status(200).json({ message: 'Trip updated successfully', id: tripId, updated: true });
      });
      return;
    }

    const insertSql = `
      INSERT INTO trips (
        id, date, vehicle_no, driverName, from_city, to_city, 
        revenue, total_expense, profit, incomeItems, expenseItems, 
        notes, total_km, fuel_litres, mileage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertParams = [
      tripId, tripDate, vehicle_no, driverName || '', from_city || 'Salem', to_city || 'Chennai', 
      parsedRevenue, total_expense, profit, JSON.stringify(parsedIncomeItems), 
      JSON.stringify(parsedExpenseItems), notes || '', total_km, fuel_litres, mileage
    ];

    db.run(insertSql, insertParams, function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.status(201).json({ message: 'Trip created successfully', id: tripId });
    });
  });
});

// 3. Delete Trip
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM trips WHERE id = ?', req.params.id, function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json({ message: 'Trip deleted', changes: this.changes });
  });
});

// 4. Upload Excel Spreadsheet
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const labelMap = {};
    rows.forEach((r, i) => { if (r[0]) labelMap[r[0].toString().trim()] = i; });

    let tripsToInsert = [];
    for (let col = 1; col < rows[0].length; col++) {
      const tripNo = rows[0][col];
      if (tripNo === 'Total' || !tripNo) continue;

      const dateVal = rows[labelMap['Date']]?.[col];
      let dateStr = new Date().toISOString().split('T')[0];
      if (typeof dateVal === 'number') {
        const date = new Date((dateVal - (25567 + 2)) * 86400 * 1000);
        if (!isNaN(date)) dateStr = date.toISOString().split('T')[0];
      }

      const vehicleNo = rows[labelMap['Vehicle No']]?.[col] || '';
      const driverName = rows[labelMap['Driver Name']]?.[col] || '';
      const revenue = parseFloat(rows[labelMap['Total Income']]?.[col]) || 0;

      const incomeItems = [
        { description: 'Salem to Chennai', amount: parseFloat(rows[labelMap['Salem to Chennai']]?.[col]) || 0 },
        { description: 'Chennai to Salem', amount: parseFloat(rows[labelMap['Chennai to Salem']]?.[col]) || 0 }
      ].filter(i => i.amount > 0);

      const expenseItems = [
        { description: 'Pooja', amount: parseFloat(rows[labelMap['Pooja']]?.[col]) || 0 },
        { description: 'Salem Commision', amount: parseFloat(rows[labelMap['Salem Commision']]?.[col]) || 0 },
        { description: 'Chennai Commision', amount: parseFloat(rows[labelMap['Chennai Commision']]?.[col]) || 0 },
        { description: 'Salem Unloading', amount: parseFloat(rows[labelMap['salem Unloading Fees']]?.[col]) || 0 },
        { description: 'Chennai Unloading', amount: parseFloat(rows[labelMap['chennai Unloading Fees']]?.[col]) || 0 },
        { description: 'Parking', amount: parseFloat(rows[labelMap['Parking']]?.[col]) || 0 },
        { description: 'Tarpaulin Labour', amount: parseFloat(rows[labelMap['Tarpaulin Labour']]?.[col]) || 0 },
        { description: 'Way PC', amount: parseFloat(rows[labelMap['Way PC']]?.[col]) || 0 },
        { description: 'Corporation', amount: parseFloat(rows[labelMap['Corporation']]?.[col]) || 0 },
        { description: 'Driver Batta', amount: parseFloat(rows[labelMap['Driver Batta']]?.[col]) || 0 },
        { description: 'ADBlue Oil', amount: parseFloat(rows[labelMap['ADBlue Oil']]?.[col]) || 0 },
        { description: 'Others', amount: parseFloat(rows[labelMap['Others']]?.[col]) || 0 },
        { description: 'Diesel', amount: parseFloat(rows[labelMap['Diesel']]?.[col]) || 0 },
        { description: 'Toll Bill', amount: parseFloat(rows[labelMap['Toll Bill']]?.[col]) || 0 }
      ].filter(i => i.amount > 0);

      const total_expense = expenseItems.reduce((sum, item) => sum + item.amount, 0);
      const profit = revenue - total_expense;
      const total_km = parseFloat(rows[labelMap['Total Km Drive']]?.[col]) || 0;
      const fuel_litres = parseFloat(rows[labelMap['Fuel Litres']]?.[col]) || 0;
      const mileage = parseFloat(rows[labelMap['Mileage']]?.[col]) || 0;

      const tripId = `MAY26-${tripNo.toString().padStart(3, '0')}-${Date.now().toString().slice(-4)}`;

      tripsToInsert.push([
        tripId, dateStr, vehicleNo, driverName, 'Salem', 'Chennai', 
        revenue, total_expense, profit, 
        JSON.stringify(incomeItems), JSON.stringify(expenseItems), 
        'Imported from Excel', total_km, fuel_litres, mileage
      ]);
    }

    db.serialize(() => {
      const stmt = db.prepare(`
        INSERT INTO trips (
          id, date, vehicle_no, driverName, from_city, to_city, 
          revenue, total_expense, profit, incomeItems, expenseItems, 
          notes, total_km, fuel_litres, mileage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let insertedCount = 0;
      tripsToInsert.forEach(t => {
        stmt.run(t, (err) => {
          if (err) console.error('Error inserting trip:', err.message);
          else insertedCount++;
        });
      });

      stmt.finalize(() => {
        res.json({ message: 'Excel imported successfully', count: insertedCount });
      });
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to process Excel file' });
  }
});

module.exports = router;
