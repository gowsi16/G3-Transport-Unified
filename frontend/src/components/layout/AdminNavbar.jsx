import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingApi } from '../../services/bookingApi';
import { Menu, X, Bell, Check, Package, AlertCircle, LogOut } from 'lucide-react';

export default function AdminNavbar({ currentPage, setCurrentPage }) {
  const { adminUser, logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const bellDropdownRef = useRef(null);

  const navItems = [
    { name: 'Dashboard', label: 'Dashboard', path: '/admin/dashboard' },
    { name: 'Orders', label: 'Orders', path: '/admin/orders' },
    { name: 'Trips', label: 'Trips', path: '/admin/trips' },
    { name: 'Invoices', label: 'Invoices', path: '/admin/invoices' },
    { name: 'OCR', label: 'OCR', path: '/admin/ocr' },
    { name: 'FleetDrivers', label: 'Fleet & Drivers', path: '/admin/fleet-drivers' },
    { name: 'Inbox', label: 'Inbox', path: '/admin/inbox' }
  ];

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const data = await bookingApi.getNotifications();
      if (data) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      // Silently handle if unauthenticated
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellDropdownRef.current && !bellDropdownRef.current.contains(event.target)) {
        setBellOpen(false);
      }
    };
    if (bellOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [bellOpen]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await bookingApi.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await bookingApi.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all read", err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      bookingApi.markNotificationRead(notif.id).catch(() => { });
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setBellOpen(false);
    navigate('/admin/orders');
    if (setCurrentPage) setCurrentPage('Orders');
  };

  const handleNavClick = (item) => {
    const itemName = typeof item === 'object' ? item.name : item;
    const itemPath = typeof item === 'object' && item.path ? item.path : (
      itemName === 'FleetDrivers' ? '/admin/fleet-drivers' :
      itemName === 'Inbox' ? '/admin/inbox' :
      `/admin/${itemName.toLowerCase()}`
    );
    if (setCurrentPage) setCurrentPage(itemName);
    navigate(itemPath);
    setMobileMenuOpen(false);
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffSecs = Math.floor((now - date) / 1000);
    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return `${Math.floor(diffSecs / 86400)}d ago`;
  };

  return (
    <nav className="bg-white shadow-md fixed w-full top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Brand */}
          <div className="flex items-center">
            <Link to="/admin" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="G3 Transport Logo" className="w-9 h-9 object-contain" />
              <div>
                <h1 className="text-lg font-bold text-green-800 leading-tight">G3 Transport</h1>
                <span className="text-[10px] text-green-700 font-semibold tracking-wider uppercase block">Unified Admin</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:block ml-8">
              <div className="flex items-baseline space-x-1">
                {navItems.map((item) => {
                  const isActive = currentPage === item.name || (item.name === 'Dashboard' && currentPage === 'Home') || (item.name === 'FleetDrivers' && (currentPage === 'Fleet' || currentPage === 'Drivers' || currentPage === 'FleetDrivers'));
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavClick(item)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${isActive
                        ? 'bg-green-700 text-white shadow-sm'
                        : 'text-gray-600 hover:text-green-700 hover:bg-green-50'
                        }`}
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Action Icons & User */}
          <div className="flex items-center space-x-3">
            {/* Booking Site Public Link */}
            <Link
              to="/"
              className="hidden sm:flex bg-green-50 text-green-800 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors items-center gap-1 shadow-xs"
              title="View Customer Booking Site"
            >
              <span>Booking Site</span>
              <span>↗</span>
            </Link>

            {/* Notification Bell with Dropdown */}
            <div className="relative" ref={bellDropdownRef}>
              <button
                onClick={() => {
                  setBellOpen(!bellOpen);
                  if (!bellOpen) fetchNotifications();
                }}
                className="relative p-2 text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                title="Admin Notifications"
                aria-label="Admin Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 max-h-[480px] overflow-hidden flex flex-col">
                  {/* Dropdown Header */}
                  <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-green-700 hover:text-green-900 font-semibold cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="overflow-y-auto divide-y divide-gray-50 flex-1">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-xs">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`px-4 py-3 hover:bg-green-50/50 cursor-pointer transition-colors flex items-start gap-3 ${n.is_read ? 'opacity-70 bg-white' : 'bg-green-50/20'
                            }`}
                        >
                          <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${n.type === 'new_booking' ? 'bg-amber-100 text-amber-700' :
                            n.type === 'assignment' ? 'bg-green-100 text-green-700' :
                              n.type === 'cancellation' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                            }`}>
                            <Package size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className={`text-xs ${n.is_read ? 'font-medium text-gray-700' : 'font-bold text-gray-900'} truncate`}>
                                {n.title}
                              </p>
                              <span className="text-[10px] text-gray-400 shrink-0">
                                {formatRelativeTime(n.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                              {n.message}
                            </p>
                            {n.order_id && (
                              <span className="inline-block mt-1 text-[10px] font-mono text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                                {n.order_id}
                              </span>
                            )}
                          </div>
                          {!n.is_read && (
                            <button
                              onClick={(e) => handleMarkAsRead(n.id, e)}
                              className="text-gray-400 hover:text-green-700 p-1 shrink-0 cursor-pointer"
                              title="Mark as read"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 text-center">
                    <button
                      onClick={() => {
                        setBellOpen(false);
                        navigate('/admin/orders');
                        if (setCurrentPage) setCurrentPage('Orders');
                      }}
                      className="text-xs text-green-700 hover:text-green-800 font-semibold cursor-pointer"
                    >
                      View all booking orders →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Admin User Info */}
            <div className="flex items-center space-x-2 pl-2 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-gray-900 leading-tight">
                  {adminUser?.name || 'Administrator'}
                </div>
                <div className="text-[10px] text-green-700 font-semibold">
                  {adminUser?.username || 'admin.g3'}
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  logoutAdmin();
                  navigate('/admin/login');
                }}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Logout Admin"
              >
                <LogOut size={18} />
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-600 hover:text-green-700"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPage === item.name || (item.name === 'FleetDrivers' && (currentPage === 'Fleet' || currentPage === 'Drivers' || currentPage === 'FleetDrivers'));
            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item)}
                className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold ${isActive
                  ? 'bg-green-700 text-white'
                  : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
                  }`}
              >
                {item.label}
              </button>
            );
          })}
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block w-full text-left px-3 py-2 text-sm font-semibold text-green-700 bg-green-50 rounded-lg"
          >
            Go to Public Booking Site ↗
          </Link>
        </div>
      )}
    </nav>
  );
}
