import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layout Components
import PublicNavbar from './components/layout/PublicNavbar';
import Footer from './components/layout/Footer';

// Public Customer Pages
import HomePage from './pages/public/HomePage';
import BookingPage from './pages/public/BookingPage';
import TrackingPage from './pages/public/TrackingPage';
import AboutPage from './pages/public/AboutPage';
import CustomerLoginPage from './pages/public/CustomerLoginPage';

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminPortal from './pages/admin/AdminPortal';

// Public Layout Wrapper
function PublicLayout({ children }) {
  return (
    <div className="w-full flex flex-col min-h-screen bg-[#F0FDF4] font-sans">
      <PublicNavbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Customer Routes */}
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/book" element={<PublicLayout><BookingPage /></PublicLayout>} />
          <Route path="/track" element={<PublicLayout><TrackingPage /></PublicLayout>} />
          <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
          <Route path="/contact" element={<Navigate to="/about" replace />} />
          <Route path="/login" element={<PublicLayout><CustomerLoginPage /></PublicLayout>} />

          {/* Admin Auth Route */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Unified Admin Portal Routes */}
          <Route path="/admin" element={<AdminPortal initialPage="Dashboard" />} />
          <Route path="/admin/dashboard" element={<AdminPortal initialPage="Dashboard" />} />
          <Route path="/admin/orders" element={<AdminPortal initialPage="Orders" />} />
          <Route path="/admin/trips" element={<AdminPortal initialPage="Trips" />} />
          <Route path="/admin/invoices" element={<AdminPortal initialPage="Invoices" />} />
          <Route path="/admin/ocr" element={<AdminPortal initialPage="OCR" />} />
          <Route path="/admin/fleet-drivers" element={<AdminPortal initialPage="FleetDrivers" />} />
          <Route path="/admin/inbox" element={<AdminPortal initialPage="Inbox" />} />
          <Route path="/admin/drivers" element={<Navigate to="/admin/fleet-drivers" replace />} />
          <Route path="/admin/fleet" element={<Navigate to="/admin/fleet-drivers" replace />} />
          <Route path="/admin/support" element={<Navigate to="/admin/inbox" replace />} />
          <Route path="/admin/home" element={<AdminPortal initialPage="Home" />} />

          {/* Legacy Redirects */}
          <Route path="/admin/booking" element={<Navigate to="/admin/orders" replace />} />
          <Route path="/admin/booking-admin" element={<Navigate to="/admin/orders" replace />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
