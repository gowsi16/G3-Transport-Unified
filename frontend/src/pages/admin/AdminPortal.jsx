import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { calculateTripMetrics } from '../../utils/calculations';
import AdminNavbar from '../../components/layout/AdminNavbar';
import Footer from '../../components/layout/Footer';
import Notification from '../../components/common/Notification';

import AdminHomePage from './AdminHomePage';
import OrdersPage from '../../components/orders/OrdersPage';
import TripsPage from '../../components/trips/TripsPage';
import InvoicesPage from '../../components/invoices/InvoicesPage';
import OCRPage from '../../components/ocr/OCRPage';
import DashboardPage from '../../components/dashboard/DashboardPage';
import SupportInboxPage from '../../components/contact/SupportInboxPage';
import FleetDriversPage from '../../components/fleet/FleetDriversPage';
import DriverManagementPage from '../../components/drivers/DriverManagementPage';
import FleetManagementPage from '../../components/fleet/FleetManagementPage';

export default function AdminPortal({ initialPage }) {
  const { isAdmin, adminUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current page from URL
  const determinePage = () => {
    if (initialPage) return initialPage;
    const path = location.pathname.toLowerCase().replace(/^\/+admin\/?/, '');
    if (path === 'orders' || path.startsWith('orders')) return 'Orders';
    if (path === 'trips' || path.startsWith('trips')) return 'Trips';
    if (path === 'invoices' || path.startsWith('invoices')) return 'Invoices';
    if (path === 'ocr' || path.startsWith('ocr')) return 'OCR';
    if (path === 'fleet-drivers' || path.startsWith('fleet-drivers') || path === 'fleet' || path === 'drivers') return 'FleetDrivers';
    if (path === 'inbox' || path.startsWith('inbox') || path === 'support' || path.startsWith('support')) return 'Inbox';
    if (path === 'home') return 'Home';
    return 'Dashboard';
  };

  const [currentPage, setCurrentPage] = useState(determinePage());
  const [trips, setTrips] = useState([]);
  const [notification, setNotification] = useState({ message: '', type: '' });

  useEffect(() => {
    setCurrentPage(determinePage());
  }, [location.pathname]);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
  };

  const fetchTrips = async () => {
    try {
      const data = await api.getTrips();
      if (Array.isArray(data)) {
        setTrips(data.map(calculateTripMetrics));
      }
    } catch (error) {
      console.error('Error fetching trips in AdminPortal:', error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchTrips();
    }
  }, [isAdmin]);

  // Trip action handlers
  const handleAddTrip = async (newTrip) => {
    try {
      await api.createTrip(newTrip);
      const tripWithMetrics = calculateTripMetrics(newTrip);
      setTrips(prev => [...prev, tripWithMetrics]);
      showNotification('Trip successfully saved to database!', 'success');
    } catch (error) {
      console.error('Error saving trip:', error);
      showNotification('Failed to save trip to database', 'error');
    }
  };

  const handleUpdateTrip = (updatedTrip) => {
    const tripWithMetrics = calculateTripMetrics(updatedTrip);
    setTrips(prev => prev.map(t => t.id === updatedTrip.id ? tripWithMetrics : t));
    showNotification('Trip successfully updated!', 'success');
  };

  const handleDeleteTrip = async (tripId) => {
    if (window.confirm('Are you sure you want to delete this trip?')) {
      try {
        await api.deleteTrip(tripId);
        setTrips(prev => prev.filter(t => t.id !== tripId));
        showNotification('Trip successfully deleted from database!', 'success');
      } catch (error) {
        console.error('Error deleting trip:', error);
        showNotification('Failed to delete trip from database', 'error');
      }
    }
  };

  const handleBulkDeleteTrips = async (tripIds) => {
    if (window.confirm(`Are you sure you want to delete ${tripIds.length} trips?`)) {
      try {
        await Promise.all(tripIds.map(id => api.deleteTrip(id)));
        setTrips(prev => prev.filter(t => !tripIds.includes(t.id)));
        showNotification(`Successfully deleted ${tripIds.length} trips!`, 'success');
      } catch (error) {
        console.error('Error deleting trips:', error);
        showNotification('Failed to delete trips from database', 'error');
      }
    }
  };

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'Orders':
        return <OrdersPage showNotification={showNotification} />;
      case 'Trips':
        return (
          <TripsPage 
            trips={trips} 
            onAddTrip={handleAddTrip} 
            onUpdateTrip={handleUpdateTrip} 
            onDeleteTrip={handleDeleteTrip} 
            onBulkDeleteTrips={handleBulkDeleteTrips} 
            showNotification={showNotification} 
          />
        );
      case 'Invoices':
        return <InvoicesPage trips={trips} showNotification={showNotification} />;
      case 'OCR':
        return (
          <OCRPage 
            onSaveTrip={handleAddTrip} 
            onAddTrip={handleAddTrip} 
            currentUser={adminUser || { name: 'Admin' }}
            fetchTrips={fetchTrips}
            showNotification={showNotification} 
          />
        );
      case 'Inbox':
      case 'Support':
        return <SupportInboxPage showNotification={showNotification} />;
      case 'FleetDrivers':
        return <FleetDriversPage showNotification={showNotification} />;
      case 'Drivers':
        return <FleetDriversPage showNotification={showNotification} />;
      case 'Fleet':
        return <FleetDriversPage showNotification={showNotification} />;
      case 'Home':
        return <AdminHomePage trips={trips} />;
      case 'Dashboard':
      default:
        return <DashboardPage trips={trips} showNotification={showNotification} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
      <AdminNavbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <Notification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderCurrentPage()}
      </main>
      <Footer />
    </div>
  );
}
