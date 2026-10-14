const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAdminAuth } = require('../middleware/authMiddleware');
const { 
  FLEET_CONFIG, 
  getPricingConfig, 
  savePricingToDb 
} = require('../services/pricingConfig');

// 1. Admin Overview & Statistics
router.get('/admin/overview', requireAdminAuth, (req, res) => {
  const statsQuery = `
    SELECT 
      COUNT(*) as total_bookings,
      SUM(CASE WHEN booking_status = 'Pending Review & Assignment' OR booking_status LIKE '%Pending%' THEN 1 ELSE 0 END) as pending_bookings,
      SUM(CASE WHEN booking_status = 'Confirmed' OR booking_status = 'Accepted' THEN 1 ELSE 0 END) as confirmed_bookings,
      SUM(CASE WHEN booking_status = 'In Transit' THEN 1 ELSE 0 END) as active_trips,
      SUM(CASE WHEN booking_status = 'Completed' THEN 1 ELSE 0 END) as completed_bookings,
      SUM(CASE WHEN booking_status = 'Rejected' OR booking_status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
      SUM(CASE WHEN booking_status IN ('Confirmed', 'Accepted', 'In Transit', 'Completed') THEN COALESCE(approved_fare, estimated_price, 0) ELSE 0 END) as total_revenue
    FROM bookings
  `;

  db.get(statsQuery, [], (err, stats) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all("SELECT * FROM vehicles ORDER BY vehicle_no", [], (vErr, vehicles) => {
      if (vErr) return res.status(500).json({ error: vErr.message });

      db.all("SELECT * FROM drivers ORDER BY id ASC", [], (dErr, drivers) => {
        if (dErr) return res.status(500).json({ error: dErr.message });

        res.json({
          totalBookings: stats.total_bookings || 0,
          pendingBookings: stats.pending_bookings || 0,
          confirmedBookings: stats.confirmed_bookings || 0,
          activeTrips: stats.active_trips || 0,
          completedBookings: stats.completed_bookings || 0,
          cancelledBookings: stats.cancelled_bookings || 0,
          totalRevenue: stats.total_revenue || 0,
          companyLorriesCount: vehicles ? vehicles.length : 0,
          activeDriversCount: drivers ? drivers.length : 0,
          vehicles: vehicles || [],
          drivers: drivers || []
        });
      });
    });
  });
});

