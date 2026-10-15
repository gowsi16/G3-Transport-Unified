import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Search, Filter, RefreshCw, X, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, AlertCircle, XCircle, User, Mail, Phone,
  Package, Calendar, FileText, Edit3, ExternalLink, Inbox
} from 'lucide-react';
import bookingApi from '../../services/bookingApi';

const STATUS_CONFIG = {
  'New': { color: 'bg-blue-100 text-blue-800', icon: <Inbox size={12} />, dot: 'bg-blue-500' },
  'In Progress': { color: 'bg-yellow-100 text-yellow-800', icon: <Clock size={12} />, dot: 'bg-yellow-500' },
  'Resolved': { color: 'bg-green-100 text-green-800', icon: <CheckCircle2 size={12} />, dot: 'bg-green-500' },
  'Closed': { color: 'bg-gray-100 text-gray-600', icon: <XCircle size={12} />, dot: 'bg-gray-400' }
};

const STATUSES = ['New', 'In Progress', 'Resolved', 'Closed'];

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['New'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
};

const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function SupportInboxPage({ showNotification }) {
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ New: 0, 'In Progress': 0, Resolved: 0, Closed: 0, total: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  // Edit state
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAssigned, setEditAssigned] = useState('');

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bookingApi.getContactMessages({
        search: search || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        page,
        limit: LIMIT
      });
      setMessages(data.messages || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, page]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await bookingApi.getContactStats();
      setStats(data);
    } catch (_) { }
  }, []);

  useEffect(() => {
    fetchMessages();
    fetchStats();
  }, [fetchMessages, fetchStats]);

  const openMessage = (msg) => {
    setSelected(msg);
    setEditStatus(msg.status);
    setEditNotes(msg.internal_notes || '');
    setEditAssigned(msg.assigned_to || '');
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await bookingApi.updateContactMessage(selected.id, {
        status: editStatus,
        internal_notes: editNotes,
        assigned_to: editAssigned
      });
      showNotification('Enquiry updated successfully.', 'success');
      // Update list item in place
      setMessages(prev => prev.map(m =>
        m.id === selected.id
          ? { ...m, status: editStatus, internal_notes: editNotes, assigned_to: editAssigned }
          : m
      ));
      setSelected(prev => ({ ...prev, status: editStatus, internal_notes: editNotes, assigned_to: editAssigned }));
      fetchStats();
    } catch (err) {
      showNotification(err.message || 'Failed to update.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MessageSquare size={24} className="text-green-700" />
            Inbox
          </h1>
          <p className="text-sm text-gray-500 mt-1">Customer enquiries and support requests</p>
        </div>
        <button
          onClick={() => { fetchMessages(); fetchStats(); }}
          className="flex items-center gap-2 text-green-700 hover:bg-green-50 border border-green-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => { setFilterStatus(filterStatus === s ? 'all' : s); setPage(1); }}
              className={`bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md ${filterStatus === s ? 'border-green-500 shadow-md' : 'border-gray-100'}`}
            >
              <div className={`text-2xl font-bold ${filterStatus === s ? 'text-green-700' : 'text-gray-800'}`}>
                {stats[s] || 0}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className="text-xs text-gray-500 font-medium">{s}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, phone, ticket ID, order ID..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-700"
        >
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
            <RefreshCw size={28} className="animate-spin text-green-400" />
            Loading enquiries...
          </div>
        ) : messages.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <Inbox size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No enquiries found</p>
            <p className="text-xs mt-1">Try adjusting filters or wait for new submissions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Ticket ID', 'From', 'Subject', 'Order ID', 'Date', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {messages.map(msg => (
                  <tr
                    key={msg.id}
                    className={`hover:bg-green-50/30 transition-colors cursor-pointer ${msg.status === 'New' ? 'font-medium' : ''}`}
                    onClick={() => openMessage(msg)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-green-800">{msg.ticket_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-800 truncate max-w-[140px]">{msg.full_name}</div>
                      <div className="text-xs text-gray-400 truncate max-w-[140px]">{msg.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-[150px] truncate">{msg.subject}</td>
                    <td className="px-4 py-3">
                      {msg.order_id ? (
                        <span className="font-mono text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded">{msg.order_id}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(msg.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={msg.status} /></td>
                    <td className="px-4 py-3">
                      <button className="text-green-700 hover:text-green-900 text-xs font-medium flex items-center gap-1">
                        <Edit3 size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-500">
              Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 py-1 text-xs font-medium text-gray-600">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Detail Drawer ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex justify-end"
            onClick={(e) => e.target === e.currentTarget && setSelected(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-xl bg-white h-full overflow-y-auto flex flex-col shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Enquiry Details</p>
                  <h3 className="text-lg font-bold text-gray-800 font-mono">{selected.ticket_id}</h3>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 flex-1 space-y-5">
                {/* Customer Info */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Customer Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <User size={14} className="text-green-600 shrink-0" />
                      <span className="truncate">{selected.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Mail size={14} className="text-green-600 shrink-0" />
                      <a href={`mailto:${selected.email}`} className="truncate hover:text-green-700">{selected.email}</a>
                    </div>
                    {selected.phone && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone size={14} className="text-green-600 shrink-0" />
                        <a href={`tel:${selected.phone}`} className="hover:text-green-700">{selected.phone}</a>
                      </div>
                    )}
                    {selected.order_id && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Package size={14} className="text-green-600 shrink-0" />
                        <span className="font-mono text-green-800">{selected.order_id}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Enquiry Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</h4>
                    <StatusBadge status={selected.status} />
                  </div>
                  <p className="text-sm font-medium text-gray-800">{selected.subject}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Calendar size={12} />
                    Submitted: {formatDate(selected.created_at)}
                    {selected.updated_at !== selected.created_at && (
                      <span>· Updated: {formatDate(selected.updated_at)}</span>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Message</h4>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100">
                    {selected.message}
                  </div>
                </div>

                {/* ─── Admin Controls ─────────────────────────────────────── */}
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Edit3 size={12} /> Admin Actions
                  </h4>

                  {/* Status */}
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Update Status</label>
                    <div className="flex flex-wrap gap-2">
                      {STATUSES.map(s => (
                        <button
                          key={s}
                          onClick={() => setEditStatus(s)}
                          className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${editStatus === s
                              ? 'bg-green-700 text-white border-green-700'
                              : 'text-gray-600 border-gray-200 hover:border-green-400'
                            }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Assigned To */}
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Assigned To</label>
                    <input
                      value={editAssigned}
                      onChange={e => setEditAssigned(e.target.value)}
                      placeholder="Admin name or email..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>

                  {/* Internal Notes */}
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Internal Notes</label>
                    <textarea
                      rows={4}
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      placeholder="Add internal notes (not visible to customer)..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                    />
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-300 text-white font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? 'Saving...' : <><CheckCircle2 size={16} /> Save Changes</>}
                  </button>

                  {/* Quick action: email reply */}
                  <a
                    href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)} [${selected.ticket_id}]`}
                    className="w-full flex items-center justify-center gap-2 border border-green-200 text-green-700 hover:bg-green-50 font-medium py-2.5 rounded-xl text-sm transition-all"
                  >
                    <Mail size={15} /> Reply via Email
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
