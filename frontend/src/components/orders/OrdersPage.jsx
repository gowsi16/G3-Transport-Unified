import React, { useEffect, useState, useMemo } from 'react';
import { 
  Package, MapPin, Truck, RefreshCw, X, 
  Search, Users, AlertCircle, CheckCircle2, 
  Eye, Phone, Scale, Check, Ban, Clock
} from 'lucide-react';
import bookingApi from '../../services/bookingApi';

const fontDisplay = { fontFamily: "'Space Grotesk', sans-serif" };
const fontBody = { fontFamily: "'IBM Plex Sans', sans-serif" };

export default function OrdersPage({ showNotification, onNavigateToDashboard }) {
  // Data States
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [vehicleFilter, setVehicleFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [sortBy, setSortBy] = useState("date_desc"); // "date_desc" | "date_asc" | "status" | "price_desc"

  // Modals
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState(null);
  const [assignModalBooking, setAssignModalBooking] = useState(null);
  const [assignForm, setAssignForm] = useState({
    vehicle_no: "",
    driver: "",
    approved_fare: "",
    trip_duration_days: 1
  });
  const [statusModalBooking, setStatusModalBooking] = useState(null);
  const [newStatus, setNewStatus] = useState("In Transit");
  const [statusReason, setStatusReason] = useState("");

  // Load bookings, vehicles and drivers on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setActionError("");
    try {
      const [bookingsData, vehiclesData, driversData] = await Promise.all([
        bookingApi.getAdminBookings(),
        bookingApi.getAdminVehicles().catch(() => []),
        bookingApi.getAdminDrivers().catch(() => [])
      ]);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setDrivers(Array.isArray(driversData) ? driversData : []);
    } catch (err) {
      console.error("Error loading order data:", err);
      setActionError(err.message || "Failed to load orders from database.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      const data = await bookingApi.getAdminBookings();
      setBookings(Array.isArray(data) ? data : []);
      if (showNotification) showNotification('Orders refreshed from database', 'info');
    } catch (err) {
      setActionError("Failed to refresh bookings");
    }
  };

  // Open Assign Modal
  const openAssignModal = (booking) => {
    setActionError("");
    setActionSuccess("");
    
    // Choose sensible default vehicle
    const availableVehicle = vehicles.find(v => v.status === 'Available') || vehicles[0];
    const defaultVehicleNo = booking.assigned_vehicle || (availableVehicle ? availableVehicle.vehicle_no : "");
    const defaultDriver = booking.assigned_driver || (availableVehicle ? availableVehicle.driver : (drivers[0]?.name || ""));

    setAssignForm({
      vehicle_no: defaultVehicleNo,
      driver: defaultDriver,
      approved_fare: booking.approved_fare || booking.estimated_price || "",
      trip_duration_days: booking.trip_duration_days || 1
    });
    setAssignModalBooking(booking);
  };

  // Submit Driver & Lorry Assignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");

    if (!assignModalBooking) return;

    if (!assignForm.vehicle_no || !assignForm.driver) {
      setActionError("Please select both an assigned lorry and a driver.");
      return;
    }

    try {
      const res = await bookingApi.assignBooking(assignModalBooking.booking_id, {
        vehicle_no: assignForm.vehicle_no,
        driver: assignForm.driver,
        approved_fare: Number(assignForm.approved_fare) || assignModalBooking.estimated_price,
        trip_duration_days: Number(assignForm.trip_duration_days) || 1
      });

      const successMsg = res.message || `Lorry ${assignForm.vehicle_no} and Driver ${assignForm.driver} assigned successfully!`;
      setActionSuccess(successMsg);
      if (showNotification) showNotification(successMsg, 'success');

      // Refresh list and close modal
      setAssignModalBooking(null);
      await handleRefresh();
    } catch (err) {
      setActionError(err.message || "Failed to assign lorry and driver.");
    }
  };

  // Open Status Update Modal
  const openStatusModal = (booking, defaultNext = "In Transit") => {
    setActionError("");
    setActionSuccess("");
    setStatusModalBooking(booking);
    setNewStatus(defaultNext);
    setStatusReason("");
  };

  // Submit Status Change
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");

    if (!statusModalBooking) return;

    try {
      if (newStatus === 'Rejected') {
        await bookingApi.rejectBooking(statusModalBooking.booking_id, statusReason || 'Rejected by Admin');
      } else {
        await bookingApi.updateBookingStatus(statusModalBooking.booking_id, {
          status: newStatus,
          cancellation_reason: statusReason
        });
      }

      const msg = `Order ${statusModalBooking.booking_id} status updated to ${newStatus}.`;
      setActionSuccess(msg);
      if (showNotification) showNotification(msg, 'success');

      setStatusModalBooking(null);
      await handleRefresh();
    } catch (err) {
      setActionError(err.message || "Failed to update booking status.");
    }
  };

  // Filtered and Sorted Bookings
  const filteredBookings = useMemo(() => {
    return bookings
      .filter(b => {
        // Status filter
        if (statusFilter !== "All") {
          if (statusFilter === "Pending" && !b.booking_status?.toLowerCase().includes("pending")) return false;
          if (statusFilter === "Confirmed" && b.booking_status !== "Confirmed" && b.booking_status !== "Accepted") return false;
          if (statusFilter === "Assigned" && b.booking_status !== "Assigned" && (!b.assigned_vehicle || !b.assigned_driver)) return false;
          if (statusFilter === "In Transit" && b.booking_status !== "In Transit") return false;
          if (statusFilter === "Completed" && b.booking_status !== "Completed") return false;
          if (statusFilter === "Cancelled" && b.booking_status !== "Cancelled") return false;
          if (statusFilter === "Rejected" && b.booking_status !== "Rejected") return false;
        }

        // Vehicle filter
        if (vehicleFilter !== "All" && b.assigned_vehicle !== vehicleFilter) return false;

        // Date filter
        if (dateFilter && b.expected_date !== dateFilter) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchId = (b.booking_id || "").toLowerCase().includes(q);
          const matchCust = (b.customer_name || "").toLowerCase().includes(q);
          const matchPhone = (b.customer_phone || "").toLowerCase().includes(q);
          const matchPickup = (b.pickup || "").toLowerCase().includes(q);
          const matchDelivery = (b.delivery || "").toLowerCase().includes(q);
          const matchDriver = (b.assigned_driver || "").toLowerCase().includes(q);
          const matchVehicle = (b.assigned_vehicle || "").toLowerCase().includes(q);
          if (!matchId && !matchCust && !matchPhone && !matchPickup && !matchDelivery && !matchDriver && !matchVehicle) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date_desc") {
          return new Date(b.created_at || b.expected_date || 0) - new Date(a.created_at || a.expected_date || 0);
        }
        if (sortBy === "date_asc") {
          return new Date(a.created_at || a.expected_date || 0) - new Date(b.created_at || b.expected_date || 0);
        }
        if (sortBy === "price_desc") {
          return (b.approved_fare || b.estimated_price || 0) - (a.approved_fare || a.estimated_price || 0);
        }
        if (sortBy === "status") {
          return (a.booking_status || "").localeCompare(b.booking_status || "");
        }
        return 0;
      });
  }, [bookings, statusFilter, vehicleFilter, dateFilter, searchQuery, sortBy]);

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    const s = status || 'Pending';
    if (s.toLowerCase().includes('pending')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock size={12} className="text-amber-600" /> Pending
        </span>
      );
    }
    if (s === 'Confirmed' || s === 'Accepted') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
          <Check size={12} className="text-blue-600" /> Confirmed
        </span>
      );
    }
    if (s === 'Assigned') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <Truck size={12} className="text-purple-600" /> Assigned
        </span>
      );
    }
    if (s === 'In Transit') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 animate-pulse">
          <Truck size={12} className="text-indigo-600" /> In Transit
        </span>
      );
    }
    if (s === 'Completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={12} className="text-emerald-600" /> Completed
        </span>
      );
    }
    if (s === 'Cancelled' || s === 'Rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <Ban size={12} className="text-rose-600" /> {s}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
        {s}
      </span>
    );
  };

  // Selected vehicle object in assign form for payload checking
  const selectedVehicleObj = vehicles.find(v => v.vehicle_no === assignForm.vehicle_no);
  const isOverweight = assignModalBooking && selectedVehicleObj && 
    (Number(assignModalBooking.weight_kg) || 0) > selectedVehicleObj.capacity_kg;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <h1 style={fontDisplay} className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="text-green-700 w-8 h-8" />
            <span>Booking Orders Management</span>
          </h1>
          <p style={fontBody} className="text-sm text-gray-500 mt-1">
            Real customer consignments, fleet lorry assignment, driver dispatch & booking lifecycle
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-green-700" : "text-gray-500"} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Action Alerts */}
      {actionError && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{actionError}</div>
          <button onClick={() => setActionError("")} className="text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{actionSuccess}</div>
          <button onClick={() => setActionSuccess("")} className="text-emerald-400 hover:text-emerald-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="mt-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID (BK...), Customer, Phone, City..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending Review</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Assigned">Assigned</option>
            <option value="In Transit">In Transit</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* Vehicle Filter */}
        <div>
          <select
            value={vehicleFilter}
            onChange={e => setVehicleFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none"
          >
            <option value="All">All Vehicles</option>
            {vehicles.map(v => (
              <option key={v.vehicle_no} value={v.vehicle_no}>
                {v.vehicle_no} ({v.capacity_kg / 1000}T)
              </option>
            ))}
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="price_desc">Highest Fare</option>
            <option value="status">Group by Status</option>
          </select>
        </div>
      </div>

      {/* Orders Count and Active Filters Notice */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500 px-1">
        <span>Showing <strong>{filteredBookings.length}</strong> of <strong>{bookings.length}</strong> total customer orders</span>
        {(statusFilter !== "All" || vehicleFilter !== "All" || searchQuery) && (
          <button 
            onClick={() => {
              setStatusFilter("All");
              setVehicleFilter("All");
              setDateFilter("");
              setSearchQuery("");
            }}
            className="text-green-700 hover:underline font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Orders Table */}
      <div className="mt-4 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={28} className="animate-spin text-green-700" />
            <p className="text-sm font-medium">Loading orders from transport database...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Package size={36} className="mx-auto text-gray-400 mb-3" />
            <p className="text-base font-semibold text-gray-800">No matching orders found</p>
            <p className="text-xs text-gray-500 mt-1">Try adjusting your search terms or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3.5">Order ID & Date</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Route</th>
                  <th className="px-4 py-3.5">Load Details</th>
                  <th className="px-4 py-3.5">Assigned Lorry & Driver</th>
                  <th className="px-4 py-3.5">Fare</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBookings.map(b => (
                  <tr key={b.booking_id || b.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Order ID */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-green-800">
                        {b.booking_id}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {b.expected_date ? `Pickup: ${b.expected_date}` : (b.created_at || '').slice(0, 10)}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">
                        {b.customer_name || 'Customer'}
                      </div>
                      {b.customer_phone && (
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 font-mono">
                          <Phone size={11} className="text-gray-400" />
                          <span>{b.customer_phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Route */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 flex items-center gap-1.5">
                        <MapPin size={14} className="text-green-600 shrink-0" />
                        <span>{b.pickup} → {b.delivery}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {b.distance || 'Road Distance'}
                      </div>
                    </td>

                    {/* Load Details */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">
                        {b.weight_kg ? `${b.weight_kg} kg` : b.average_weight || 'Standard Load'}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {b.load_type || 'General Cargo'} {b.helpers > 0 ? `(${b.helpers} Helper)` : ''}
                      </div>
                    </td>

                    {/* Assigned Vehicle & Driver */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {b.assigned_vehicle && b.assigned_driver ? (
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                            <Truck size={14} className="text-green-700" />
                            <span>{b.assigned_vehicle}</span>
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            Driver: <strong>{b.assigned_driver}</strong>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded border border-amber-200 inline-block">
                          Unassigned
                        </div>
                      )}
                    </td>

                    {/* Fare */}
                    <td className="px-4 py-4 whitespace-nowrap font-mono">
                      <div className="font-bold text-gray-900">
                        ₹{(b.approved_fare || b.estimated_price || 0).toLocaleString()}
                      </div>
                      {b.approved_fare && b.approved_fare !== b.estimated_price && (
                        <div className="text-[11px] text-gray-400 line-through">
                          Est: ₹{(b.estimated_price || 0).toLocaleString()}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {renderStatusBadge(b.booking_status)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 whitespace-nowrap text-right space-x-1">
                      {/* View Details */}
                      <button
                        onClick={() => setSelectedBookingForDetails(b)}
                        className="p-1.5 text-gray-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors cursor-pointer"
                        title="View Full Order Details"
                      >
                        <Eye size={17} />
                      </button>

                      {/* Assign Lorry & Driver */}
                      <button
                        onClick={() => openAssignModal(b)}
                        className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                        title={b.assigned_vehicle ? "Change Assigned Driver & Lorry" : "Assign Driver & Lorry"}
                      >
                        <Truck size={17} />
                      </button>

                      {/* Quick Status Workflow */}
                      {b.booking_status?.toLowerCase().includes('pending') && (
                        <button
                          onClick={() => openAssignModal(b)}
                          className="px-2 py-1 text-xs font-bold bg-green-700 text-white rounded hover:bg-green-800 transition-colors shadow-xs cursor-pointer"
                        >
                          Assign
                        </button>
                      )}

                      {(b.booking_status === 'Confirmed' || b.booking_status === 'Assigned') && (
                        <button
                          onClick={() => openStatusModal(b, 'In Transit')}
                          className="px-2 py-1 text-xs font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                        >
                          Dispatch
                        </button>
                      )}

                      {b.booking_status === 'In Transit' && (
                        <button
                          onClick={() => openStatusModal(b, 'Completed')}
                          className="px-2 py-1 text-xs font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ASSIGN DRIVER & LORRY                                            */}
      {/* ========================================================================= */}
      {assignModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-slide-up border-t-4 border-green-700">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 style={fontDisplay} className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Truck className="text-green-700" size={20} />
                <span>Assign Driver & Lorry</span>
              </h3>
              <button 
                onClick={() => setAssignModalBooking(null)}
                className="text-gray-400 hover:text-gray-700 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Order Brief Summary */}
            <div className="my-4 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1">
              <div className="flex justify-between">
                <span>Order ID: <strong>{assignModalBooking.booking_id}</strong></span>
                <span>Scheduled Date: <strong>{assignModalBooking.expected_date}</strong></span>
              </div>
              <div className="flex justify-between">
                <span>Route: <strong>{assignModalBooking.pickup} → {assignModalBooking.delivery}</strong></span>
                <span>Estimated Fare: <strong>₹{(assignModalBooking.estimated_price || 0).toLocaleString()}</strong></span>
              </div>
              <div className="flex justify-between">
                <span>Load Weight: <strong className="text-green-800">{assignModalBooking.weight_kg || assignModalBooking.average_weight} kg</strong></span>
                <span>Goods: <strong>{assignModalBooking.load_type || 'Cargo'}</strong></span>
              </div>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              {/* Select Lorry */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Select Lorry / Vehicle *
                </label>
                <select
                  value={assignForm.vehicle_no}
                  onChange={e => {
                    const chosen = vehicles.find(v => v.vehicle_no === e.target.value);
                    setAssignForm({
                      ...assignForm,
                      vehicle_no: e.target.value,
                      driver: chosen?.driver || assignForm.driver
                    });
                  }}
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none font-medium"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.vehicle_no} value={v.vehicle_no}>
                      {v.vehicle_no} — {v.vehicle_type} (Capacity: {v.capacity_kg / 1000} Tons) [{v.status}]
                    </option>
                  ))}
                </select>

                {/* Overweight Capacity Alert */}
                {isOverweight && (
                  <p className="mt-1.5 text-xs text-red-600 font-semibold flex items-center gap-1">
                    <AlertCircle size={13} />
                    <span>Warning: Load exceeds this vehicle's safe payload limit of {selectedVehicleObj.capacity_kg} kg!</span>
                  </p>
                )}
              </div>

              {/* Select Driver */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Assigned Driver *
                </label>
                <select
                  value={assignForm.driver}
                  onChange={e => setAssignForm({ ...assignForm, driver: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none font-medium"
                >
                  <option value="">-- Select Registered Driver --</option>
                  {drivers.map(d => (
                    <option key={d.name || d.id} value={d.name}>
                      {d.name} ({d.status || 'Active'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Approved Fare & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Approved Fare (₹)
                  </label>
                  <input
                    type="number"
                    value={assignForm.approved_fare}
                    onChange={e => setAssignForm({ ...assignForm, approved_fare: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-600 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={assignForm.trip_duration_days}
                    onChange={e => setAssignForm({ ...assignForm, trip_duration_days: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-600 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAssignModalBooking(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isOverweight}
                  className="px-5 py-2 text-sm font-bold text-white bg-green-700 hover:bg-green-800 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Confirm & Dispatch Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ORDER DETAILS FULL VIEW                                          */}
      {/* ========================================================================= */}
      {selectedBookingForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 style={fontDisplay} className="text-xl font-bold text-gray-900">
                  Order Details: {selectedBookingForDetails.booking_id}
                </h3>
                {renderStatusBadge(selectedBookingForDetails.booking_status)}
              </div>
              <button 
                onClick={() => setSelectedBookingForDetails(null)}
                className="text-gray-400 hover:text-gray-700 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="my-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* Customer Info Card */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                  <Users size={16} className="text-green-700" /> Customer Information
                </h4>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <p><strong>Name:</strong> {selectedBookingForDetails.customer_name || 'N/A'}</p>
                  <p><strong>Phone:</strong> {selectedBookingForDetails.customer_phone || 'N/A'}</p>
                  <p><strong>Email:</strong> {selectedBookingForDetails.customer_email || 'N/A'}</p>
                  <p><strong>Registered Address:</strong> {selectedBookingForDetails.customer_registered_address || 'Salem, TN'}</p>
                </div>
              </div>

              {/* Transit & Route */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                  <MapPin size={16} className="text-green-700" /> Route & Schedule
                </h4>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <p><strong>Pickup City:</strong> {selectedBookingForDetails.pickup}</p>
                  <p><strong>Delivery City:</strong> {selectedBookingForDetails.delivery}</p>
                  <p><strong>Distance:</strong> {selectedBookingForDetails.distance || 'Calculated highway route'}</p>
                  <p><strong>Expected Date:</strong> {selectedBookingForDetails.expected_date || 'Standard'}</p>
                </div>
              </div>

              {/* Consignment Load Details */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                  <Scale size={16} className="text-green-700" /> Consignment & Load
                </h4>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <p><strong>Goods Type:</strong> {selectedBookingForDetails.load_type}</p>
                  <p><strong>Total Weight:</strong> {selectedBookingForDetails.weight_kg ? `${selectedBookingForDetails.weight_kg} kg` : selectedBookingForDetails.average_weight}</p>
                  <p><strong>Labor Helpers:</strong> {selectedBookingForDetails.helpers || 0} (₹{(selectedBookingForDetails.helper_charge || 0).toLocaleString()})</p>
                  <p><strong>Instructions:</strong> {selectedBookingForDetails.instructions || 'None provided'}</p>
                </div>
              </div>

              {/* Assignment & Pricing */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                  <Truck size={16} className="text-green-700" /> Assignment & Billing
                </h4>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <p><strong>Lorry:</strong> {selectedBookingForDetails.assigned_vehicle || 'Pending assignment'}</p>
                  <p><strong>Driver:</strong> {selectedBookingForDetails.assigned_driver || 'Pending assignment'}</p>
                  <p><strong>Estimated Price:</strong> ₹{(selectedBookingForDetails.estimated_price || 0).toLocaleString()}</p>
                  <p><strong>Approved Fare:</strong> <strong className="text-green-800">₹{(selectedBookingForDetails.approved_fare || selectedBookingForDetails.estimated_price || 0).toLocaleString()}</strong></p>
                </div>
              </div>
            </div>

            {selectedBookingForDetails.cancellation_reason && (
              <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-xs mb-4">
                <strong>Cancellation / Rejection Reason:</strong> {selectedBookingForDetails.cancellation_reason}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Created: {selectedBookingForDetails.created_at}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const b = selectedBookingForDetails;
                    setSelectedBookingForDetails(null);
                    openAssignModal(b);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-green-700 hover:bg-green-800 rounded-lg"
                >
                  Edit Driver / Lorry
                </button>
                <button
                  onClick={() => setSelectedBookingForDetails(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: STATUS CHANGE MODAL                                              */}
      {/* ========================================================================= */}
      {statusModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
            <h3 style={fontDisplay} className="text-lg font-bold text-gray-900 mb-2">
              Update Order Status: {statusModalBooking.booking_id}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Current Status: <strong>{statusModalBooking.booking_status}</strong>
            </p>

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Select New Status
                </label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg outline-none font-medium"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {(newStatus === 'Cancelled' || newStatus === 'Rejected') && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Reason
                  </label>
                  <textarea
                    rows={2}
                    value={statusReason}
                    onChange={e => setStatusReason(e.target.value)}
                    placeholder="Provide reason for cancellation/rejection..."
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none"
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStatusModalBooking(null)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-green-700 hover:bg-green-800 rounded-lg shadow-sm"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
