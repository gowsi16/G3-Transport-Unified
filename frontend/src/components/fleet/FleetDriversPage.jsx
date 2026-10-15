import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, Users, Plus, Search, X, Edit3, CheckCircle2, XCircle,
  AlertTriangle, BarChart2, RefreshCw, Calendar, Gauge, Fuel,
  Shield, Settings, MapPin, Package, TrendingUp, Phone, Mail,
  CreditCard, Award, UserCheck, UserX, Clock, ChevronRight
} from 'lucide-react';
import bookingApi from '../../services/bookingApi';
import InputField from '../common/InputField';

const VEHICLE_STATUS_COLORS = {
  Available: 'bg-green-100 text-green-800',
  Assigned: 'bg-blue-100 text-blue-800',
  'In Transit': 'bg-yellow-100 text-yellow-800',
  'Under Maintenance': 'bg-orange-100 text-orange-700',
  Retired: 'bg-gray-100 text-gray-500'
};

const DRIVER_STATUS_COLORS = {
  Active: 'bg-green-100 text-green-800',
  Inactive: 'bg-gray-100 text-gray-600',
  'On Leave': 'bg-yellow-100 text-yellow-800',
  Terminated: 'bg-red-100 text-red-700'
};

const VEHICLE_STATUSES = ['Available', 'Assigned', 'In Transit', 'Under Maintenance', 'Retired'];
const DRIVER_STATUSES = ['Active', 'Inactive', 'On Leave', 'Terminated'];

const EMPTY_VEHICLE_FORM = {
  vehicle_no: '', vehicle_type: '', capacity_kg: '', status: 'Available', driver: '',
  make: '', model: '', year: '', fuel_type: 'Diesel', registration_no: '',
  last_service_date: '', next_service_date: '', insurance_expiry: '', fc_expiry: '',
  notes: '', odometer_km: ''
};