// 2. Admin Bookings List
router.get('/admin/bookings', requireAdminAuth, (req, res) => {
  const { status, search, date } = req.query;
  let query = "SELECT * FROM bookings WHERE 1=1";
  const params = [];

  if (status && status !== 'all') {
    if (status === 'pending') {
      query += " AND (booking_status LIKE '%Pending%')";
    } else {
      query += " AND LOWER(booking_status) = LOWER(?)";
      params.push(status);
    }
  }

  if (date) {
    query += " AND expected_date = ?";
    params.push(date);
  }

  if (search) {
    query += " AND (booking_id LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR pickup LIKE ? OR delivery LIKE ?)";
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }

  query += " ORDER BY id DESC";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// 3. Driver & Lorry Assignment Endpoint (With Payload & Overlap Conflict Checks)
router.put('/bookings/:booking_id/assign', requireAdminAuth, (req, res) => {
  const { booking_id } = req.params;
  const { vehicle_no, driver, approved_fare, trip_duration_days = 1 } = req.body;

  if (!vehicle_no || !driver) {
    return res.status(400).json({ error: 'Both Vehicle Lorry and Driver are required for assignment.' });
  }

  db.get("SELECT * FROM bookings WHERE booking_id = ?", [booking_id], (bErr, booking) => {
    if (bErr) return res.status(500).json({ error: bErr.message });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    db.get("SELECT * FROM vehicles WHERE vehicle_no = ?", [vehicle_no], (vErr, vehicle) => {
      if (vErr) return res.status(500).json({ error: vErr.message });
      if (!vehicle) return res.status(404).json({ error: `Vehicle ${vehicle_no} not found in company registry.` });

      // Capacity Validation: Reject if load exceeds lorry capacity
      const loadKg = Number(booking.weight_kg) || 0;
      if (loadKg > vehicle.capacity_kg) {
        return res.status(400).json({
          error: `Capacity constraint violated: Load weight (${loadKg} kg) exceeds ${vehicle.vehicle_no}'s safe payload limit of ${vehicle.capacity_kg} kg.`
        });
      }

      // Overlap Prevention: Check if vehicle OR driver is already assigned on this expected_date
      const overlapQuery = `
        SELECT booking_id, expected_date, pickup, delivery, assigned_driver, assigned_vehicle
        FROM bookings 
        WHERE (assigned_vehicle = ? OR assigned_driver = ?) 
          AND booking_id != ? 
          AND expected_date = ? 
          AND booking_status IN ('Confirmed', 'Accepted', 'Assigned', 'In Transit')
      `;

      db.all(overlapQuery, [vehicle_no, driver, booking_id, booking.expected_date], (oErr, overlaps) => {
        if (oErr) return res.status(500).json({ error: oErr.message });
        if (overlaps && overlaps.length > 0) {
          const conflict = overlaps[0];
          const isVehicleConflict = conflict.assigned_vehicle === vehicle_no;
          if (isVehicleConflict) {
            return res.status(409).json({
              error: `Vehicle schedule conflict: Lorry ${vehicle_no} is already assigned to active booking ${conflict.booking_id} (${conflict.pickup} → ${conflict.delivery}) on ${booking.expected_date}. Choose the other available vehicle or change the schedule.`
            });
          } else {
            return res.status(409).json({
              error: `Driver schedule conflict: Driver ${driver} is already assigned to active booking ${conflict.booking_id} (${conflict.pickup} → ${conflict.delivery}) on ${booking.expected_date}. Choose another available driver or change the schedule.`
            });
          }
        }

        const finalApprovedFare = approved_fare ? Number(approved_fare) : booking.estimated_price;
        const updateStmt = db.prepare(`
          UPDATE bookings 
          SET assigned_vehicle = ?, 
              assigned_driver = ?, 
              vehicle_type = ?, 
              booking_status = 'Confirmed', 
              approved_fare = ?,
              trip_duration_days = ?
          WHERE booking_id = ?
        `);

        updateStmt.run(
          vehicle_no,
          driver,
          vehicle.vehicle_type,
          finalApprovedFare,
          Number(trip_duration_days) || 1,
          booking_id,
          function(uErr) {
            if (uErr) return res.status(500).json({ error: uErr.message });

            // Record notification
            db.run(
              `INSERT INTO notifications (order_id, title, message, type, is_read) VALUES (?, ?, ?, 'assignment', 0)`,
              [
                booking_id,
                `Driver & Lorry Assigned: ${booking_id}`,
                `Lorry ${vehicle_no} and Driver ${driver} assigned to ${booking_id} (${booking.pickup} → ${booking.delivery}). Fare approved at ₹${finalApprovedFare.toLocaleString('en-IN')}.`
              ]
            );

            res.json({
              success: true,
              message: `Booking ${booking_id} assigned to ${vehicle_no} and driver ${driver} successfully.`,
              booking: {
                booking_id,
                assigned_vehicle: vehicle_no,
                assigned_driver: driver,
                vehicle_type: vehicle.vehicle_type,
                booking_status: 'Confirmed',
                approved_fare: finalApprovedFare
              }
            });
          }
        );
        updateStmt.finalize();
      });
    });
  });
});

// 4. Update Booking Status Workflow
router.put('/bookings/:booking_id/status', requireAdminAuth, (req, res) => {
  const { booking_id } = req.params;
  const { status, notes, rejection_reason } = req.body;

  const validStatuses = [
    'Pending Review & Assignment',
    'Pending',
    'Confirmed',
    'Assigned',
    'In Transit',
    'Completed',
    'Cancelled',
    'Rejected'
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}` });
  }

  db.get("SELECT * FROM bookings WHERE booking_id = ?", [booking_id], (bErr, booking) => {
    if (bErr) return res.status(500).json({ error: bErr.message });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    let updateQuery = "UPDATE bookings SET booking_status = ?";
    const updateParams = [status];

    if (rejection_reason) {
      updateQuery += ", cancellation_reason = ?";
      updateParams.push(rejection_reason);
    }
    if (notes) {
      updateQuery += ", instructions = COALESCE(instructions, '') || ' | ' || ?";
      updateParams.push(notes);
    }

    updateQuery += " WHERE booking_id = ?";
    updateParams.push(booking_id);

    db.run(updateQuery, updateParams, function(uErr) {
      if (uErr) return res.status(500).json({ error: uErr.message });

      db.run(
        `INSERT INTO notifications (order_id, title, message, type, is_read) VALUES (?, ?, ?, 'status_change', 0)`,
        [
          booking_id,
          `Booking Status: ${booking_id} is now ${status}`,
          `Status changed from ${booking.booking_status} to ${status}.${rejection_reason ? ' Reason: ' + rejection_reason : ''}`
        ]
      );

      res.json({
        success: true,
        message: `Booking ${booking_id} status updated to ${status}.`,
        booking_id,
        new_status: status
      });
    });
  });
});

// 5. Admin Notifications Endpoints
router.get('/admin/notifications', requireAdminAuth, (req, res) => {
  const query = `
    SELECT * FROM notifications 
    ORDER BY id DESC 
    LIMIT 50
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const unreadCount = (rows || []).filter(n => n.is_read === 0).length;
    res.json({
      notifications: rows || [],
      unreadCount
    });
  });
});

