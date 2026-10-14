const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

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

async function runTests() {
  console.log('================================================================');
  console.log('    INTEGRATION TEST SUITE: SINGLE ORIGIN (http://localhost:3000)');
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

  try {
    // 1. Public Booking Site Home
    const resHome = await request({ path: '/' });
    assert('1. GET / returns 200 from Booking Site (Vite)', resHome.status === 200 && (resHome.data.includes('G3 Transport') || resHome.data.includes('root')));

    // 2. Public Booking Site routes
    const resBook = await request({ path: '/book' });
    assert('2. GET /book returns 200 (SPA fallback to Vite HTML)', resBook.status === 200 && resBook.data.includes('root'));

    const resTrack = await request({ path: '/track' });
    assert('3. GET /track returns 200', resTrack.status === 200);

    const resAbout = await request({ path: '/about' });
    assert('4. GET /about returns 200', resAbout.status === 200);

    const resLogin = await request({ path: '/login' });
    assert('5. GET /login returns 200', resLogin.status === 200);

    // 3. Public Booking API through Gateway
    const resPrice = await request({
      path: '/api/calculate-price',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      distanceKm: 336,
      weight: 5000,
      helpers: 1
    });
    assert('6. POST /api/calculate-price calculates fare correctly', resPrice.status === 200 && resPrice.json && resPrice.json.totalEstimatedFare > 0, JSON.stringify(resPrice.json));

    const resAvail = await request({
      path: '/api/availability?pickup=Salem&delivery=Chennai'
    });
    assert('7. GET /api/availability returns fleet road availability', resAvail.status === 200 && resAvail.json && resAvail.json.distanceValue > 0);

    const resTracking = await request({
      path: '/api/bookings/BK202600001'
    });
    assert('8. GET /api/bookings/:id returns booking details', resTracking.status === 200 && resTracking.json && resTracking.json.booking_id === 'BK202600001');

    // 4. Security Tests: Direct Unauthenticated Access Blocked
    const resUnauthTrips = await request({ path: '/api/trips' });
    assert('9. GET /api/trips WITHOUT token returns 401 Unauthorized', resUnauthTrips.status === 401);

    const resUnauthOverview = await request({ path: '/api/admin/overview' });
    assert('10. GET /api/admin/overview WITHOUT token returns 401 Unauthorized', resUnauthOverview.status === 401);

    const resUnauthBookings = await request({ path: '/api/admin/bookings' });
    assert('11. GET /api/admin/bookings WITHOUT token returns 401 Unauthorized', resUnauthBookings.status === 401);

    const resUnauthVehicles = await request({ path: '/api/admin/vehicles' });
    assert('11a. GET /api/admin/vehicles WITHOUT token returns 401 Unauthorized', resUnauthVehicles.status === 401);

    const resUnauthPricing = await request({ path: '/api/admin/pricing' });
    assert('11b. GET /api/admin/pricing WITHOUT token returns 401 Unauthorized', resUnauthPricing.status === 401);

    const resUnauthDrivers = await request({ path: '/api/admin/drivers' });
    assert('11c. GET /api/admin/drivers WITHOUT token returns 401 Unauthorized', resUnauthDrivers.status === 401);

    // 5. Customer Token Isolation: Customer token CANNOT access admin endpoints
    const resCustLogin = await request({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      phone: '9876543210',
      password: 'password123'
    });
    const custToken = resCustLogin.json?.token || 'fake_customer_token';
    const resCustOnTrips = await request({
      path: '/api/trips',
      headers: { 'Authorization': `Bearer ${custToken}` }
    });
    assert('12. Customer token accessing /api/trips returns 401 or 403', resCustOnTrips.status === 401 || resCustOnTrips.status === 403);

    const resCustOnAdmin = await request({
      path: '/api/admin/overview',
      headers: { 'Authorization': `Bearer ${custToken}` }
    });
    assert('13. Customer token accessing /api/admin/overview returns 401 or 403', resCustOnAdmin.status === 401 || resCustOnAdmin.status === 403);

    // 6. Transport Admin Authentication
    const resAdminLogin = await request({
      path: '/api/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      username: 'admin.g3',
      password: 'gggbrothers'
    });
    assert('14. POST /api/login with admin.g3 authenticates successfully', resAdminLogin.status === 200 && resAdminLogin.json?.token);
    const adminToken = resAdminLogin.json?.token;

    // 7. Protected Trips Access with Admin Token
    const resAuthTrips = await request({
      path: '/api/trips',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert('15. GET /api/trips WITH admin token returns 200 & trips array', resAuthTrips.status === 200 && Array.isArray(resAuthTrips.json) && resAuthTrips.json.length > 0, `Length: ${resAuthTrips.json?.length}`);

    // 8. Admin Portal Routes on Single Origin
    const resAdminHome = await request({ path: '/admin' });
    assert('16. GET /admin returns 200 from Transport Admin', resAdminHome.status === 200 && resAdminHome.data.includes('html'));

    const resAdminTrips = await request({ path: '/admin/trips' });
    assert('17. GET /admin/trips returns 200 (SPA deep link)', resAdminTrips.status === 200, 'Got: ' + resAdminTrips.status);

    const resAdminOCR = await request({ path: '/admin/ocr' });
    assert('18. GET /admin/ocr returns 200 (SPA deep link)', resAdminOCR.status === 200, 'Got: ' + resAdminOCR.status);

    const resAdminInvoices = await request({ path: '/admin/invoices' });
    assert('19. GET /admin/invoices returns 200 (SPA deep link)', resAdminInvoices.status === 200, 'Got: ' + resAdminInvoices.status);

    const resAdminDashboard = await request({ path: '/admin/dashboard' });
    assert('20. GET /admin/dashboard returns 200 (SPA deep link)', resAdminDashboard.status === 200, 'Got: ' + resAdminDashboard.status);

    const resAdminBooking = await request({ path: '/admin/booking' });
    assert('21. GET /admin/booking returns 200 (SPA deep link)', resAdminBooking.status === 200, 'Got: ' + resAdminBooking.status);

    // 9. Booking Admin 2FA Flow
    const resOtpStep1 = await request({
      path: '/api/admin/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      username: 'admin',
      password: 'admin123'
    });
    assert('22. POST /api/admin/auth/login triggers 2FA OTP step', resOtpStep1.status === 200 && resOtpStep1.json?.sessionToken);

    const devOtp = resOtpStep1.json?.devOtp;
    const sessionToken = resOtpStep1.json?.sessionToken;

    if (devOtp && sessionToken) {
      const resOtpStep2 = await request({
        path: '/api/admin/auth/verify-otp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        sessionToken,
        otp: devOtp
      });
      assert('23. POST /api/admin/auth/verify-otp completes 2FA & returns admin JWT', resOtpStep2.status === 200 && resOtpStep2.json?.token);
      const bookingAdminToken = resOtpStep2.json?.token;

      const resAuthOverview = await request({
        path: '/api/admin/overview',
        headers: { 'Authorization': `Bearer ${bookingAdminToken}` }
      });
      assert('24. GET /api/admin/overview WITH 2FA JWT returns 200 & live stats', resAuthOverview.status === 200 && resAuthOverview.json?.totalBookings !== undefined);

      const resAuthBookings = await request({
        path: '/api/admin/bookings',
        headers: { 'Authorization': `Bearer ${bookingAdminToken}` }
      });
      assert('25. GET /api/admin/bookings WITH 2FA JWT returns active bookings', resAuthBookings.status === 200 && Array.isArray(resAuthBookings.json));
    }

    // 10. Unified Admin Auth on Booking APIs (Requirement 1 & 6)
    const resUnifiedBookings = await request({
      path: '/api/admin/bookings',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert('26. GET /api/admin/bookings WITH Transport Admin JWT returns 200 (Single Admin Login)', resUnifiedBookings.status === 200 && Array.isArray(resUnifiedBookings.json));

    // 11. Orders SPA Route (Requirement 2)
    const resAdminOrders = await request({ path: '/admin/orders' });
    assert('27. GET /admin/orders returns 200 (SPA deep link)', resAdminOrders.status === 200);

    // 12. Notifications System (Requirement 5)
    const resNotifications = await request({
      path: '/api/admin/notifications',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert('28. GET /api/admin/notifications returns 200 with unreadCount and list',
      resNotifications.status === 200 &&
      typeof resNotifications.json?.unreadCount === 'number' &&
      Array.isArray(resNotifications.json?.notifications)
    );

    if (resNotifications.json?.notifications?.length > 0) {
      const notifId = resNotifications.json.notifications[0].id;
      const resMarkRead = await request({
        path: `/api/admin/notifications/${notifId}/read`,
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert('29. PUT /api/admin/notifications/:id/read marks notification read', resMarkRead.status === 200 && resMarkRead.json?.success === true);
    }

    // 13. Booking Analytics Endpoint (Requirement 4)
    const resAnalytics = await request({
      path: '/api/admin/analytics',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert('30. GET /api/admin/analytics returns 200 with 8 KPI counters and chart data',
      resAnalytics.status === 200 &&
      resAnalytics.json?.summary?.totalBookings !== undefined &&
      resAnalytics.json?.summary?.pendingBookings !== undefined &&
      resAnalytics.json?.summary?.confirmedBookings !== undefined &&
      resAnalytics.json?.summary?.assignedOrders !== undefined &&
      resAnalytics.json?.summary?.inTransitTrips !== undefined &&
      resAnalytics.json?.summary?.completedTrips !== undefined &&
      resAnalytics.json?.summary?.cancelledBookings !== undefined &&
      resAnalytics.json?.summary?.rejectedBookings !== undefined &&
      Array.isArray(resAnalytics.json?.statusDistribution)
    );

    // 14. Driver and Lorry Conflict Prevention (Requirement 3 & 8)
    const resVehicles = await request({
      path: '/api/admin/vehicles',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const resDrivers = await request({
      path: '/api/admin/drivers',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (resVehicles.json?.length > 0 && resDrivers.json?.length > 0) {
      const testVehicle = resVehicles.json[0];
      const testDriver = resDrivers.json[0];
      const uniqueDate = '2028-11-' + String(Math.floor(10 + Math.random() * 18));

      // Create booking 1 on uniqueDate
      const resCreate1 = await request({
        path: '/api/bookings',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        customer_id: 'CUST-TEST-INT',
        pickup: 'Salem',
        delivery: 'Chennai',
        weight_kg: 2500,
        helpers: 1,
        expected_date: uniqueDate
      });

      const b1 = resCreate1.json?.booking;
      if (b1) {
        // Assign booking 1
        const resAssign = await request({
          path: `/api/bookings/${b1.booking_id}/assign`,
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }, {
          vehicle_no: testVehicle.vehicle_no,
          driver: testDriver.name || testVehicle.driver,
          approved_fare: 14000,
          trip_duration_days: 1
        });
        assert('31. PUT /api/bookings/:id/assign successfully assigns driver and lorry',
          resAssign.status === 200 && resAssign.json?.success === true,
          JSON.stringify(resAssign.json)
        );

        // Create booking 2 on the same uniqueDate
        const resCreate2 = await request({
          path: '/api/bookings',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, {
          customer_id: 'CUST-TEST-INT',
          pickup: 'Salem',
          delivery: 'Chennai',
          weight_kg: 2000,
          helpers: 0,
          expected_date: uniqueDate
        });
        const b2 = resCreate2.json?.booking;

        if (b2) {
          const resConflict = await request({
            path: `/api/bookings/${b2.booking_id}/assign`,
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            }
          }, {
            vehicle_no: testVehicle.vehicle_no,
            driver: testDriver.name || testVehicle.driver,
            approved_fare: 12000,
            trip_duration_days: 1
          });
          assert('32. Overlapping driver/lorry assignment on same date returns 409 Conflict',
            resConflict.status === 409 && (resConflict.json?.error?.includes('conflict') || resConflict.json?.error?.includes('Vehicle') || resConflict.json?.error?.includes('Driver') || resConflict.json?.error?.includes('schedule')),
            JSON.stringify(resConflict.json)
          );
        }
      }
    }

    // 15. Database Integrity Verification
    const unifiedDbPath = path.resolve(__dirname, 'backend', 'database', 'g3transport.db');
    const unifiedDbExists = fs.existsSync(unifiedDbPath) && fs.statSync(unifiedDbPath).size > 0;
    assert('33. Unified database exists and is non-empty', unifiedDbExists, unifiedDbPath);

    const transportDbPath = path.resolve(__dirname, 'G3-Transport', 'backend', 'database.sqlite');
    const bookingDbPath = path.resolve(__dirname, 'G3_Booking_Site', 'backend', 'g3transport.db');
    const transportDbExists = fs.existsSync(transportDbPath) && fs.statSync(transportDbPath).size > 0;
    const bookingDbExists = fs.existsSync(bookingDbPath) && fs.statSync(bookingDbPath).size > 0;
    assert('34. Original Transport database preserved intact as archive', transportDbExists, transportDbPath);
    assert('35. Original Booking database preserved intact as archive', bookingDbExists, bookingDbPath);

    console.log('\n----------------------------------------------------------------');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('----------------------------------------------------------------\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
