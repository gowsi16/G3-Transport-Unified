# G3 Transport Unified Application Architecture

## 1. Executive Summary

The **G3 Transport Unified System** combines the public-facing consignment booking portal and the operational transport management dashboard into a single, cohesive, full-stack application.

Previously divided into two independent repositories (`G3-Transport` and `G3_Booking_Site`) running across disparate ports and databases, the system now features:
- **Unified Backend:** A single modular Express.js service on port 5000 backed by a unified SQLite database (`backend/database/g3transport.db`).
- **Unified Frontend:** A single Vite + React application running on port 3000, serving public customer pages and the authenticated `/admin` operations portal from a single origin.
- **Unified Database:** Zero data loss migration combining 72 trips, 42 bookings, fleet vehicles, drivers, admin users, notifications, and dynamic pricing rules.
- **Single Developer Command:** `npm run dev` boots the entire stack and opens the browser automatically.

---

## 2. Directory Structure

```
d:/Project/G3-Integration/
├── backend/
│   ├── database/
│   │   ├── db.js                 # SQLite connection manager (g3transport.db)
│   │   ├── migrate.js            # Safe schema & data migration script
│   │   └── g3transport.db        # Consolidated production SQLite database
│   ├── middleware/
│   │   └── authMiddleware.js     # Unified JWT validation & RBAC (Admin vs Customer)
│   ├── routes/
│   │   ├── adminRoutes.js        # Orders, 8 KPI analytics, lorry/driver assignment, notifications
│   │   ├── authRoutes.js         # Unified login (/api/login & /api/auth/*)
│   │   ├── bookingRoutes.js      # Fare calculation, availability, public bookings
│   │   └── tripRoutes.js         # Trip management, Excel upload, OCR trip creation
│   ├── services/
│   │   ├── emailService.js       # Notification mailer & dev OTP logger
│   │   ├── pricingConfig.js      # Dynamic fleet pricing matrix
│   │   └── roadService.js        # Tamil Nadu road distances & route checks
│   ├── tests/
│   │   └── test_suite.js         # 14-point automated backend test suite
│   ├── .env                      # Environment configuration
│   ├── package.json              # Backend dependencies & scripts
│   └── server.js                 # Unified Express application entry
│
├── frontend/
│   ├── public/                   # Static assets, branding logo, hero background
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # Shared UI buttons, badges, modals
│   │   │   ├── contact/          # Support & branch directory
│   │   │   ├── dashboard/        # Operational analytics & Chart.js reports
│   │   │   ├── invoices/         # Invoices generation & PDF download
│   │   │   ├── layout/           # PublicNavbar, AdminNavbar, Footer, NotificationsDropdown
│   │   │   ├── ocr/              # Tesseract OCR receipt scanning
│   │   │   ├── orders/           # Booking order management & driver assignment modal
│   │   │   └── trips/            # Fleet trips table, Excel upload, filters
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Unified session management (admin & customer)
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   ├── AdminLoginPage.jsx    # Transport Admin login interface
│   │   │   │   └── AdminPortal.jsx       # Tabbed Admin Portal with live badges
│   │   │   ├── public/
│   │   │   │   ├── AboutPage.jsx         # Company background & fleet specs
│   │   │   │   ├── BookingPage.jsx       # Multi-step booking wizard
│   │   │   │   ├── CustomerLoginPage.jsx # Customer phone/password auth
│   │   │   │   ├── HomePage.jsx          # Public landing, fare calculator, hero
│   │   │   │   └── TrackingPage.jsx      # Consignment tracking & live progress
│   │   ├── services/
│   │   │   ├── api.js            # Admin API client (trips, OCR, invoices)
│   │   │   └── bookingApi.js     # Public booking & dispatch API client
│   │   ├── App.jsx               # Single unified React router
│   │   ├── index.css             # Unified branding, Tailwind v4, green/white theme
│   │   └── main.jsx              # React 18 DOM mount point
│   ├── package.json              # Frontend dependencies (React, Vite, Tailwind v4)
│   └── vite.config.js            # Port 3000, API proxy to :5000, pre-bundling setup
│
├── docs/
│   └── ARCHITECTURE.md           # This document
├── scripts/
│   └── run-dev.js                # Single concurrent launcher with auto-browser opening
├── package.json                  # Root npm configuration (dev, test, start)
├── start-all.bat                 # Windows CMD double-click launcher
├── start-all.ps1                 # Windows PowerShell launcher
└── test_integration.js           # 36-point full-stack end-to-end test suite
```

---

## 3. Data Architecture & Consolidation

The database was unified into `backend/database/g3transport.db` using `migrate.js`. All historical data was preserved:

| Table | Count | Description |
| :--- | :--- | :--- |
| `trips` | 72 records | Operational trips from G3 Transport (revenues, expenses, drivers, statuses) |
| `bookings` | 42 records | Consignment orders from customer bookings (pickup, delivery, weights, fares) |
| `users` | 2 records | Administrative accounts (including `admin.g3` and `admin`) |
| `vehicles` | 2 vehicles | Fleet lorries with capacity (TN 77AY 3006, TN 30BA 4589) |
| `drivers` | 3 drivers | Qualified fleet drivers (Senthil, Ramesh, Murugan) |
| `notifications`| 22 alerts | Dispatch alerts, booking status changes, driver assignments |
| `pricing_config`| Config rows | Dynamic base rates, per-km charges, helper costs |

---

## 4. Unified Authentication & Access Control

1. **Role-Based Access Control (RBAC):**
   - Protected endpoints (`/api/trips`, `/api/admin/*`, `/api/bookings/:id/assign`) require a JWT with `role === 'admin'`.
   - Customer tokens (`role === 'customer'`) are restricted to reading their own orders and creating new bookings.
   - Public users can calculate estimates and track consignments without authentication.
2. **Admin Credentials:**
   - **Username:** `admin.g3`
   - **Password:** `gggbrothers`
   - Authenticates directly via `/api/login`, returning an Admin JWT recognized by both transport operations and booking dispatch.

---

## 5. Driver & Vehicle Conflict Prevention

When an administrator assigns a vehicle or driver to a booking order via `PUT /api/bookings/:id/assign`:
1. The backend verifies lorry payload capacity against consignment weight.
2. The backend checks for existing assignments matching either the same **Vehicle** or the same **Driver** within the target date range.
3. If an overlap is detected, the API rejects the request with HTTP **409 Conflict** and a descriptive error message, preventing double-booking of drivers or vehicles.

---

## 6. Verification & Automated Testing

Two automated test suites validate the unified codebase:
1. **Backend Test Suite (`npm run test:backend`):** 14/14 automated tests passing (100%).
2. **End-to-End Integration Suite (`npm test`):** 36/36 tests passing (100%) covering single-origin routing, API proxies, security isolation, role separation, analytics KPIs, assignment conflicts, and database integrity.
