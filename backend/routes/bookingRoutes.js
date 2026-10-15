const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { calculateActualRoadDistance } = require('../services/roadService');
const { 
  FLEET_CONFIG, 
  PRICING_CONFIG, 
  getPricingConfig, 
  normalizeWeightToKg, 
  calculateTransportFare 
} = require('../services/pricingConfig');
const { requireCustomerAuth } = require('../middleware/authMiddleware');

// 1. Pricing Rules Endpoint
router.get('/pricing-rules', (req, res) => {
  res.json({
    fleet: FLEET_CONFIG,
    pricing: getPricingConfig(),
    helperRate: PRICING_CONFIG.helperRate,
    minimumFare: PRICING_CONFIG.minimumFare,
    note: "Transport fare is calculated from actual highway road distance, weight tier, minimum fare, and ₹800 helper charges."
  });
});

// 2. Calculate Fare Endpoint
router.post('/calculate-price', (req, res) => {
  const { distanceKm, distance, weight, weight_unit, helpers } = req.body;
  const d = Math.max(1, Math.round(Number(distanceKm || distance) || 0));
  const normalizedWeight = normalizeWeightToKg(weight, weight_unit);
  const fareDetails = calculateTransportFare({
    distanceKm: d,
    weightKg: normalizedWeight,
    helpers: helpers || 0
  });

  res.json(fareDetails);
});

// 3. Availability & Road Route Endpoint
router.get('/availability', async (req, res) => {
  const { pickup, delivery, expected_date, weight, weight_unit, helpers } = req.query;

  if (!pickup || !delivery) {
    return res.status(400).json({ error: 'Pickup and Delivery locations are required.' });
  }

  try {
    const roadResult = await calculateActualRoadDistance(pickup, delivery);
    const distanceValue = roadResult.distanceKm;

    const normalizedWeight = normalizeWeightToKg(weight || 3500, weight_unit || "kg");
    const fareEstimate = calculateTransportFare({
      distanceKm: distanceValue,
      weightKg: normalizedWeight,
      helpers: parseInt(helpers, 10) || 0
    });

    db.all("SELECT * FROM vehicles ORDER BY capacity_kg DESC", [], (err, vehicles) => {
      if (err) return res.status(500).json({ error: err.message });

      if (expected_date) {
        db.all(
          "SELECT assigned_vehicle FROM bookings WHERE expected_date = ? AND booking_status IN ('Confirmed', 'Accepted', 'Assigned', 'In Transit')",
          [expected_date],
          (bErr, assignedRows) => {
            if (bErr) return res.status(500).json({ error: bErr.message });

            const assignedVehicleNos = (assignedRows || []).map(r => r.assigned_vehicle);
            let availableCount = 0;

            const fleetStatus = vehicles.map(v => {
              const isAssigned = assignedVehicleNos.includes(v.vehicle_no);
              const isAvailable = v.status === 'Available' && !isAssigned;
              if (isAvailable) availableCount++;
              return {
                vehicle_no: v.vehicle_no,
                type: v.vehicle_type,
                capacity_kg: v.capacity_kg,
                status: isAssigned ? 'Assigned' : v.status,
                driver: v.driver,
                isAvailableOnDate: isAvailable
              };
            });

            res.json({
              pickup,
              delivery,
              distance: `${distanceValue} km`,
              distanceValue,
              estimatedTime: roadResult.estimatedTime || "4-5 hrs",
              routeType: roadResult.routeType,
              source: roadResult.source,
              fleet: fleetStatus,
              availableLorriesCount: availableCount,
              fleetStatusNote: availableCount > 0 
                ? `${availableCount} company lorry available for this date. Admin will assign vehicle upon booking review.`
                : `Both company lorries are currently assigned or in service on ${expected_date}. You may still submit your booking for priority scheduling or select an alternate date.`,
              pricing: getPricingConfig(),
              estimatedFare: fareEstimate
            });
          }
        );
      } else {
        const fleetStatus = vehicles.map(v => ({
          vehicle_no: v.vehicle_no,
          type: v.vehicle_type,
          capacity_kg: v.capacity_kg,
          status: v.status,
          driver: v.driver,
          isAvailableOnDate: v.status === 'Available'
        }));

        res.json({
          pickup,
          delivery,
          distance: `${distanceValue} km`,
          distanceValue,
          estimatedTime: roadResult.estimatedTime || "4-5 hrs",
          routeType: roadResult.routeType,
          source: roadResult.source,
          fleet: fleetStatus,
          pricing: getPricingConfig(),
          estimatedFare: fareEstimate
        });
      }
    });
  } catch (error) {
    console.error('Error calculating road distance & availability:', error);
    res.status(500).json({ error: 'Failed to calculate road route and availability' });
  }
});

