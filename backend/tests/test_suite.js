const http = require('http');
const app = require('../server');
const db = require('../database/db');

let server;
const PORT = 5099; // Test port
const BASE_URL = `http://localhost:${PORT}`;

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(options.url || BASE_URL + options.path);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('   G3 UNIFIED BACKEND AUTOMATED TEST SUITE                      ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} ${details ? '- ' + details : ''}`);
      failed++;
    }
  }

  server = app.listen(PORT, async () => {
    try {
      // 1. Health check
      const resHealth = await request({ path: '/api/health' });
      assert('1. Health check returns 200 and status ok', resHealth.status === 200 && resHealth.json?.status === 'ok');

      // 2. Pricing & Distance calculations
      const resPrice = await request({
        path: '/api/calculate-price',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        distanceKm: 336,
        weight: 5000,
        helpers: 2
      });
      assert('2. POST /api/calculate-price calculates fare correctly with helpers',
        resPrice.status === 200 && resPrice.json?.totalEstimatedFare > 0 && resPrice.json?.helperCharge === 1600
      );

      // 3. Availability check
      const resAvail = await request({ path: '/api/availability?pickup=Salem&delivery=Chennai' });
      assert('3. GET /api/availability returns fleet status', resAvail.status === 200 && resAvail.json?.distanceValue > 0);

      // 4. Security: Unauthenticated access blocked
      const resUnauthTrips = await request({ path: '/api/trips' });
      assert('4. GET /api/trips without token returns 401 Unauthorized', resUnauthTrips.status === 401);

      const resUnauthBookings = await request({ path: '/api/admin/bookings' });
      assert('5. GET /api/admin/bookings without token returns 401 Unauthorized', resUnauthBookings.status === 401);

      // 5. Customer Authentication
      const testPhone = `98765${Math.floor(10000 + Math.random() * 90000)}`;
      const resRegister = await request({
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        name: 'Automated Test User',
        phone: testPhone,
        password: 'password123',
        email: 'testuser@example.com'
      });
      assert('6. POST /api/auth/register creates customer account', resRegister.status === 200 && resRegister.json?.customer?.customer_id);
      const customerId = resRegister.json?.customer?.customer_id;

      const testDate = '2027-05-' + String(Math.floor(10 + Math.random() * 18));

      // 6. Customer creates booking
      const resBooking = await request({
        path: '/api/bookings',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        customer_id: customerId,
        pickup: 'Salem',
        delivery: 'Chennai',
        weight_kg: 3000,
        helpers: 1,
        expected_date: testDate
      });
      assert('7. POST /api/bookings successfully creates booking order', resBooking.status === 201 && resBooking.json?.booking?.booking_id);
      const bookingId = resBooking.json?.booking?.booking_id;

      // 7. Transport Admin Login (admin.g3 / gggbrothers)
      const resAdminLogin = await request({
        path: '/api/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        username: 'admin.g3',
        password: 'gggbrothers'
      });
      assert('8. POST /api/login authenticates admin.g3 and returns JWT', resAdminLogin.status === 200 && resAdminLogin.json?.token);
      const adminToken = resAdminLogin.json?.token;

      // 8. Admin reads trips
      const resTrips = await request({
        path: '/api/trips',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert('9. GET /api/trips with Admin JWT returns 200 and preserved trips', resTrips.status === 200 && Array.isArray(resTrips.json) && resTrips.json.length > 0);

      // 9. Admin reads bookings
      const resAdminBookings = await request({
        path: '/api/admin/bookings',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert('10. GET /api/admin/bookings with Admin JWT returns 200', resAdminBookings.status === 200 && Array.isArray(resAdminBookings.json));

      // 10. Admin reads notifications
      const resNotifs = await request({
        path: '/api/admin/notifications',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert('11. GET /api/admin/notifications returns 200 with unread count', resNotifs.status === 200 && typeof resNotifs.json?.unreadCount === 'number');

      // 11. Admin reads analytics (8 KPIs)
      const resAnalytics = await request({
        path: '/api/admin/analytics',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert('12. GET /api/admin/analytics returns 200 with 8 KPI counters',
        resAnalytics.status === 200 &&
        resAnalytics.json?.summary?.totalBookings !== undefined &&
        resAnalytics.json?.summary?.pendingBookings !== undefined &&
        resAnalytics.json?.summary?.confirmedBookings !== undefined &&
        resAnalytics.json?.summary?.assignedOrders !== undefined &&
        resAnalytics.json?.summary?.inTransitTrips !== undefined &&
        resAnalytics.json?.summary?.completedTrips !== undefined &&
        resAnalytics.json?.summary?.cancelledBookings !== undefined &&
        resAnalytics.json?.summary?.rejectedBookings !== undefined
      );

      // 12. Driver & Vehicle assignment with overlap check
      if (bookingId) {
        const resAssign = await request({
          path: `/api/bookings/${bookingId}/assign`,
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }, {
          vehicle_no: 'TN 77AY 3006',
          driver: 'Senthil',
          approved_fare: 15000
        });
        assert('13. PUT /api/bookings/:id/assign assigns driver and vehicle', resAssign.status === 200 && resAssign.json?.success === true);

        // Conflict check: second booking with same date & vehicle
        const resBooking2 = await request({
          path: '/api/bookings',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, {
          customer_id: customerId,
          pickup: 'Salem',
          delivery: 'Chennai',
          weight_kg: 2000,
          helpers: 0,
          expected_date: testDate
        });

        if (resBooking2.json?.booking?.booking_id) {
          const resConflict = await request({
            path: `/api/bookings/${resBooking2.json.booking.booking_id}/assign`,
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            }
          }, {
            vehicle_no: 'TN 77AY 3006',
            driver: 'Senthil',
            approved_fare: 12000
          });
          assert('14. Overlapping assignment on same date returns 409 Conflict',
            resConflict.status === 409 && (resConflict.json?.error?.includes('conflict') || resConflict.json?.error?.includes('schedule'))
          );
        }
      }

      console.log('\n----------------------------------------------------------------');
      console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
      console.log('----------------------------------------------------------------\n');

      server.close(() => {
        process.exit(failed > 0 ? 1 : 0);
      });
    } catch (err) {
      console.error('Test execution error:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runTestSuite();