router.put('/admin/notifications/:id/read', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  db.run("UPDATE notifications SET is_read = 1 WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, updated: this.changes });
  });
});

router.put('/admin/notifications/mark-all-read', requireAdminAuth, (req, res) => {
  db.run("UPDATE notifications SET is_read = 1 WHERE is_read = 0", [], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, updated: this.changes });
  });
});

// 6. Admin Booking Analytics Endpoint
router.get('/admin/analytics', requireAdminAuth, (req, res) => {
  const summaryQuery = `
    SELECT 
      COUNT(*) as total_bookings,
      SUM(CASE WHEN booking_status LIKE '%Pending%' THEN 1 ELSE 0 END) as pending_bookings,
      SUM(CASE WHEN booking_status = 'Confirmed' OR booking_status = 'Accepted' THEN 1 ELSE 0 END) as confirmed_bookings,
      SUM(CASE WHEN (assigned_vehicle IS NOT NULL AND assigned_driver IS NOT NULL) OR booking_status = 'Assigned' THEN 1 ELSE 0 END) as assigned_orders,
      SUM(CASE WHEN booking_status = 'In Transit' THEN 1 ELSE 0 END) as in_transit_trips,
      SUM(CASE WHEN booking_status = 'Completed' THEN 1 ELSE 0 END) as completed_trips,
      SUM(CASE WHEN booking_status = 'Rejected' THEN 1 ELSE 0 END) as rejected_bookings,
      SUM(CASE WHEN booking_status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
      SUM(COALESCE(approved_fare, estimated_price, 0)) as total_booking_value
    FROM bookings
  `;

  const statusDistQuery = `
    SELECT 
      CASE 
        WHEN booking_status LIKE '%Pending%' THEN 'Pending'
        WHEN booking_status IN ('Confirmed', 'Accepted') THEN 'Confirmed'
        WHEN booking_status = 'Assigned' THEN 'Assigned'
        WHEN booking_status = 'In Transit' THEN 'In Transit'
        WHEN booking_status = 'Completed' THEN 'Completed'
        WHEN booking_status = 'Rejected' THEN 'Rejected'
        WHEN booking_status = 'Cancelled' THEN 'Cancelled'
        ELSE booking_status
      END as status_group,
      COUNT(*) as count
    FROM bookings
    GROUP BY status_group
  `;

  const trendsQuery = `
    SELECT 
      substr(created_at, 1, 10) as day,
      COUNT(*) as total_created,
      SUM(CASE WHEN booking_status = 'Completed' THEN 1 ELSE 0 END) as completed_count,
      SUM(CASE WHEN booking_status IN ('Cancelled', 'Rejected') THEN 1 ELSE 0 END) as cancelled_count
    FROM bookings
    GROUP BY day
    ORDER BY day DESC
    LIMIT 14
  `;

  const vehicleUtilQuery = `
    SELECT 
      v.vehicle_no,
      v.vehicle_type,
      COUNT(b.id) as trip_count,
      SUM(COALESCE(b.approved_fare, b.estimated_price, 0)) as total_revenue
    FROM vehicles v
    LEFT JOIN bookings b ON b.assigned_vehicle = v.vehicle_no AND b.booking_status NOT IN ('Cancelled', 'Rejected')
    GROUP BY v.vehicle_no
  `;

  const driverUtilQuery = `
    SELECT 
      d.name as driver_name,
      COUNT(b.id) as trip_count
    FROM drivers d
    LEFT JOIN bookings b ON b.assigned_driver = d.name AND b.booking_status NOT IN ('Cancelled', 'Rejected')
    GROUP BY d.name
  `;

  db.get(summaryQuery, [], (err, summary) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all(statusDistQuery, [], (sdErr, statusDist) => {
      db.all(trendsQuery, [], (tErr, trends) => {
        db.all(vehicleUtilQuery, [], (vErr, vehicleUtil) => {
          db.all(driverUtilQuery, [], (dErr, driverUtil) => {
            res.json({
              summary: {
                totalBookings: summary ? summary.total_bookings || 0 : 0,
                pendingBookings: summary ? summary.pending_bookings || 0 : 0,
                confirmedBookings: summary ? summary.confirmed_bookings || 0 : 0,
                assignedOrders: summary ? summary.assigned_orders || 0 : 0,
                inTransitTrips: summary ? summary.in_transit_trips || 0 : 0,
                completedTrips: summary ? summary.completed_trips || 0 : 0,
                rejectedBookings: summary ? summary.rejected_bookings || 0 : 0,
                cancelledBookings: summary ? summary.cancelled_bookings || 0 : 0,
                totalBookingValue: summary ? summary.total_booking_value || 0 : 0
              },
              statusDistribution: statusDist || [],
              trends: (trends || []).reverse(),
              vehicleUtilization: vehicleUtil || [],
              driverUtilization: driverUtil || []
            });
          });
        });
      });
    });
  });
});