// 4. Create Booking Endpoint (Customer authentication required)
router.post('/bookings', async (req, res) => {
  const { 
    customer_id, 
    pickup, 
    delivery, 
    pickup_address,
    delivery_address,
    customer_address,
    distance, 
    distanceKm,
    load_type, 
    average_weight, 
    weight_kg,
    helpers, 
    expected_date,
    instructions
  } = req.body || {};

  if (!customer_id) {
    return res.status(401).json({ error: 'Authentication required. Please log in before booking a transport lorry.' });
  }

  db.get("SELECT * FROM customers WHERE customer_id = ?", [customer_id], async (err, customer) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!customer) {
      return res.status(401).json({ error: 'Invalid customer session. Please log in again.' });
    }

    if (!pickup || !delivery) {
      return res.status(400).json({ error: 'Pickup and Delivery locations are required.' });
    }

    let resolvedDistanceKm = Math.round(Number(distanceKm || distance) || 0);
    if (!resolvedDistanceKm || resolvedDistanceKm < 5) {
      try {
        const roadInfo = await calculateActualRoadDistance(pickup, delivery);
        resolvedDistanceKm = roadInfo.distanceKm;
      } catch (e) {
        resolvedDistanceKm = 250;
      }
    }

    const rawWeight = weight_kg || average_weight;
    const normalizedWeightKg = normalizeWeightToKg(rawWeight);

    if (normalizedWeightKg > FLEET_CONFIG.max_fleet_capacity_kg) {
      return res.status(400).json({
        error: `Load weight (${normalizedWeightKg} kg / ${(normalizedWeightKg/1000).toFixed(1)} Tons) exceeds G3 Transport's maximum vehicle capacity of ${FLEET_CONFIG.max_fleet_capacity_kg} kg (8 Tons). Please contact dispatch for split-load arrangements.`
      });
    }

    const fareBreakdown = calculateTransportFare({
      distanceKm: resolvedDistanceKm,
      weightKg: normalizedWeightKg,
      helpers: helpers || 0
    });

    const calculatedPrice = fareBreakdown.totalEstimatedFare;
    const helperCharges = fareBreakdown.helperCharge || 0;

    db.get("SELECT COUNT(id) as count FROM bookings", (cErr, row) => {
      if (cErr) return res.status(500).json({ error: cErr.message });
      const nextId = (row ? row.count : 0) + 1;
      const bookingId = `BK2026${String(nextId).padStart(5, '0')}`;
      const defaultStatus = 'Pending Review & Assignment';

      const insertStmt = db.prepare(`
        INSERT INTO bookings (
          booking_id, customer_id, pickup, delivery, 
          customer_address, pickup_address, delivery_address,
          distance, vehicle_type, assigned_vehicle, load_type, 
          average_weight, weight_kg, helpers, helper_charge, 
          estimated_price, expected_date, instructions, booking_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending Admin Lorry Assignment', NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Review & Assignment')
      `);

      insertStmt.run(
        bookingId,
        customer.customer_id,
        pickup.trim(),
        delivery.trim(),
        customer_address || customer.customer_address || '',
        pickup_address || '',
        delivery_address || '',
        `${resolvedDistanceKm} km`,
        load_type ? load_type.trim() : 'General Cargo',
        rawWeight ? String(rawWeight) : `${normalizedWeightKg} kg`,
        normalizedWeightKg,
        parseInt(helpers, 10) || 0,
        helperCharges,
        calculatedPrice,
        expected_date || new Date().toISOString().split('T')[0],
        instructions || '',
        function(insErr) {
          if (insErr) return res.status(500).json({ error: insErr.message });

          // Auto-insert Admin Notification
          db.run(
            `INSERT INTO notifications (order_id, title, message, type, is_read) VALUES (?, ?, ?, 'new_booking', 0)`,
            [
              bookingId,
              `New Booking: ${bookingId}`,
              `${customer.name} booked a consignment from ${pickup} to ${delivery} (${normalizedWeightKg} kg, ₹${calculatedPrice.toLocaleString('en-IN')}). Driver assignment needed.`
            ]
          );

          res.status(201).json({
            success: true,
            message: 'Booking submitted successfully! Dispatch team will review and assign your company lorry & driver.',
            booking: {
              booking_id: bookingId,
              customer_id: customer.customer_id,
              customer_name: customer.name,
              customer_phone: customer.phone,
              pickup,
              delivery,
              pickup_address: pickup_address || customer_address || '',
              delivery_address: delivery_address || '',
              distance: `${resolvedDistanceKm} km`,
              distance_km: resolvedDistanceKm,
              weight_kg: normalizedWeightKg,
              helpers: parseInt(helpers, 10) || 0,
              helper_charges: helperCharges,
              estimated_price: calculatedPrice,
              expected_date: expected_date || new Date().toISOString().split('T')[0],
              booking_status: defaultStatus,
              fareBreakdown
            }
          });
        }
      );
      insertStmt.finalize();
    });
  });
});

