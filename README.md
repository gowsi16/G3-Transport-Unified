# G3 Transport & Booking Integration — Single Localhost (One Origin)

Welcome to the unified **G3 Transport & Booking Management System**. Both applications have been integrated into **one single localhost entry point** (`http://localhost:3000`).

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
                                  |     UNIFIED GATEWAY (PORT 3000)       |
                                  |            (gateway.js)               |
                                  +---------------------------------------+
                                     |               |                 |
            +------------------------+               |                 +-----------------------+
            |                                        |                                         |
     Path: /, /book, /track, /about           Path: /admin/*                           Path: /api/*
            |                                        |                                         |
            v                                        v                                         v
+-----------------------+                +-----------------------+               +-----------------------------+
|    G3 BOOKING SITE    |                |  G3 TRANSPORT ADMIN   |               |        BACKEND APIS         |
|   (React 19 / Vite)   |                |  (React 18 / CRA)     |               |  (Internal Dev Proxying)    |
|   Internal Port 5173  |                |  Internal Port 3002   |               +-----------------------------+
|                       |                |  or Static Build      |                 |                         |
| • Green Theme         |                |                       |     /api/trips*, /api/login     /api/*, /api/admin/*
| • Public Booking Form |                | • Admin Login         |                 |                         |
| • Live Fare Engine    |                | • OCR Invoice Reader  |                 v                         v
| • Tracking System     |                | • Trips Management    |     +-----------------------+ +---------------------+
| • Customer Auth       |                | • Invoice PDF Gen     |     |   TRANSPORT BACKEND   | |   BOOKING BACKEND   |
| • Navbar "Admin" Link |                | • Fleet Analytics     |     |      (Port 5001)      | |     (Port 5000)     |
+-----------------------+                | • Booking Dispatch    |     +-----------------------+ +---------------------+
                                         | • "Booking Site ↗"    |                 |                         |
                                         +-----------------------+                 v                         v
                                                                          [database.sqlite]          [g3transport.db]
                                                                        (72 Trips, Invoices)       (27 Bookings, Lorries)
```

---

## Key Features & Experience

1. **One Localhost Only (`http://localhost:3000`):**
   - The user only ever opens `http://localhost:3000`.
   - No port switching, no multiple browser tabs required.
   - All frontends and backends communicate through relative paths (`/api/...`).

2. **Public Booking Site Opens First:**
   - Navigating to `http://localhost:3000` renders the original **G3 Booking Site** with its signature green theme.
   - Public visitors can browse routes, calculate pricing, check availability, book shipments, and track consignments.
   - Admin features, OCR, reports, invoices, and analytics are hidden from public visitors.

3. **Secure Admin Authentication & Access:**
   - Selecting **Admin** in the Booking Site navbar navigates to `http://localhost:3000/admin`.
   - Unauthenticated visitors are greeted by the Administrator Login screen.
   - Authenticated administrators gain full access to:
     - **Trips Management** (72 live records, status filters, CSV download, Excel upload)
     - **OCR Processing** (Tesseract OCR receipt parsing, automated trip creation)
     - **Invoice Generation** (PDF download, transport vs customer copy)
     - **Fleet Analytics Dashboard** (revenue, expenses, net profit, driver KPIs with Chart.js)
     - **Booking Dispatch Admin** (2FA-protected master consignment dispatch)
   - Admins can click **Booking Site ↗** in the navbar to return to public booking without losing their session.
   - Clicking **Logout** clears admin tokens and returns the browser to the public booking page.

4. **Zero Database Migrations or Destruction:**
   - `database.sqlite` (72 trips) and `g3transport.db` (27 consignments) remain completely untouched and separate.

---

## Admin Credentials

| Portal / Module | Username | Password | Secondary Factor |
| :--- | :--- | :--- | :--- |
| **Transport Admin** | `admin.g3` | `gggbrothers` | Role verified on server (`role: 'admin'`) |
| **Booking Admin (Dispatch)** | `admin` | `admin123` | 6-Digit Email OTP (Logged to console in dev) |

---

## Quick Start (One Command)

From the project root (`D:\Project\G3-Integration`):

```bash
npm start
```

*Or double-click `start-all.bat` or run `.\start-all.ps1` in PowerShell.*

This starts the unified gateway and internal services, then automatically launches your browser at:
**`http://localhost:3000`**

---

## Automated Test Suite

A complete integration test suite verifies all 30 criteria across routing, authentication, API proxying, security isolation, and database preservation:

```bash
npm test
# or
node test_integration.js
```
