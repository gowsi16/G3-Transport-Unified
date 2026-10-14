import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import bookingApi from '../../services/bookingApi';
import { Menu, X, Bell, Check, Package, AlertCircle } from 'lucide-react';

const Navbar = ({ currentPage, setCurrentPage }) => {
    const { user, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Notification State
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [bellOpen, setBellOpen] = useState(false);
    const bellDropdownRef = useRef(null);

    const navItems = [
        { name: 'Home', label: 'Home' },
        { name: 'Orders', label: 'Orders' },
        { name: 'Trips', label: 'Trips' },
        { name: 'Invoices', label: 'Invoices' },
        { name: 'OCR', label: 'OCR' },
        { name: 'Dashboard', label: 'Dashboard' },
        { name: 'Contact', label: 'Contact' }
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
            // Silently handle if unauthenticated or network issue
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 15000); // 15s poll
            return () => clearInterval(interval);
        }
    }, [user]);

    // Handle outside click to close notification dropdown
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
            bookingApi.markNotificationRead(notif.id).catch(() => {});
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setBellOpen(false);
        // Navigate directly to Orders page
        setCurrentPage('Orders');
    };

    const handleNavClick = (itemName) => {
        setCurrentPage(itemName);
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
        <nav className="bg-white shadow-lg fixed w-full top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Brand / Logo */}
                    <div className="flex items-center">
                        <div className="flex-shrink-0 cursor-pointer" onClick={() => handleNavClick('Home')}>
                            <h1 className="text-xl font-bold text-green-700 flex items-center gap-2">
                                G3 Transport
                            </h1>
                        </div>

                        {/* Desktop Navigation Links */}
                        <div className="hidden lg:block">
                            <div className="ml-8 flex items-baseline space-x-1.5">
                                {navItems.map((item) => (
                                    <button
                                        key={item.name}
                                        onClick={() => handleNavClick(item.name)}
                                        className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                                            currentPage === item.name
                                                ? 'bg-green-700 text-white shadow-sm'
                                                : 'text-gray-600 hover:text-green-700 hover:bg-green-50'
                                        }`}
                                    >
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Action Icons & User */}
                    <div className="flex items-center space-x-3">
                        {user && (
                            <div className="flex items-center space-x-3">
                                {/* Booking Site link */}
                                <a
                                    href="/"
                                    className="hidden sm:flex bg-green-50 text-green-700 hover:bg-green-100 border border-green-300 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors items-center gap-1 shadow-sm"
                                    title="View Customer Booking Site"
                                >
                                    <span>Booking Site</span>
                                    <span>↗</span>
                                </a>

                                {/* Notification Bell with Dropdown */}
                                <div className="relative" ref={bellDropdownRef}>
                                    <button
                                        onClick={() => {
                                            setBellOpen(!bellOpen);
                                            fetchNotifications();
                                        }}
                                        className="relative p-2 text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors cursor-pointer"
                                        title="Admin Notifications"
                                    >
                                        <Bell size={20} />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    {/* Notification Dropdown Panel */}
                                    {bellOpen && (
                                        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-slide-up">
                                            <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-gray-900">Notifications</span>
                                                    {unreadCount > 0 && (
                                                        <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full font-bold">
                                                            {unreadCount} new
                                                        </span>
                                                    )}
                                                </div>
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={handleMarkAllRead}
                                                        className="text-xs text-green-700 hover:text-green-900 font-semibold cursor-pointer"
                                                    >
                                                        Mark all read
                                                    </button>
                                                )}
                                            </div>

                                            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                                                {notifications.length === 0 ? (
                                                    <div className="p-6 text-center text-xs text-gray-400">
                                                        No notifications yet.
                                                    </div>
                                                ) : (
                                                    notifications.map(n => (
                                                        <div
                                                            key={n.id}
                                                            onClick={() => handleNotificationClick(n)}
                                                            className={`p-3.5 hover:bg-gray-50 transition-colors cursor-pointer flex items-start gap-3 ${
                                                                !n.is_read ? 'bg-green-50/50' : ''
                                                            }`}
                                                        >
                                                            <div className="mt-0.5">
                                                                {n.type === 'new_booking' ? (
                                                                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                                                                        <Package size={14} />
                                                                    </div>
                                                                ) : n.type === 'cancellation' ? (
                                                                    <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                                                                        <AlertCircle size={14} />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                                                                        <Bell size={14} />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex-1 text-left min-w-0">
                                                                <div className="flex items-center justify-between gap-1">
                                                                    <p className={`text-xs ${!n.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'} truncate`}>
                                                                        {n.title}
                                                                    </p>
                                                                    <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                                                                        {formatRelativeTime(n.created_at)}
                                                                    </span>
                                                                </div>

                                                                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                                                    {n.message}
                                                                </p>

                                                                {n.order_id && (
                                                                    <span className="inline-block mt-1 font-mono text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-bold">
                                                                        {n.order_id}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {!n.is_read && (
                                                                <button
                                                                    onClick={(e) => handleMarkAsRead(n.id, e)}
                                                                    title="Mark as read"
                                                                    className="p-1 text-gray-400 hover:text-green-700 transition-colors"
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 text-center text-[11px] text-gray-500">
                                                Click any order notification to view details in Orders
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* User Welcome & Logout */}
                                <span className="hidden md:inline-block text-sm text-gray-600">
                                    Welcome, <strong>{user.username}</strong>
                                </span>
                                <button
                                    onClick={logout}
                                    className="bg-red-500 text-white px-3.5 py-1.5 rounded-md text-sm font-medium hover:bg-red-600 transition-colors cursor-pointer shadow-sm"
                                >
                                    Logout
                                </button>
                            </div>
                        )}

                        {/* Mobile menu toggle button */}
                        <div className="lg:hidden flex items-center">
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
                            >
                                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu dropdown */}
            {mobileMenuOpen && (
                <div className="lg:hidden bg-white border-b border-gray-200 px-4 pt-2 pb-4 space-y-1 shadow-lg">
                    {navItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => handleNavClick(item.name)}
                            className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium flex items-center justify-between ${
                                currentPage === item.name
                                    ? 'bg-green-700 text-white font-bold'
                                    : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            <span>{item.label}</span>
                        </button>
                    ))}
                    {user && (
                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                            <a
                                href="/"
                                className="text-xs font-semibold text-green-700 hover:underline flex items-center gap-1"
                            >
                                <span>Booking Site</span>
                                <span>↗</span>
                            </a>
                            <button
                                onClick={logout}
                                className="text-xs font-bold text-red-600 hover:text-red-700 underline"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
};

export default Navbar;