// 7. Admin Vehicles & Drivers Management
router.get('/admin/vehicles', requireAdminAuth, (req, res) => {
  db.all("SELECT * FROM vehicles ORDER BY capacity_kg DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

router.put('/admin/vehicles/:vehicle_no/status', requireAdminAuth, (req, res) => {
  const { vehicle_no } = req.params;
  const { status, capacity_kg, driver } = req.body;

  db.run(
    "UPDATE vehicles SET status = COALESCE(?, status), capacity_kg = COALESCE(?, capacity_kg), driver = COALESCE(?, driver) WHERE vehicle_no = ?",
    [status, capacity_kg, driver, vehicle_no],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: `Vehicle ${vehicle_no} updated successfully.` });
    }
  );
});

router.get('/admin/drivers', requireAdminAuth, (req, res) => {
  db.all("SELECT * FROM drivers ORDER BY id ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

router.post('/admin/drivers', requireAdminAuth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Driver name is required' });
  }

  db.run("INSERT OR IGNORE INTO drivers (name, status) VALUES (?, 'Active')", [name.trim()], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: `Driver ${name.trim()} added.` });
  });
});

router.put('/admin/drivers/:name/status', requireAdminAuth, (req, res) => {
  const { name } = req.params;
  const { status } = req.body;

  db.run("UPDATE drivers SET status = ? WHERE name = ?", [status, name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: `Driver ${name} status updated to ${status}.` });
  });
});

// 8. Admin Pricing Controls
router.get('/admin/pricing', requireAdminAuth, (req, res) => {
  res.json({
    pricing: getPricingConfig(),
    fleet: FLEET_CONFIG
  });
});

router.put('/admin/pricing', requireAdminAuth, (req, res) => {
  const newConfig = req.body;
  savePricingToDb(db, newConfig, 'Admin', (err, updated) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({
      success: true,
      message: 'Transport pricing updated and applied successfully.',
      pricing: updated
    });
  });
});

// 9. Audit Logs
router.get('/admin/audit-logs', requireAdminAuth, (req, res) => {
  db.all("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

module.exports = router;
