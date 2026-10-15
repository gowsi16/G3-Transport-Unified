import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, Plus, Search, X, Edit3, CheckCircle2, XCircle,
  AlertTriangle, BarChart2, RefreshCw, Calendar, Gauge, Fuel,
  Shield, Settings, MapPin, Package, TrendingUp
} from 'lucide-react';
import bookingApi from '../../services/bookingApi';
import InputField from '../common/InputField';

const STATUS_COLORS = {
  Available: 'bg-green-100 text-green-800',
  Assigned: 'bg-blue-100 text-blue-800',
  'In Transit': 'bg-yellow-100 text-yellow-800',
  'Under Maintenance': 'bg-orange-100 text-orange-700',
  Retired: 'bg-gray-100 text-gray-500'
};

const VEHICLE_STATUSES = ['Available', 'Assigned', 'In Transit', 'Under Maintenance', 'Retired'];

const EMPTY_FORM = {
  vehicle_no: '', vehicle_type: '', capacity_kg: '', status: 'Available', driver: '',
  make: '', model: '', year: '', fuel_type: 'Diesel', registration_no: '',
  last_service_date: '', next_service_date: '', insurance_expiry: '', fc_expiry: '',
  notes: '', odometer_km: ''
};

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function FleetManagementPage({ showNotification }) {
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleDetails, setVehicleDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const fetchFleet = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bookingApi.getFleet({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: search || undefined
      });
      setFleet(data || []);
    } catch (err) {
      showNotification('Failed to load fleet.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await bookingApi.getFleetAlerts();
      setAlerts(data || []);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchFleet();
    fetchAlerts();
  }, [fetchFleet, fetchAlerts]);

  const openVehicleDetails = async (vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleDetails(null);
    setDetailsLoading(true);
    try {
      const data = await bookingApi.getVehicleDetails(vehicle.id);
      setVehicleDetails(data);
    } catch (_) {
      setVehicleDetails({ error: 'Failed to load details.' });
    } finally {
      setDetailsLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditVehicle(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowForm(true);
  };

  const openEditForm = (vehicle) => {
    setEditVehicle(vehicle);
    setForm({
      vehicle_no: vehicle.vehicle_no || '',
      vehicle_type: vehicle.vehicle_type || '',
      capacity_kg: vehicle.capacity_kg || '',
      status: vehicle.status || 'Available',
      driver: vehicle.driver || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year || '',
      fuel_type: vehicle.fuel_type || 'Diesel',
      registration_no: vehicle.registration_no || '',
      last_service_date: vehicle.last_service_date || '',
      next_service_date: vehicle.next_service_date || '',
      insurance_expiry: vehicle.insurance_expiry || '',
      fc_expiry: vehicle.fc_expiry || '',
      notes: vehicle.notes || '',
      odometer_km: vehicle.odometer_km || ''
    });
    setErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!form.vehicle_no.trim()) errs.vehicle_no = 'Vehicle number is required.';
    if (!form.vehicle_type.trim()) errs.vehicle_type = 'Vehicle type is required.';
    if (!form.capacity_kg || isNaN(Number(form.capacity_kg)) || Number(form.capacity_kg) <= 0)
      errs.capacity_kg = 'Valid capacity in kg is required.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (editVehicle) {
        await bookingApi.updateVehicle(editVehicle.id, form);
        showNotification(`Vehicle ${form.vehicle_no} updated.`, 'success');
      } else {
        await bookingApi.createVehicle(form);
        showNotification(`Vehicle ${form.vehicle_no} registered.`, 'success');
      }
      setShowForm(false);
      fetchFleet();
      fetchAlerts();
    } catch (err) {
      showNotification(err.message || 'Operation failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const availableCount = fleet.filter(v => v.status === 'Available').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Truck size={24} className="text-green-700" />
            Fleet Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {availableCount} available · {fleet.length} total registered vehicles
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md"
        >
          <Plus size={16} /> Register Vehicle
        </button>
      </div>

      {/* Maintenance Alerts */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2">
            <AlertTriangle size={15} /> Maintenance Alerts ({alerts.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {alerts.map((a, i) => (
              <span key={i} className={`text-xs px-3 py-1 rounded-full font-medium ${
                a.level === 'expired' ? 'bg-red-100 text-red-700' :
                a.level === 'critical' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {a.vehicle_no} · {a.alert}: {a.daysLeft < 0 ? `Expired ${Math.abs(a.daysLeft)}d ago` : `${a.daysLeft}d left`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by vehicle number, type, driver..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', ...VEHICLE_STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all capitalize ${
                filterStatus === s
                  ? 'bg-green-700 text-white border-green-700'
                  : 'text-gray-600 border-gray-200 hover:border-green-300'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse h-48" />
          ))
        ) : fleet.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
            <Truck size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No vehicles found</p>
            <button onClick={openCreateForm} className="mt-3 text-green-700 text-sm font-medium hover:underline">
              Register your first vehicle →
            </button>
          </div>
        ) : fleet.map(vehicle => (
          <motion.div
            key={vehicle.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <Truck size={22} className="text-green-700" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{vehicle.vehicle_no}</h3>
                  <p className="text-xs text-gray-500">{vehicle.vehicle_type}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[vehicle.status] || STATUS_COLORS.Retired}`}>
                    {vehicle.status}
                  </span>
                </div>
              </div>
              <button onClick={() => openEditForm(vehicle)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Edit">
                <Edit3 size={14} className="text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4 text-xs text-gray-600">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="font-bold text-gray-800 text-sm">{Number(vehicle.capacity_kg || 0).toLocaleString()}</p>
                <p className="text-gray-400">Capacity (kg)</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="font-bold text-gray-800 text-sm">{vehicle.driver || '—'}</p>
                <p className="text-gray-400">Assigned Driver</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="font-bold text-gray-800 text-sm">{vehicle.fuel_type || 'Diesel'}</p>
                <p className="text-gray-400">Fuel Type</p>
              </div>
            </div>

            {/* Alerts for this vehicle */}
            {alerts.filter(a => a.vehicle_no === vehicle.vehicle_no).map((a, i) => (
              <div key={i} className={`text-xs px-3 py-1.5 rounded-lg mb-2 flex items-center gap-2 ${
                a.level === 'expired' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
              }`}>
                <AlertTriangle size={11} />
                {a.alert}: {a.daysLeft < 0 ? `Expired ${Math.abs(a.daysLeft)}d ago` : `Due in ${a.daysLeft} days`}
              </div>
            ))}

            <button
              onClick={() => openVehicleDetails(vehicle)}
              className="w-full text-xs bg-green-50 hover:bg-green-100 text-green-700 font-medium py-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
            >
              <BarChart2 size={12} /> View Trip History & Stats
            </button>
          </motion.div>
        ))}
      </div>

      {/* ─── Vehicle Details Panel ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedVehicle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex justify-end"
            onClick={e => e.target === e.currentTarget && setSelectedVehicle(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-xl bg-white h-full overflow-y-auto flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Vehicle Profile</p>
                  <h3 className="text-lg font-bold text-gray-800">{selectedVehicle.vehicle_no}</h3>
                  <p className="text-sm text-gray-500">{selectedVehicle.vehicle_type}</p>
                </div>
                <button onClick={() => setSelectedVehicle(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {detailsLoading ? (
                  <div className="text-center py-10 text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2" /> Loading...
                  </div>
                ) : vehicleDetails && !vehicleDetails.error ? (
                  <>
                    {/* Stats Summary */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Total Trips', value: vehicleDetails.stats.totalTrips, icon: <Truck size={14} /> },
                        { label: 'Total KM', value: `${Number(vehicleDetails.stats.totalKm || 0).toLocaleString('en-IN')} km`, icon: <Gauge size={14} /> },
                        { label: 'Total Revenue', value: fmt(vehicleDetails.stats.totalRevenue), icon: <TrendingUp size={14} /> },
                        { label: 'Net Profit', value: fmt(vehicleDetails.stats.totalProfit), icon: <BarChart2 size={14} /> },
                        { label: 'Total Fuel (L)', value: vehicleDetails.stats.totalFuelLitres > 0 ? `${vehicleDetails.stats.totalFuelLitres.toFixed(1)}L` : '—', icon: <Fuel size={14} /> },
                        { label: 'Avg Mileage', value: vehicleDetails.stats.avgMileage ? `${vehicleDetails.stats.avgMileage} km/L` : '—', icon: <Gauge size={14} /> }
                      ].map(s => (
                        <div key={s.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">{s.icon} {s.label}</div>
                          <div className="font-bold text-sm text-gray-800">{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Maintenance Details */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Settings size={12} /> Maintenance & Documents
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                        {[
                          { label: 'Last Service', val: vehicleDetails.vehicle?.last_service_date },
                          { label: 'Next Service', val: vehicleDetails.vehicle?.next_service_date, alert: vehicleDetails.stats.serviceDue },
                          { label: 'Insurance Expiry', val: vehicleDetails.vehicle?.insurance_expiry, alert: vehicleDetails.stats.insuranceAlert },
                          { label: 'FC Expiry', val: vehicleDetails.vehicle?.fc_expiry },
                          { label: 'Odometer', val: vehicleDetails.vehicle?.odometer_km ? `${vehicleDetails.vehicle.odometer_km} km` : null }
                        ].filter(i => i.val).map(item => (
                          <div key={item.label} className={`rounded-lg p-2 ${item.alert ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                            <p className="text-gray-400">{item.label}</p>
                            <p className={`font-medium ${item.alert ? 'text-amber-700' : 'text-gray-800'}`}>{item.val}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Trips */}
                    {vehicleDetails.recentTrips?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Trips</h4>
                        <div className="space-y-2">
                          {vehicleDetails.recentTrips.slice(0, 5).map(t => (
                            <div key={t.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                              <span className="font-mono text-gray-500 w-24 truncate">{t.id}</span>
                              <span className="text-gray-700 flex-1 text-center">{t.from_city} → {t.to_city}</span>
                              <span className={`font-semibold ${t.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                {fmt(t.profit)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-10 text-gray-400">No trip data available for this vehicle.</div>
                )}

                <button
                  onClick={() => openEditForm(selectedVehicle)}
                  className="w-full flex items-center justify-center gap-2 border border-green-200 text-green-700 hover:bg-green-50 font-medium py-2.5 rounded-xl text-sm transition-all"
                >
                  <Edit3 size={14} /> Edit Vehicle Details
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Add/Edit Vehicle Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editVehicle ? `Edit: ${editVehicle.vehicle_no}` : 'Register New Vehicle'}
                </h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <InputField
                      label="Vehicle Number *"
                      name="vehicle_no"
                      value={form.vehicle_no}
                      onChange={handleFormChange}
                      placeholder="TN 77AY 3006"
                      disabled={!!editVehicle}
                    />
                    {errors.vehicle_no && <p className="text-red-500 text-xs mt-1">{errors.vehicle_no}</p>}
                  </div>
                  <div>
                    <InputField label="Vehicle Type *" name="vehicle_type" value={form.vehicle_type} onChange={handleFormChange} placeholder="Heavy Commercial Lorry" />
                    {errors.vehicle_type && <p className="text-red-500 text-xs mt-1">{errors.vehicle_type}</p>}
                  </div>
                  <div>
                    <InputField label="Capacity (kg) *" name="capacity_kg" type="number" value={form.capacity_kg} onChange={handleFormChange} placeholder="8000" />
                    {errors.capacity_kg && <p className="text-red-500 text-xs mt-1">{errors.capacity_kg}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Status</label>
                    <select name="status" value={form.status} onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      {VEHICLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <InputField label="Assigned Driver" name="driver" value={form.driver} onChange={handleFormChange} placeholder="Driver name" />
                  <InputField label="Make" name="make" value={form.make} onChange={handleFormChange} placeholder="Ashok Leyland" />
                  <InputField label="Model" name="model" value={form.model} onChange={handleFormChange} placeholder="Boss 2518" />
                  <InputField label="Year" name="year" value={form.year} onChange={handleFormChange} placeholder="2020" />
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Fuel Type</label>
                    <select name="fuel_type" value={form.fuel_type} onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      {['Diesel', 'Petrol', 'CNG', 'Electric'].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <InputField label="Registration No." name="registration_no" value={form.registration_no} onChange={handleFormChange} placeholder="RC number" />
                  <InputField label="Last Service Date" name="last_service_date" type="date" value={form.last_service_date} onChange={handleFormChange} />
                  <InputField label="Next Service Date" name="next_service_date" type="date" value={form.next_service_date} onChange={handleFormChange} />
                  <InputField label="Insurance Expiry" name="insurance_expiry" type="date" value={form.insurance_expiry} onChange={handleFormChange} />
                  <InputField label="FC Expiry" name="fc_expiry" type="date" value={form.fc_expiry} onChange={handleFormChange} />
                  <InputField label="Current Odometer (km)" name="odometer_km" type="number" value={form.odometer_km} onChange={handleFormChange} placeholder="0" />
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
                    <textarea name="notes" value={form.notes} onChange={handleFormChange} rows={2}
                      placeholder="Additional notes about this vehicle..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold disabled:bg-green-300 flex items-center gap-2">
                    {saving ? 'Saving...' : editVehicle ? 'Update Vehicle' : 'Register Vehicle'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
