# G3 Transport Unified Application

A unified transportation management system combining the customer consignment booking site and the G3 Transport operational admin dashboard into a single, cohesive full-stack application.

---

## Architecture Overview

```
                                +---------------------------------------+
                                |         SINGLE ENTRY POINT            |
                                |        http://localhost:3000          |
                                +---------------------------------------+
                                                   |
                                                   v
                                +---------------------------------------+
                                |      UNIFIED FRONTEND (Vite / React)  |
                                |            Port 3000                  |
                                +---------------------------------------+
                                   |                                |
                 +-----------------+                                +-----------------+
                 |                                                                    |
        Path: /, /book, /track, /about                                        Path: /admin/*
                 |                                                                    |
                 v                                                                    v
     +-----------------------+                                            +-----------------------+
     |  CUSTOMER PORTAL      |                                            |  ADMIN PORTAL         |
     |                       |                                            |                       |
     | • Green / White Theme |                                            | • Single Admin Login  |
     | • Live Fare Calculator|                                            | • Orders Management   |
     | • Booking Wizard      |                                            | • Driver/Lorry Assign |
     | • Shipment Tracking   |                                            | • Conflict Prevention |
     | • Customer Account    |                                            | • Trips Management    |
     +-----------------------+                                            | • OCR Invoice Reader  |
                                                                          | • Invoice PDF Engine  |
                                                                          | • 8 KPI Analytics     |
                                                                          | • Notification Alerts |
                                                                          +-----------------------+
                                                   |
                                                   | Proxy /api/*
                                                   v
                                +---------------------------------------+
                                |      UNIFIED BACKEND (Express.js)     |
                                |            Port 5000                  |
                                +---------------------------------------+
                                                   |
                                                   v
                                +---------------------------------------+
                                |          UNIFIED DATABASE             |
                                |    backend/database/g3transport.db    |
                                |  (72 Trips, 42 Bookings, Fleet, KPIs) |
                                +---------------------------------------+
```

---

## Key Features

1. **Single Localhost (`http://localhost:3000`):**
   - The entire application runs on `http://localhost:3000`.
   - Public customer pages and the authenticated `/admin` portal are served from the same origin without CORS or cookie issues.
2. **Unified Admin Portal (`http://localhost:3000/admin`):**
   - Single admin login using credentials:
     - **Username:** `admin.g3`
     - **Password:** `gggbrothers`
   - Access to **Orders**, **Trips**, **OCR Reader**, **Invoices**, **Analytics**, and real-time **Notifications**.
3. **Driver & Lorry Assignment with Overlap Prevention:**
   - Visual assignment modal to select available vehicles and drivers.
   - Enforces vehicle weight capacities and blocks duplicate schedule assignments with HTTP 409 Conflict.
4. **Comprehensive Fleet Analytics:**
   - 8 live KPI counters: Total Bookings, Pending, Confirmed, Assigned Orders, In-Transit Trips, Completed Trips, Cancelled, and Rejected.
   - Revenue, expense, and net profit charts powered by Chart.js.
5. **Zero Data Loss Migration:**
   - 72 operational trips from G3 Transport and 42 customer bookings consolidated into `backend/database/g3transport.db`.

---

## Quick Start (One Command)

From the project root (`D:\Project\G3-Integration`):

```bash
npm run dev
```

*Or double-click `start-all.bat` or run `.\start-all.ps1` in PowerShell.*

This starts both the unified backend (:5000) and frontend (:3000) concurrently and opens your browser at **`http://localhost:3000`**.

---

## Automated Test Suites

### Full-Stack End-to-End Integration Suite (36 Tests)
```bash
npm test
# or
node test_integration.js
```

### Backend API Test Suite (14 Tests)
```bash
npm run test:backend
# or
node backend/tests/test_suite.js
```

---

## Documentation

For in-depth architecture, data schemas, API contracts, and security implementation details, refer to [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