const EMPTY_DRIVER_FORM = {
  name: '', mobile: '', email: '', address: '', licence_no: '',
  licence_expiry: '', joining_date: '', status: 'Active',
  emergency_contact: '', notes: ''
};

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function FleetDriversPage({ showNotification }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'fleet' | 'drivers' | 'performance'
  
  // Fleet State
  const [fleet, setFleet] = useState([]);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [fleetSearch, setFleetSearch] = useState('');
  const [fleetFilterStatus, setFleetFilterStatus] = useState('all');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE_FORM);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleDetails, setVehicleDetails] = useState(null);
  const [vehicleDetailsLoading, setVehicleDetailsLoading] = useState(false);
  const [fleetAlerts, setFleetAlerts] = useState([]);

  // Driver State
  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driverSearch, setDriverSearch] = useState('');
  const [driverFilterStatus, setDriverFilterStatus] = useState('all');
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [driverForm, setDriverForm] = useState(EMPTY_DRIVER_FORM);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverStats, setDriverStats] = useState(null);
  const [driverStatsLoading, setDriverStatsLoading] = useState(false);
  const [licenceAlerts, setLicenceAlerts] = useState([]);

  // Assignment Modal
  const [assignModal, setAssignModal] = useState({ open: false, vehicle: null, selectedDriver: '' });
  const [assigning, setAssigning] = useState(false);

  // Common UI State
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ── Fetch Functions ────────────────────────────────────────────────────────
  const fetchFleetData = useCallback(async () => {
    setFleetLoading(true);
    try {
      const data = await bookingApi.getFleet({
        status: fleetFilterStatus !== 'all' ? fleetFilterStatus : undefined,
        search: fleetSearch || undefined
      });
      setFleet(data || []);
    } catch (err) {
      if (showNotification) showNotification('Failed to load fleet vehicles.', 'error');
    } finally {
      setFleetLoading(false);
    }
  }, [fleetFilterStatus, fleetSearch, showNotification]);

  const fetchFleetAlerts = useCallback(async () => {
    try {
      const data = await bookingApi.getFleetAlerts();
      setFleetAlerts(data || []);
    } catch {
      // non-critical
    }
  }, []);

  const fetchDriverData = useCallback(async () => {
    setDriversLoading(true);
    try {
      const data = await bookingApi.getAllDrivers({
        status: driverFilterStatus !== 'all' ? driverFilterStatus : undefined,
        search: driverSearch || undefined
      });
      setDrivers(data || []);
    } catch (err) {
      if (showNotification) showNotification('Failed to load drivers.', 'error');
    } finally {
      setDriversLoading(false);
    }
  }, [driverFilterStatus, driverSearch, showNotification]);

  const fetchLicenceAlerts = useCallback(async () => {
    try {
      const data = await bookingApi.getDriverLicenceAlerts();
      setLicenceAlerts(data || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchFleetData();
    fetchFleetAlerts();
    fetchDriverData();
    fetchLicenceAlerts();
  }, [fetchFleetData, fetchFleetAlerts, fetchDriverData, fetchLicenceAlerts]);

  // ── Vehicle Details ────────────────────────────────────────────────────────
  const handleSelectVehicle = async (v) => {
    setSelectedVehicle(v);
    setVehicleDetails(null);
    setVehicleDetailsLoading(true);
    try {
      const data = await bookingApi.getVehicleDetails(v.id);
      setVehicleDetails(data);
    } catch {
      if (showNotification) showNotification('Failed to load vehicle details.', 'error');
    } finally {
      setVehicleDetailsLoading(false);
    }
  };

  // ── Driver Details ─────────────────────────────────────────────────────────
  const handleSelectDriver = async (d) => {
    setSelectedDriver(d);
    setDriverStats(null);
    setDriverStatsLoading(true);
    try {
      const data = await bookingApi.getDriverStats(d.id);
      setDriverStats(data);
    } catch {
      if (showNotification) showNotification('Failed to load driver performance.', 'error');
    } finally {
      setDriverStatsLoading(false);
    }
  };

  // ── Vehicle Form Handlers ──────────────────────────────────────────────────
  const openNewVehicle = () => {
    setEditVehicle(null);
    setVehicleForm(EMPTY_VEHICLE_FORM);
    setErrors({});
    setShowVehicleModal(true);
  };

  const openEditVehicle = (v, e) => {
    if (e) e.stopPropagation();
    setEditVehicle(v);
    setVehicleForm({
      vehicle_no: v.vehicle_no || '',
      vehicle_type: v.vehicle_type || '',
      capacity_kg: v.capacity_kg || '',
      status: v.status || 'Available',
      driver: v.driver || '',
      make: v.make || '',
      model: v.model || '',
      year: v.year || '',
      fuel_type: v.fuel_type || 'Diesel',
      registration_no: v.registration_no || '',
      last_service_date: v.last_service_date || '',
      next_service_date: v.next_service_date || '',
      insurance_expiry: v.insurance_expiry || '',
      fc_expiry: v.fc_expiry || '',
      notes: v.notes || '',
      odometer_km: v.odometer_km || ''
    });
    setErrors({});
    setShowVehicleModal(true);
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!vehicleForm.vehicle_no.trim()) errs.vehicle_no = 'Vehicle number is required.';
    if (!vehicleForm.vehicle_type.trim()) errs.vehicle_type = 'Vehicle type is required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      if (editVehicle) {
        await bookingApi.updateVehicle(editVehicle.id, vehicleForm);
        if (showNotification) showNotification(`Vehicle ${vehicleForm.vehicle_no} updated successfully!`, 'success');
      } else {
        await bookingApi.createVehicle(vehicleForm);
        if (showNotification) showNotification(`Vehicle ${vehicleForm.vehicle_no} registered successfully!`, 'success');
      }
      setShowVehicleModal(false);
      fetchFleetData();
      fetchFleetAlerts();
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── Driver Form Handlers ───────────────────────────────────────────────────
  const openNewDriver = () => {
    setEditDriver(null);
    setDriverForm(EMPTY_DRIVER_FORM);
    setErrors({});
    setShowDriverModal(true);
  };

  const openEditDriver = (d, e) => {
    if (e) e.stopPropagation();
    setEditDriver(d);
    setDriverForm({
      name: d.name || '',
      mobile: d.mobile || '',
      email: d.email || '',
      address: d.address || '',
      licence_no: d.licence_no || '',
      licence_expiry: d.licence_expiry || '',
      joining_date: d.joining_date || '',
      status: d.status || 'Active',
      emergency_contact: d.emergency_contact || '',
      notes: d.notes || ''
    });
    setErrors({});
    setShowDriverModal(true);
  };

  const handleSaveDriver = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!driverForm.name.trim()) errs.name = 'Driver full name is required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      if (editDriver) {
        await bookingApi.updateDriver(editDriver.id, driverForm);
        if (showNotification) showNotification(`Driver ${driverForm.name} updated successfully!`, 'success');
      } else {
        await bookingApi.createDriver(driverForm);
        if (showNotification) showNotification(`Driver ${driverForm.name} added successfully!`, 'success');
      }
      setShowDriverModal(false);
      fetchDriverData();
      fetchLicenceAlerts();
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── Assignment Flow ────────────────────────────────────────────────────────
  const openAssignModal = (vehicle, e) => {
    if (e) e.stopPropagation();
    setAssignModal({
      open: true,
      vehicle,
      selectedDriver: vehicle.driver || ''
    });
  };

  const handleConfirmAssignment = async () => {
    if (!assignModal.vehicle) return;
    setAssigning(true);
    try {
      await bookingApi.updateVehicle(assignModal.vehicle.id, {
        ...assignModal.vehicle,
        driver: assignModal.selectedDriver,
        status: assignModal.selectedDriver ? (assignModal.vehicle.status === 'Available' ? 'Assigned' : assignModal.vehicle.status) : 'Available'
      });
      if (showNotification) showNotification(`Assigned ${assignModal.selectedDriver || 'none'} to ${assignModal.vehicle.vehicle_no}`, 'success');
      setAssignModal({ open: false, vehicle: null, selectedDriver: '' });
      fetchFleetData();
    } catch (err) {
      if (showNotification) showNotification(err.message || 'Failed to update assignment.', 'error');
    } finally {
      setAssigning(false);
    }
  };

  // ── Computed Summary Metrics ───────────────────────────────────────────────
  const totalVehicles = fleet.length;
  const availableVehicles = fleet.filter(v => v.status === 'Available').length;
  const inTransitVehicles = fleet.filter(v => v.status === 'In Transit' || v.status === 'Assigned').length;
  const maintenanceVehicles = fleet.filter(v => v.status === 'Under Maintenance').length;

  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter(d => d.status === 'Active').length;
  const onLeaveDrivers = drivers.filter(d => d.status === 'On Leave').length;

  const totalAlertsCount = fleetAlerts.length + licenceAlerts.length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-green-100 text-green-800">
              Operations Hub
            </span>
            <span className="text-xs text-gray-500">• Unified Logistics Fleet</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Truck className="text-green-700" size={26} />
            <span>Fleet & Drivers</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Comprehensive vehicle management, driver profiles, lorry assignments, availability, and trip performance.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={openNewVehicle}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Vehicle</span>
          </button>
          <button
            onClick={openNewDriver}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Users size={16} />
            <span>Add Driver</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Total Fleet</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{totalVehicles}</p>
          <p className="text-[10px] text-green-700 mt-1 font-medium">{availableVehicles} Available now</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Active / In Transit</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{inTransitVehicles}</p>
          <p className="text-[10px] text-gray-500 mt-1">On active delivery jobs</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Maintenance</p>
          <p className="text-2xl font-black text-orange-600 mt-1">{maintenanceVehicles}</p>
          <p className="text-[10px] text-gray-500 mt-1">Service & fitness checks</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Total Drivers</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{totalDrivers}</p>
          <p className="text-[10px] text-green-700 mt-1 font-medium">{activeDrivers} Active</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Driver Leave</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{onLeaveDrivers}</p>
          <p className="text-[10px] text-gray-500 mt-1">Temporary off-duty</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Safety Alerts</p>
          <p className={`text-2xl font-black mt-1 ${totalAlertsCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{totalAlertsCount}</p>
          <p className="text-[10px] text-gray-500 mt-1">FC, Ins & Licence checks</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 gap-6">
        {[
          { id: 'overview', label: 'Overview & Availability', icon: <TrendingUp size={16} /> },
          { id: 'fleet', label: `Vehicles (${fleet.length})`, icon: <Truck size={16} /> },
          { id: 'drivers', label: `Drivers (${drivers.length})`, icon: <Users size={16} /> },
          { id: 'performance', label: 'Performance Analytics', icon: <BarChart2 size={16} /> }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === t.id
                ? 'border-green-700 text-green-800'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB 1: OVERVIEW & AVAILABILITY ─────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Alerts Banner if any */}
          {totalAlertsCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm mb-2">
                <AlertTriangle size={18} className="text-amber-700" />
                <span>Attention Required: Upcoming Expiries & Maintenance ({totalAlertsCount})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {fleetAlerts.slice(0, 3).map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-100">
                    <span className="font-semibold text-gray-800">{a.vehicle_no} ({a.alert})</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${a.daysLeft < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                      {a.daysLeft < 0 ? `Overdue by ${Math.abs(a.daysLeft)}d` : `${a.daysLeft}d left`}
                    </span>
                  </div>
                ))}
                {licenceAlerts.slice(0, 3).map((la, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-100">
                    <span className="font-semibold text-gray-800">{la.name} (Licence Expiry)</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${la.daysLeft < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                      {la.daysLeft < 0 ? `Expired ${Math.abs(la.daysLeft)}d ago` : `${la.daysLeft}d left`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Vehicle-Driver Matrix */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center justify-between">
              <span>Fleet Deployment Matrix</span>
              <span className="text-xs text-gray-500 font-normal">Direct driver-vehicle pairing</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-bold uppercase border-b border-gray-100">
                  <tr>
                    <th className="p-3">Vehicle</th>
                    <th className="p-3">Type & Payload</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Assigned Driver</th>
                    <th className="p-3">Odometer</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fleet.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-gray-900 font-mono text-sm">{v.vehicle_no}</div>
                        <div className="text-[10px] text-gray-400">{v.make || 'TATA'} {v.model || ''}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-800">{v.vehicle_type}</div>
                        <div className="text-[11px] text-gray-500">Max {Number(v.capacity_kg).toLocaleString()} kg</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${VEHICLE_STATUS_COLORS[v.status] || 'bg-gray-100 text-gray-700'}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {v.driver ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900">{v.driver}</span>
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-gray-700">
                        {v.odometer_km ? `${Number(v.odometer_km).toLocaleString()} km` : '—'}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={(e) => openAssignModal(v, e)}
                          className="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-800 rounded-lg text-xs font-semibold"
                        >
                          Pair Driver
                        </button>
                        <button
                          onClick={(e) => openEditVehicle(v, e)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: FLEET VEHICLES ─────────────────────────────────────────── */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search vehicle no, type, or driver..."
                value={fleetSearch}
                onChange={(e) => setFleetSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={fleetFilterStatus}
                onChange={(e) => setFleetFilterStatus(e.target.value)}
                className="text-xs border border-gray-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="all">All Vehicle Statuses</option>
                {VEHICLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <button
                onClick={openNewVehicle}
                className="px-3.5 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold shadow-sm whitespace-nowrap"
              >
                + Register Vehicle
              </button>
            </div>
          </div>

          {/* Grid of Vehicles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fleet.map(v => (
              <div
                key={v.id}
                onClick={() => handleSelectVehicle(v)}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-base font-black text-gray-900 tracking-wide">
                      {v.vehicle_no}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${VEHICLE_STATUS_COLORS[v.status] || 'bg-gray-100'}`}>
                      {v.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vehicle Type:</span>
                      <span className="font-semibold text-gray-800">{v.vehicle_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Payload:</span>
                      <span className="font-semibold text-gray-800">{Number(v.capacity_kg).toLocaleString()} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Assigned Driver:</span>
                      <span className="font-semibold text-green-800">{v.driver || 'None (Available)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Next Service:</span>
                      <span className="font-semibold text-gray-800">{v.next_service_date || 'Not scheduled'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <button
                    onClick={(e) => openAssignModal(v, e)}
                    className="font-bold text-green-700 hover:text-green-900"
                  >
                    Change Driver
                  </button>
                  <button
                    onClick={(e) => openEditVehicle(v, e)}
                    className="font-bold text-gray-600 hover:text-gray-900"
                  >
                    Edit Details ↗
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: DRIVER MANAGEMENT ──────────────────────────────────────── */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search driver name, phone, licence..."
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={driverFilterStatus}
                onChange={(e) => setDriverFilterStatus(e.target.value)}
                className="text-xs border border-gray-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="all">All Driver Statuses</option>
                {DRIVER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <button
                onClick={openNewDriver}
                className="px-3.5 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold shadow-sm whitespace-nowrap"
              >
                + Register Driver
              </button>
            </div>
          </div>

          {/* Grid of Drivers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map(d => (
              <div
                key={d.id}
                onClick={() => handleSelectDriver(d)}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-bold text-xs">
                        {d.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-gray-900 text-sm">{d.name}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${DRIVER_STATUS_COLORS[d.status] || 'bg-gray-100'}`}>
                      {d.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Phone size={13} className="text-gray-400" />
                      <span>{d.mobile || 'No mobile listed'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CreditCard size={13} className="text-gray-400" />
                      <span>Licence: <span className="font-mono">{d.licence_no || 'Pending'}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-gray-400" />
                      <span>Expiry: {d.licence_expiry || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Truck size={13} className="text-gray-400" />
                      <span>Assigned: <span className="font-semibold text-gray-800">{d.assigned_vehicle || 'Floating / Free'}</span></span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSelectDriver(d); }}
                    className="font-bold text-green-700 hover:text-green-900"
                  >
                    View Performance
                  </button>
                  <button
                    onClick={(e) => openEditDriver(d, e)}
                    className="font-bold text-gray-600 hover:text-gray-900"
                  >
                    Edit Profile ↗
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: PERFORMANCE ANALYTICS ──────────────────────────────────── */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lorry Performance Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                <Truck size={18} className="text-green-700" />
                <span>Lorry Utilization Summary</span>
              </h3>
              <div className="space-y-3">
                {fleet.map(v => (
                  <div key={v.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-gray-900 font-mono">{v.vehicle_no}</p>
                      <p className="text-[11px] text-gray-500">{v.vehicle_type} • Driver: {v.driver || 'None'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${VEHICLE_STATUS_COLORS[v.status]}`}>
                        {v.status}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1">{v.odometer_km ? `${Number(v.odometer_km).toLocaleString()} km` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Driver Performance Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                <Users size={18} className="text-green-700" />
                <span>Driver Rostering & Trip Readiness</span>
              </h3>
              <div className="space-y-3">
                {drivers.map(d => (
                  <div key={d.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-gray-900">{d.name}</p>
                      <p className="text-[11px] text-gray-500">{d.mobile || 'No contact'} • Licence: {d.licence_no || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${DRIVER_STATUS_COLORS[d.status]}`}>
                        {d.status}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1">{d.joining_date ? `Since ${d.joining_date}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DRIVER DETAILS MODAL ─────────────────────────────────────────── */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">{selectedDriver.name}</h3>
                <p className="text-xs text-gray-500">Driver Performance Profile</p>
              </div>
              <button onClick={() => setSelectedDriver(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={20} />
              </button>
            </div>

            {driverStatsLoading ? (
              <div className="py-8 text-center text-xs text-gray-500">Loading performance data...</div>
            ) : driverStats ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 p-3 rounded-xl text-center">
                    <p className="text-gray-400 uppercase text-[10px]">Total Trips</p>
                    <p className="text-lg font-bold text-gray-900">{driverStats.summary?.totalTrips || 0}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-xl text-center">
                    <p className="text-green-700 uppercase text-[10px]">Total Revenue</p>
                    <p className="text-lg font-bold text-green-800">{fmt(driverStats.summary?.totalRevenue || 0)}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl text-center">
                    <p className="text-blue-700 uppercase text-[10px]">Total Profit</p>
                    <p className="text-lg font-bold text-blue-800">{fmt(driverStats.summary?.totalProfit || 0)}</p>
                  </div>
                </div>

                <div className="space-y-1.5 p-3 bg-gray-50 rounded-xl">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mobile:</span>
                    <span className="font-semibold text-gray-800">{selectedDriver.mobile || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Licence Number:</span>
                    <span className="font-mono font-semibold text-gray-800">{selectedDriver.licence_no || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Licence Expiry:</span>
                    <span className="font-semibold text-gray-800">{selectedDriver.licence_expiry || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current Lorry:</span>
                    <span className="font-semibold text-green-800">{selectedDriver.assigned_vehicle || 'Floating / Available'}</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedDriver(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PAIR DRIVER MODAL ─────────────────────────────────────────────── */}
      {assignModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Pair Driver to Lorry</h3>
                <p className="text-xs text-gray-500">{assignModal.vehicle?.vehicle_no} ({assignModal.vehicle?.vehicle_type})</p>
              </div>
              <button onClick={() => setAssignModal({ open: false, vehicle: null, selectedDriver: '' })} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select Driver</label>
              <select
                value={assignModal.selectedDriver}
                onChange={(e) => setAssignModal(prev => ({ ...prev, selectedDriver: e.target.value }))}
                className="w-full p-2.5 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-600 bg-white"
              >
                <option value="">No Driver (Free / Unassigned)</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.name}>
                    {d.name} ({d.status} • {d.mobile || 'No phone'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAssignModal({ open: false, vehicle: null, selectedDriver: '' })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAssignment}
                disabled={assigning}
                className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {assigning ? 'Saving...' : 'Save Pairing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD/EDIT VEHICLE MODAL ────────────────────────────────────────── */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {editVehicle ? `Edit Lorry ${editVehicle.vehicle_no}` : 'Register New Lorry'}
              </h3>
              <button onClick={() => setShowVehicleModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="space-y-3">
              {errors.form && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl">{errors.form}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Vehicle Number"
                  value={vehicleForm.vehicle_no}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_no: e.target.value.toUpperCase() })}
                  placeholder="e.g. TN 77AY 3006"
                  required
                  error={errors.vehicle_no}
                />
                <InputField
                  label="Vehicle Type / Model"
                  value={vehicleForm.vehicle_type}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
                  placeholder="e.g. 10 Wheeler Closed Lorry"
                  required
                  error={errors.vehicle_type}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Payload Capacity (kg)"
                  type="number"
                  value={vehicleForm.capacity_kg}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, capacity_kg: e.target.value })}
                  placeholder="e.g. 8000"
                />
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={vehicleForm.status}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                    className="w-full p-2 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-600 bg-white"
                  >
                    {VEHICLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Driver</label>
                  <select
                    value={vehicleForm.driver}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, driver: e.target.value })}
                    className="w-full p-2 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-600 bg-white"
                  >
                    <option value="">None (Unassigned)</option>
                    {drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <InputField
                  label="Odometer (km)"
                  type="number"
                  value={vehicleForm.odometer_km}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, odometer_km: e.target.value })}
                  placeholder="e.g. 145000"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Next Service Date"
                  type="date"
                  value={vehicleForm.next_service_date}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, next_service_date: e.target.value })}
                />
                <InputField
                  label="Insurance Expiry"
                  type="date"
                  value={vehicleForm.insurance_expiry}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, insurance_expiry: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Lorry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD/EDIT DRIVER MODAL ─────────────────────────────────────────── */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {editDriver ? `Edit Driver ${editDriver.name}` : 'Register New Driver'}
              </h3>
              <button onClick={() => setShowDriverModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="space-y-3">
              {errors.form && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl">{errors.form}</div>
              )}

              <InputField
                label="Driver Full Name"
                value={driverForm.name}
                onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                placeholder="e.g. R. Senthil Kumar"
                required
                error={errors.name}
              />

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Mobile Number"
                  value={driverForm.mobile}
                  onChange={(e) => setDriverForm({ ...driverForm, mobile: e.target.value })}
                  placeholder="e.g. +91 98421 23456"
                />
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={driverForm.status}
                    onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value })}
                    className="w-full p-2 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-600 bg-white"
                  >
                    {DRIVER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Heavy Driving Licence No"
                  value={driverForm.licence_no}
                  onChange={(e) => setDriverForm({ ...driverForm, licence_no: e.target.value.toUpperCase() })}
                  placeholder="e.g. TN28 20120004567"
                />
                <InputField
                  label="Licence Expiry Date"
                  type="date"
                  value={driverForm.licence_expiry}
                  onChange={(e) => setDriverForm({ ...driverForm, licence_expiry: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Joining Date"
                  type="date"
                  value={driverForm.joining_date}
                  onChange={(e) => setDriverForm({ ...driverForm, joining_date: e.target.value })}
                />
                <InputField
                  label="Emergency Contact"
                  value={driverForm.emergency_contact}
                  onChange={(e) => setDriverForm({ ...driverForm, emergency_contact: e.target.value })}
                  placeholder="Name / Phone"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowDriverModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
