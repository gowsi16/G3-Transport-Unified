import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Search, X, Edit3, UserCheck, UserX, ChevronDown, ChevronUp,
  Phone, Mail, MapPin, CreditCard, Calendar, AlertTriangle, TrendingUp,
  Truck, BarChart2, CheckCircle2, RefreshCw, User, FileText, Award
} from 'lucide-react';
import bookingApi from '../../services/bookingApi';
import InputField from '../common/InputField';

const STATUS_COLORS = {
  Active: 'bg-green-100 text-green-800',
  Inactive: 'bg-gray-100 text-gray-600',
  'On Leave': 'bg-yellow-100 text-yellow-800',
  Terminated: 'bg-red-100 text-red-700'
};

const DRIVER_STATUSES = ['Active', 'Inactive', 'On Leave', 'Terminated'];

const EMPTY_FORM = {
  name: '', mobile: '', email: '', address: '', licence_no: '',
  licence_expiry: '', joining_date: '', status: 'Active',
  emergency_contact: '', notes: ''
};

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function DriverManagementPage({ showNotification }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverStats, setDriverStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [licenceAlerts, setLicenceAlerts] = useState([]);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bookingApi.getAllDrivers({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: search || undefined
      });
      setDrivers(data || []);
    } catch (err) {
      showNotification('Failed to load drivers.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  const fetchLicenceAlerts = useCallback(async () => {
    try {
      const data = await bookingApi.getDriverLicenceAlerts();
      setLicenceAlerts(data || []);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchDrivers();
    fetchLicenceAlerts();
  }, [fetchDrivers, fetchLicenceAlerts]);

  const openDriverStats = async (driver) => {
    setSelectedDriver(driver);
    setDriverStats(null);
    setStatsLoading(true);
    try {
      const data = await bookingApi.getDriverStats(driver.id);
      setDriverStats(data);
    } catch (_) {
      setDriverStats({ error: 'Failed to load stats.' });
    } finally {
      setStatsLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditDriver(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowForm(true);
  };

  const openEditForm = (driver) => {
    setEditDriver(driver);
    setForm({
      name: driver.name || '',
      mobile: driver.mobile || '',
      email: driver.email || '',
      address: driver.address || '',
      licence_no: driver.licence_no || '',
      licence_expiry: driver.licence_expiry || '',
      joining_date: driver.joining_date || '',
      status: driver.status || 'Active',
      emergency_contact: driver.emergency_contact || '',
      notes: driver.notes || ''
    });
    setErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required.';
    if (!form.mobile.trim()) errs.mobile = 'Mobile number is required.';
    else if (!/^\d{10,15}$/.test(form.mobile.replace(/\s+/g, ''))) errs.mobile = 'Enter a valid 10–15 digit mobile number.';
    if (!form.licence_no.trim()) errs.licence_no = 'Licence number is required.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (editDriver) {
        await bookingApi.updateDriver(editDriver.id, form);
        showNotification(`Driver ${form.name} updated successfully.`, 'success');
      } else {
        await bookingApi.createDriver(form);
        showNotification(`Driver ${form.name} registered successfully.`, 'success');
      }
      setShowForm(false);
      fetchDrivers();
    } catch (err) {
      showNotification(err.message || 'Operation failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (driver, newStatus) => {
    if (!window.confirm(`Change ${driver.name}'s status to "${newStatus}"?`)) return;
    try {
      await bookingApi.updateDriverStatus(driver.id, newStatus);
      showNotification(`${driver.name} status updated to ${newStatus}.`, 'success');
      fetchDrivers();
      if (selectedDriver?.id === driver.id) {
        setSelectedDriver(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      showNotification(err.message || 'Failed to update status.', 'error');
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const activeCount = drivers.filter(d => d.status === 'Active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={24} className="text-green-700" />
            Driver Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeCount} active drivers · {drivers.length} total registered
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md"
        >
          <Plus size={16} /> Add Driver
        </button>
      </div>

      {/* Licence Alerts */}
      {licenceAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2">
            <AlertTriangle size={15} /> Licence Expiry Alerts ({licenceAlerts.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {licenceAlerts.map(a => (
              <span key={a.id} className={`text-xs px-3 py-1 rounded-full font-medium ${
                a.alertLevel === 'expired' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {a.name}: {a.alertLevel === 'expired' ? `Expired ${Math.abs(a.daysLeft)}d ago` : `${a.daysLeft}d left`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, mobile, licence number..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div className="flex gap-2">
          {['all', ...DRIVER_STATUSES].map(s => (
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

      {/* Driver Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse h-44" />
          ))
        ) : drivers.length === 0 ? (
          <div className="col-span-3 bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No drivers found</p>
            <button onClick={openCreateForm} className="mt-3 text-green-700 text-sm font-medium hover:underline">
              Add your first driver →
            </button>
          </div>
        ) : drivers.map(driver => (
          <motion.div
            key={driver.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all"
          >
            {/* Driver Card Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <User size={20} className="text-green-700" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">{driver.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[driver.status] || STATUS_COLORS.Inactive}`}>
                    {driver.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEditForm(driver)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Edit">
                  <Edit3 size={14} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Driver Info */}
            <div className="space-y-1.5 text-xs text-gray-600 mb-4">
              {driver.mobile && (
                <div className="flex items-center gap-2">
                  <Phone size={11} className="text-green-600 shrink-0" />
                  <a href={`tel:${driver.mobile}`} className="hover:text-green-700">{driver.mobile}</a>
                </div>
              )}
              {driver.licence_no && (
                <div className="flex items-center gap-2">
                  <CreditCard size={11} className="text-green-600 shrink-0" />
                  <span>{driver.licence_no}</span>
                  {driver.licence_expiry && (
                    <span className="text-gray-400 ml-1">(exp: {driver.licence_expiry})</span>
                  )}
                </div>
              )}
              {driver.assigned_vehicle && (
                <div className="flex items-center gap-2">
                  <Truck size={11} className="text-green-600 shrink-0" />
                  <span>{driver.assigned_vehicle}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => openDriverStats(driver)}
                className="flex-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 font-medium py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
              >
                <BarChart2 size={12} /> View Stats
              </button>
              {driver.status === 'Active' ? (
                <button
                  onClick={() => handleStatusChange(driver, 'Inactive')}
                  className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <UserX size={12} /> Deactivate
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange(driver, 'Active')}
                  className="text-xs bg-green-50 hover:bg-green-100 text-green-700 font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <UserCheck size={12} /> Activate
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── Driver Stats Panel ───────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedDriver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex justify-end"
            onClick={e => e.target === e.currentTarget && setSelectedDriver(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-xl bg-white h-full overflow-y-auto flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <User size={20} className="text-green-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{selectedDriver.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selectedDriver.status]}`}>
                      {selectedDriver.status}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedDriver(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {statsLoading ? (
                  <div className="text-center py-10 text-gray-400"><RefreshCw size={24} className="animate-spin mx-auto mb-2" /> Loading stats...</div>
                ) : driverStats && !driverStats.error ? (
                  <>
                    {/* Performance Summary */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Total Trips', value: driverStats.stats.totalTrips, icon: <Truck size={14} /> },
                        { label: 'Completion Rate', value: `${driverStats.stats.completionRate}%`, icon: <CheckCircle2 size={14} /> },
                        { label: 'Total Revenue', value: fmt(driverStats.stats.totalRevenue), icon: <TrendingUp size={14} /> },
                        { label: 'Net Profit', value: fmt(driverStats.stats.totalProfit), icon: <Award size={14} />, highlight: driverStats.stats.totalProfit >= 0 },
                        { label: 'Avg Profit/Trip', value: fmt(driverStats.stats.avgProfit), icon: <BarChart2 size={14} /> },
                        { label: 'Total KM', value: `${Number(driverStats.stats.totalKm || 0).toLocaleString('en-IN')} km`, icon: <MapPin size={14} /> }
                      ].map(s => (
                        <div key={s.label} className={`rounded-xl p-4 border ${s.highlight === false ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            {s.icon} {s.label}
                          </div>
                          <div className={`font-bold text-sm ${s.highlight === false ? 'text-red-700' : 'text-gray-800'}`}>
                            {s.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Monthly Trend */}
                    {driverStats.monthlyTrend.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Monthly Performance</h4>
                        <div className="space-y-2">
                          {driverStats.monthlyTrend.map(m => (
                            <div key={m.month} className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 w-16 shrink-0">{m.month}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${Math.min(100, (m.profit / Math.max(...driverStats.monthlyTrend.map(x => Math.abs(x.profit || 1)))) * 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-semibold w-20 text-right ${m.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                {fmt(m.profit)}
                              </span>
                              <span className="text-xs text-gray-400 w-8">{m.trips}T</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Trips */}
                    {driverStats.recentTrips.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Trips</h4>
                        <div className="space-y-2">
                          {driverStats.recentTrips.slice(0, 5).map(t => (
                            <div key={t.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                              <span className="font-mono text-gray-500">{t.id}</span>
                              <span className="text-gray-700">{t.from_city} → {t.to_city}</span>
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
                  <div className="text-center py-10 text-gray-400">No trip data available for this driver.</div>
                )}

                {/* Driver Details */}
                {driverStats?.driver && (
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Contact & Licence</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                      {driverStats.driver.mobile && <div><span className="text-gray-400">Mobile:</span> {driverStats.driver.mobile}</div>}
                      {driverStats.driver.email && <div><span className="text-gray-400">Email:</span> {driverStats.driver.email}</div>}
                      {driverStats.driver.licence_no && <div><span className="text-gray-400">Licence:</span> {driverStats.driver.licence_no}</div>}
                      {driverStats.driver.licence_expiry && <div><span className="text-gray-400">Expiry:</span> {driverStats.driver.licence_expiry}</div>}
                      {driverStats.driver.joining_date && <div><span className="text-gray-400">Joined:</span> {driverStats.driver.joining_date}</div>}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => openEditForm(selectedDriver)}
                  className="w-full flex items-center justify-center gap-2 border border-green-200 text-green-700 hover:bg-green-50 font-medium py-2.5 rounded-xl text-sm transition-all"
                >
                  <Edit3 size={14} /> Edit Driver Details
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Add/Edit Driver Modal ──────────────────────────────────────────── */}
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
                  {editDriver ? `Edit: ${editDriver.name}` : 'Register New Driver'}
                </h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <InputField label="Full Name *" name="name" value={form.name} onChange={handleFormChange} placeholder="Driver's full name" />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <InputField label="Mobile Number *" name="mobile" type="tel" value={form.mobile} onChange={handleFormChange} placeholder="10-digit mobile" />
                    {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
                  </div>
                  <InputField label="Email (optional)" name="email" type="email" value={form.email} onChange={handleFormChange} placeholder="driver@example.com" />
                  <div>
                    <InputField label="Licence Number *" name="licence_no" value={form.licence_no} onChange={handleFormChange} placeholder="TN77 2020 0012345" />
                    {errors.licence_no && <p className="text-red-500 text-xs mt-1">{errors.licence_no}</p>}
                  </div>
                  <InputField label="Licence Expiry Date" name="licence_expiry" type="date" value={form.licence_expiry} onChange={handleFormChange} />
                  <InputField label="Joining Date" name="joining_date" type="date" value={form.joining_date} onChange={handleFormChange} />
                  <div className="sm:col-span-2">
                    <InputField label="Address (optional)" name="address" value={form.address} onChange={handleFormChange} placeholder="Driver's residential address" />
                  </div>
                  <InputField label="Emergency Contact" name="emergency_contact" value={form.emergency_contact} onChange={handleFormChange} placeholder="Name and phone number" />
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {DRIVER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Notes (optional)</label>
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleFormChange}
                      rows={3}
                      placeholder="Any additional notes about this driver..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-5 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold disabled:bg-green-300 flex items-center gap-2">
                    {saving ? 'Saving...' : editDriver ? 'Update Driver' : 'Register Driver'}
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
