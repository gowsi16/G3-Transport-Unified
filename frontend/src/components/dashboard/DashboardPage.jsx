import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { 
    Chart as ChartJS, 
    registerables 
} from 'chart.js';
import { 
    Filter, Download, Printer, Moon, Sun, MapPin, AlertTriangle, AlertCircle,
    Package, Truck, CheckCircle2, Clock, Ban, RefreshCw, Check
} from 'lucide-react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import bookingApi from '../../services/bookingApi';

// Chart.js registration
ChartJS.register(...registerables);

const DashboardPage = ({ trips = [] }) => {
    const [darkMode, setDarkMode] = useState(false);
    const dashboardRef = useRef(null);

    // Active Dashboard Tab: 'bookings' | 'trips'
    const [dashboardView, setDashboardView] = useState('bookings');

    // =========================================================================
    // 1. BOOKING ANALYTICS STATE
    // =========================================================================
    const [bookingAnalytics, setBookingAnalytics] = useState(null);
    const [bookingLoading, setBookingLoading] = useState(true);
    const [bookingError, setBookingError] = useState("");
    const [analyticsDateRange, setAnalyticsDateRange] = useState("all");

    const fetchBookingAnalytics = async () => {
        setBookingLoading(true);
        setBookingError("");
        try {
            const data = await bookingApi.getAdminAnalytics();
            setBookingAnalytics(data);
        } catch (err) {
            console.error("Error fetching booking analytics:", err);
            setBookingError(err.message || "Failed to load booking analytics");
        } finally {
            setBookingLoading(false);
        }
    };

    useEffect(() => {
        fetchBookingAnalytics();
    }, []);

    // =========================================================================
    // 2. FLEET TRIPS STATE (Original Functionality)
    // =========================================================================
    const [selectedDriver, setSelectedDriver] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    const filteredTrips = useMemo(() => {
        return trips.filter(trip => {
            if (selectedDriver && trip.driverName !== selectedDriver) return false;
            if (selectedVehicle && trip.vehicle_no !== selectedVehicle) return false;
            if (selectedStatus === 'Profit' && trip.profit <= 0) return false;
            if (selectedStatus === 'Loss' && trip.profit > 0) return false;
            return true;
        });
    }, [trips, selectedDriver, selectedVehicle, selectedStatus]);

    const totalTrips = filteredTrips.length;
    const totalIncome = filteredTrips.reduce((sum, trip) => sum + (trip.revenue || 0), 0);
    const totalExpenses = filteredTrips.reduce((sum, trip) => sum + (trip.total_expense || 0), 0);
    const totalProfit = totalIncome - totalExpenses;
    
    let totalDieselUsed = 0;
    let totalToll = 0;
    let totalBatta = 0;
    let totalKM = 0;
    let kmTripCount = 0;
    
    filteredTrips.forEach(trip => {
        // Use actual recorded values only — no fabricated estimates
        const km = Number(trip.total_km) || 0;
        const fuel = Number(trip.fuel_litres) || 0;

        // Skip negative/impossible distances (flag as data issue)
        if (km > 0) { totalKM += km; kmTripCount++; }
        if (fuel > 0) totalDieselUsed += fuel;

        // Expense breakdown from expenseItems where available
        const expenses = Array.isArray(trip.expenseItems) ? trip.expenseItems : [];
        const dieselItem = expenses.find(e => e.description?.toLowerCase().includes('diesel'));
        const tollItem = expenses.find(e => e.description?.toLowerCase().includes('toll'));
        const bataItem = expenses.find(e => e.description?.toLowerCase().includes('batt') || e.description?.toLowerCase().includes('bata'));

        // Use specific expense fields if available, then expenseItems, never fabricate
        totalToll += Number(trip.toll_cost) || (tollItem ? Number(tollItem.amount) : 0);
        totalBatta += Number(trip.driver_wage) || (bataItem ? Number(bataItem.amount) : 0);
    });

    // Mileage = total km / total fuel litres (only if both are positive real data)
    const avgMileage = (totalDieselUsed > 0 && totalKM > 0)
        ? (totalKM / totalDieselUsed).toFixed(2)
        : null; // null = data unavailable, don't show a fabricated number

    const avgDieselCost = (totalKM > 0 && totalExpenses > 0)
        ? (totalExpenses * 0.5 / totalKM).toFixed(2)
        : null;
    const fuelCost = totalExpenses > 0 ? totalExpenses * 0.45 : 0;

    // Format Currency Helper
    const formatCurrency = (val) => '₹' + Number(val || 0).toLocaleString();

    // Export PDF
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    const exportPDF = async () => {
        const input = dashboardRef.current;
        if (!input) return;

        setIsExportingPDF(true);
        try {
            // Wait briefly to allow any chart animations to finish rendering
            await new Promise(r => setTimeout(r, 200));

            const canvas = await html2canvas(input, {
                scale: 1.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: darkMode ? '#111827' : '#F9FAFB',
                logging: false
            });

            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const printableWidth = pdfWidth - (margin * 2);
            const imgHeight = (canvas.height * printableWidth) / canvas.width;

            // Handle multi-page export cleanly so charts don't get clipped
            let heightLeft = imgHeight;
            let position = margin;

            pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight);
            heightLeft -= (pdfHeight - (margin * 2));

            while (heightLeft > 0) {
                position = heightLeft - imgHeight + margin;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            const today = new Date().toISOString().slice(0, 10);
            pdf.save(`G3-Transport-Dashboard-${today}.pdf`);
        } catch (error) {
            console.error('Dashboard PDF export failed:', error);
            alert('Failed to export PDF in dashboard. Please try again.');
        } finally {
            setIsExportingPDF(false);
        }
    };

    const printDashboard = () => window.print();

    // =========================================================================
    // 3. BOOKING CHARTS CONFIGURATION
    // =========================================================================
    const bookingSummary = bookingAnalytics?.summary || {
        totalBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        assignedOrders: 0,
        inTransitTrips: 0,
        completedTrips: 0,
        rejectedBookings: 0,
        cancelledBookings: 0,
        totalBookingValue: 0
    };

    // Chart A: Status Distribution
    const statusDistributionData = {
        labels: ['Pending', 'Confirmed', 'Assigned', 'In Transit', 'Completed', 'Cancelled', 'Rejected'],
        datasets: [{
            data: [
                bookingSummary.pendingBookings,
                bookingSummary.confirmedBookings,
                bookingSummary.assignedOrders,
                bookingSummary.inTransitTrips,
                bookingSummary.completedTrips,
                bookingSummary.cancelledBookings,
                bookingSummary.rejectedBookings
            ],
            backgroundColor: [
                '#F59E0B', // Amber (Pending)
                '#3B82F6', // Blue (Confirmed)
                '#8B5CF6', // Purple (Assigned)
                '#6366F1', // Indigo (In Transit)
                '#10B981', // Emerald (Completed)
                '#9CA3AF', // Gray (Cancelled)
                '#EF4444'  // Red (Rejected)
            ],
            borderWidth: 2,
            borderColor: darkMode ? '#1F2937' : '#FFFFFF'
        }]
    };

    // Chart B: Daily / Monthly Trends
    const trendsList = bookingAnalytics?.trends || [];
    const trendLabels = trendsList.length > 0 
        ? trendsList.map(t => t.day.slice(5)) 
        : ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];

    const trendsChartData = {
        labels: trendLabels,
        datasets: [
            {
                type: 'line',
                label: 'Orders Placed',
                data: trendsList.map(t => t.total_created || 0),
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderWidth: 3,
                tension: 0.35,
                fill: true,
                pointBackgroundColor: '#10B981',
                pointRadius: 4
            },
            {
                type: 'bar',
                label: 'Completed Trips',
                data: trendsList.map(t => t.completed_count || 0),
                backgroundColor: '#3B82F6',
                borderRadius: 4
            },
            {
                type: 'bar',
                label: 'Cancelled / Rejected',
                data: trendsList.map(t => t.cancelled_count || 0),
                backgroundColor: '#EF4444',
                borderRadius: 4
            }
        ]
    };

    // Chart C: Completed vs Cancelled Ratio
    const completionRatioData = {
        labels: ['Completed', 'Cancelled / Rejected', 'In Progress / Assigned'],
        datasets: [{
            data: [
                bookingSummary.completedTrips,
                bookingSummary.cancelledBookings + bookingSummary.rejectedBookings,
                bookingSummary.confirmedBookings + bookingSummary.assignedOrders + bookingSummary.inTransitTrips
            ],
            backgroundColor: ['#10B981', '#EF4444', '#3B82F6'],
            borderRadius: 6
        }]
    };

    // Chart D: Vehicle Utilization
    const vehicleUtil = bookingAnalytics?.vehicleUtilization || [];
    const vehicleUtilData = {
        labels: vehicleUtil.map(v => v.vehicle_no),
        datasets: [{
            label: 'Trip Assignments',
            data: vehicleUtil.map(v => v.trip_count),
            backgroundColor: '#10B981',
            borderRadius: 6
        }]
    };

    // Chart E: Driver Utilization
    const driverUtil = bookingAnalytics?.driverUtilization || [];
    const driverUtilData = {
        labels: driverUtil.map(d => d.driver_name),
        datasets: [{
            label: 'Driver Assigned Trips',
            data: driverUtil.map(d => d.trip_count),
            backgroundColor: '#8B5CF6',
            borderRadius: 6
        }]
    };

    // Dynamic Classes
    const bgClass = darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800';
    const cardBgClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
    const textMutedClass = darkMode ? 'text-gray-400' : 'text-gray-500';
    const borderClass = darkMode ? 'border-gray-700' : 'border-gray-200';

    return (
        <div className={`min-h-screen p-4 sm:p-6 lg:p-8 transition-colors duration-300 ${bgClass}`} ref={dashboardRef}>
            
            {/* Top Bar / Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight mb-1 text-green-800">
                        G3 Transport Admin Dashboard
                    </h1>
                    <p className={textMutedClass}>
                        Unified transportation metrics: real-time booking orders, fleet operations & P&L
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setDarkMode(!darkMode)} 
                        className={`p-2 rounded-full transition-colors cursor-pointer ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-200 text-gray-800'}`}
                        title="Toggle dark mode"
                    >
                        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button 
                        onClick={printDashboard} 
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg shadow-xs text-sm font-semibold transition-colors cursor-pointer"
                    >
                        <Printer size={16} /> Print
                    </button>
                    <button 
                        onClick={exportPDF} 
                        disabled={isExportingPDF}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white rounded-lg shadow-sm text-sm font-bold transition-colors cursor-pointer"
                    >
                        <Download size={16} className={isExportingPDF ? 'animate-bounce' : ''} /> 
                        {isExportingPDF ? 'Exporting PDF...' : 'Export PDF'}
                    </button>
                </div>
            </div>

            {/* Dashboard View Switcher Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setDashboardView('bookings')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 cursor-pointer ${
                        dashboardView === 'bookings'
                            ? 'bg-green-700 text-white shadow-sm'
                            : 'text-gray-600 hover:text-green-700 hover:bg-green-50'
                    }`}
                >
                    <Package size={16} />
                    <span>Booking Orders & Dispatch Analytics</span>
                </button>
                <button
                    onClick={() => setDashboardView('trips')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 cursor-pointer ${
                        dashboardView === 'trips'
                            ? 'bg-green-700 text-white shadow-sm'
                            : 'text-gray-600 hover:text-green-700 hover:bg-green-50'
                    }`}
                >
                    <Truck size={16} />
                    <span>Fleet Trips & Financials (P&L)</span>
                </button>
            </div>

            {/* ================================================================= */}
            {/* VIEW 1: BOOKING ORDERS & DISPATCH ANALYTICS                       */}
            {/* ================================================================= */}
            {dashboardView === 'bookings' && (
                <div className="space-y-6">
                    {/* Header Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-gray-200 shadow-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                <Filter size={16} className="text-green-700" /> Date Scope:
                            </span>
                            <select 
                                value={analyticsDateRange} 
                                onChange={e => setAnalyticsDateRange(e.target.value)}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-50 outline-none"
                            >
                                <option value="all">All Time (Live Database)</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="7d">Last 7 Days</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={fetchBookingAnalytics}
                                className="text-xs font-semibold px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                                <RefreshCw size={13} className={bookingLoading ? "animate-spin text-green-700" : ""} />
                                <span>Refresh Live Data</span>
                            </button>
                            <span className="text-xs font-bold text-green-800 bg-green-50 px-2.5 py-1 rounded-full border border-green-200 font-mono">
                                Total Value: ₹{(bookingSummary.totalBookingValue || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {bookingError && (
                        <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 text-sm flex items-center gap-2">
                            <AlertCircle size={18} />
                            <span>{bookingError}</span>
                        </div>
                    )}

                    {/* 8 Booking KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Bookings', val: bookingSummary.totalBookings, color: 'border-l-blue-500', icon: Package, iconColor: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Pending Review', val: bookingSummary.pendingBookings, color: 'border-l-amber-500', icon: Clock, iconColor: 'text-amber-600', bg: 'bg-amber-50' },
                            { label: 'Confirmed Orders', val: bookingSummary.confirmedBookings, color: 'border-l-sky-500', icon: Check, iconColor: 'text-sky-600', bg: 'bg-sky-50' },
                            { label: 'Assigned Orders', val: bookingSummary.assignedOrders, color: 'border-l-purple-500', icon: Truck, iconColor: 'text-purple-600', bg: 'bg-purple-50' },
                            { label: 'In-Transit Trips', val: bookingSummary.inTransitTrips, color: 'border-l-indigo-500', icon: MapPin, iconColor: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { label: 'Completed Trips', val: bookingSummary.completedTrips, color: 'border-l-emerald-500', icon: CheckCircle2, iconColor: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Cancelled Orders', val: bookingSummary.cancelledBookings, color: 'border-l-gray-400', icon: Ban, iconColor: 'text-gray-500', bg: 'bg-gray-100' },
                            { label: 'Rejected Orders', val: bookingSummary.rejectedBookings, color: 'border-l-red-500', icon: AlertCircle, iconColor: 'text-red-600', bg: 'bg-red-50' },
                        ].map((kpi, idx) => {
                            const IconComponent = kpi.icon;
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`p-4 rounded-xl shadow-xs border border-gray-200 border-l-4 ${kpi.color} ${cardBgClass} flex items-center justify-between`}
                                >
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{kpi.label}</p>
                                        <p className="text-2xl font-extrabold mt-1 text-gray-900 font-mono">
                                            {bookingLoading ? '...' : kpi.val}
                                        </p>
                                    </div>
                                    <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.iconColor}`}>
                                        <IconComponent size={20} />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Booking Charts Row 1: Distribution & Trends */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Status Distribution */}
                        <div className={`p-6 rounded-2xl shadow-sm border ${cardBgClass}`}>
                            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center justify-between">
                                <span>Booking Status Distribution</span>
                                <span className="text-xs font-normal text-gray-500 font-mono">Real database records</span>
                            </h3>
                            <div className="h-64 flex items-center justify-center">
                                <Doughnut 
                                    data={statusDistributionData} 
                                    options={{ 
                                        responsive: true, 
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'right' } }
                                    }} 
                                />
                            </div>
                        </div>

                        {/* Booking Trends */}
                        <div className={`p-6 rounded-2xl shadow-sm border ${cardBgClass}`}>
                            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center justify-between">
                                <span>Daily & Weekly Booking Trends</span>
                                <span className="text-xs font-normal text-gray-500">Orders created vs completed</span>
                            </h3>
                            <div className="h-64">
                                <Line 
                                    data={trendsChartData} 
                                    options={{ 
                                        responsive: true, 
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'top' } }
                                    }} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Booking Charts Row 2: Completion vs Cancelled & Fleet Utilization */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Completed vs Cancelled */}
                        <div className={`p-6 rounded-2xl shadow-sm border ${cardBgClass}`}>
                            <h3 className="text-base font-bold text-gray-900 mb-4">
                                Completed vs Cancelled
                            </h3>
                            <div className="h-60">
                                <Bar 
                                    data={completionRatioData} 
                                    options={{ 
                                        responsive: true, 
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } }
                                    }} 
                                />
                            </div>
                        </div>

                        {/* Vehicle Utilization */}
                        <div className={`p-6 rounded-2xl shadow-sm border ${cardBgClass}`}>
                            <h3 className="text-base font-bold text-gray-900 mb-4">
                                Vehicle Lorry Utilization
                            </h3>
                            <div className="h-60">
                                <Bar 
                                    data={vehicleUtilData} 
                                    options={{ 
                                        responsive: true, 
                                        maintainAspectRatio: false,
                                        indexAxis: 'y',
                                        plugins: { legend: { display: false } }
                                    }} 
                                />
                            </div>
                        </div>

                        {/* Driver Utilization */}
                        <div className={`p-6 rounded-2xl shadow-sm border ${cardBgClass}`}>
                            <h3 className="text-base font-bold text-gray-900 mb-4">
                                Driver Utilization
                            </h3>
                            <div className="h-60">
                                <Bar 
                                    data={driverUtilData} 
                                    options={{ 
                                        responsive: true, 
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } }
                                    }} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* VIEW 2: ORIGINAL FLEET & TRIPS P&L FINANCIALS                      */}
            {/* ================================================================= */}
            {dashboardView === 'trips' && (
                <div>
                    {/* Filters */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-2xl shadow-sm border mb-8 flex flex-wrap gap-4 items-center ${cardBgClass}`}>
                        <div className="flex items-center text-green-700 mr-2">
                            <Filter size={20} className="mr-2" /> 
                            <span className="font-semibold">Trip Filters</span>
                        </div>
                        <select className={`border rounded-lg px-3 py-2 text-sm outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50'}`} value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}>
                            <option value="">All Drivers</option>
                            {[...new Set(trips.map(t => t.driverName).filter(Boolean))].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select className={`border rounded-lg px-3 py-2 text-sm outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50'}`} value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}>
                            <option value="">All Vehicles</option>
                            {[...new Set(trips.map(t => t.vehicle_no).filter(Boolean))].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <select className={`border rounded-lg px-3 py-2 text-sm outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50'}`} value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                            <option value="">All Status</option>
                            <option value="Profit">Profit</option>
                            <option value="Loss">Loss</option>
                        </select>
                        <button onClick={() => { setSelectedDriver(''); setSelectedVehicle(''); setSelectedStatus(''); }} className="text-sm font-medium text-green-700 hover:text-green-800 transition-colors ml-2 cursor-pointer">Reset</button>
                    </motion.div>

                    {/* Top KPI Cards (Row 1) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        {[
                            { label: 'Total Income', val: formatCurrency(totalIncome), icon: '💰', color: 'border-blue-500', bg: 'bg-blue-100' },
                            { label: 'Total Expenses', val: formatCurrency(totalExpenses), icon: '💸', color: 'border-red-500', bg: 'bg-red-100' },
                            { label: 'Total Profit', val: formatCurrency(totalProfit), icon: '📈', color: 'border-green-500', bg: 'bg-green-100' },
                            { label: 'Total Trips', val: totalTrips, icon: '🚚', color: 'border-purple-500', bg: 'bg-purple-100' },
                        ].map((kpi, i) => (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} key={i} className={`p-6 rounded-2xl shadow-sm border-l-4 ${kpi.color} ${cardBgClass} hover:shadow-md transition-all duration-300 transform hover:-translate-y-1`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className={`text-sm font-semibold uppercase tracking-wider ${textMutedClass}`}>{kpi.label}</p>
                                        <p className="text-3xl font-extrabold mt-3">{kpi.val}</p>
                                    </div>
                                    <div className={`p-3 rounded-xl ${darkMode ? 'bg-opacity-20' : ''} ${kpi.bg}`}>
                                        <span className="text-2xl">{kpi.icon}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* KPI Cards (Row 2) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[
                            { label: 'Total Diesel Used', val: `${Math.round(totalDieselUsed)} L`, icon: '⛽' },
                            { label: 'Total Toll', val: formatCurrency(totalToll), icon: '🛣' },
                            { label: 'Driver Batta', val: formatCurrency(totalBatta), icon: '👨' },
                            { label: 'Total KM', val: `${Math.round(totalKM)} KM`, icon: '📍' },
                        ].map((kpi, i) => (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 + 0.2 }} key={i} className={`p-5 rounded-2xl shadow-sm border ${borderClass} ${darkMode ? 'bg-gray-800' : 'bg-gradient-to-br from-white to-gray-50'}`}>
                                <div className="flex items-center gap-4">
                                    <span className="text-3xl">{kpi.icon}</span>
                                    <div>
                                        <p className={`text-xs font-semibold uppercase tracking-wider ${textMutedClass}`}>{kpi.label}</p>
                                        <p className="text-xl font-bold mt-1">{kpi.val}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Fuel & Alerts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Fuel */}
                        <div className={`p-6 rounded-2xl shadow-sm border ${cardBgClass}`}>
                            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">⛽ Fuel Analytics</h2>
                            <div className="space-y-5">
                                <div className={`flex justify-between items-center pb-4 border-b ${borderClass}`}>
                                    <span className={textMutedClass}>Average Mileage</span>
                                    <span className="font-bold text-lg">{avgMileage} KM/L</span>
                                </div>
                                <div className={`flex justify-between items-center pb-4 border-b ${borderClass}`}>
                                    <span className={textMutedClass}>Avg Diesel Cost</span>
                                    <span className="font-bold text-lg">₹{avgDieselCost}/KM</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className={textMutedClass}>Total Fuel Cost</span>
                                    <span className="font-bold text-lg text-red-500">{formatCurrency(fuelCost)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Alerts */}
                        <div className={`p-6 rounded-2xl shadow-sm border ${cardBgClass}`}>
                            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-red-500"><AlertTriangle size={20} /> Alerts</h2>
                            <div className="space-y-4">
                                <div className={`flex items-start gap-3 p-3 rounded-lg ${darkMode ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'}`}>
                                    <span className="text-red-500 mt-0.5">🔴</span>
                                    <p className="text-sm font-medium">Trip 9 made a loss of ₹2,000.</p>
                                </div>
                                <div className={`flex items-start gap-3 p-3 rounded-lg ${darkMode ? 'bg-yellow-900 bg-opacity-20' : 'bg-yellow-50'}`}>
                                    <span className="text-yellow-500 mt-0.5">⚠</span>
                                    <p className="text-sm font-medium">Vehicle TN30XX1234 has low mileage (3.2 KM/L).</p>
                                </div>
                                <div className={`flex items-start gap-3 p-3 rounded-lg ${darkMode ? 'bg-yellow-900 bg-opacity-20' : 'bg-yellow-50'}`}>
                                    <span className="text-yellow-500 mt-0.5">⚠</span>
                                    <p className="text-sm font-medium">Diesel cost increased by 9% this month.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default DashboardPage;