// 5. My Bookings (Customer tracking - authenticated)
router.get('/bookings/my-bookings', requireCustomerAuth, (req, res) => {
  const user = req.user || req.customer || {};
  const requestedCustomerId = req.query.customer_id;

  // If customer, force query to their own customer_id to avoid exposing other users' orders
  const effectiveCustomerId = (user.role === 'admin')
    ? (requestedCustomerId || user.customer_id)
    : user.customer_id;

  if (!effectiveCustomerId) {
    return res.status(400).json({ error: 'Customer ID is required.' });
  }

  db.all("SELECT * FROM bookings WHERE customer_id = ? ORDER BY id DESC", [effectiveCustomerId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// 6. Single Booking Details (Authenticated Customer Tracking with Privacy Protection)
router.get('/bookings/:booking_id', requireCustomerAuth, (req, res) => {
  const { booking_id } = req.params;
  const user = req.user || req.customer || {};

  db.get("SELECT * FROM bookings WHERE booking_id = ?", [booking_id], (err, booking) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    // Customer-level authorization: ensure customer can only access their own order
    if (user.role !== 'admin') {
      const isOwner = user.customer_id && booking.customer_id === user.customer_id;
      if (!isOwner) {
        return res.status(403).json({ 
          error: 'Access denied. You can only view tracking details for your own transport consignments.' 
        });
      }
    }

    res.json(booking);
  });
});

// 7. Cancel Booking (Customer cancellation)
router.put('/bookings/:booking_id/cancel', (req, res) => {
  const { booking_id } = req.params;
  const { reason = 'Cancelled by customer' } = req.body || {};

  db.get("SELECT * FROM bookings WHERE booking_id = ?", [booking_id], (err, booking) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    if (booking.booking_status === 'Completed' || booking.booking_status === 'In Transit') {
      return res.status(400).json({ 
        error: `Cannot cancel booking that is already '${booking.booking_status}'. Please contact dispatch.` 
      });
    }

    db.run(
      "UPDATE bookings SET booking_status = 'Cancelled', cancellation_reason = ? WHERE booking_id = ?",
      [reason, booking_id],
      function(uErr) {
        if (uErr) return res.status(500).json({ error: uErr.message });

        db.run(
          `INSERT INTO notifications (order_id, title, message, type, is_read) VALUES (?, ?, ?, 'cancellation', 0)`,
          [booking_id, `Booking Cancelled: ${booking_id}`, `Booking ${booking_id} was cancelled. Reason: ${reason}`]
        );

        res.json({ success: true, message: `Booking ${booking_id} has been cancelled.` });
      }
    );
  });
});

module.exports = router;
