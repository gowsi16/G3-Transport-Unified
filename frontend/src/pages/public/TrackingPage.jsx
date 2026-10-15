import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Package, MapPin, Truck, Lock, ShieldCheck, ChevronRight, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const fontDisplay = { fontFamily: "'Space Grotesk', sans-serif" };
const fontBody = { fontFamily: "'IBM Plex Sans', sans-serif" };

export default function Tracking() {
  const [searchParams] = useSearchParams();
  const initialBookingId = searchParams.get('id') || '';

  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [bookingId, setBookingId] = useState(initialBookingId);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [myBookings, setMyBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Enforce immediate redirect to login if unauthenticated
  useEffect(() => {
    if (!isLoggedIn) {
      const trackingRedirect = initialBookingId ? `/track?id=${encodeURIComponent(initialBookingId)}` : '/track';
      navigate(`/login?redirect=${encodeURIComponent(trackingRedirect)}`, { replace: true });
    }
  }, [isLoggedIn, initialBookingId, navigate]);

  // Fetch customer's own bookings for quick selection
  useEffect(() => {
    if (isLoggedIn && user) {
      const token = localStorage.getItem('customer_token') || localStorage.getItem('g3_token');
      setLoadingBookings(true);
      fetch(`/api/bookings/my-bookings?customer_id=${encodeURIComponent(user.customer_id || '')}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (Array.isArray(data)) {
            setMyBookings(data);
            if (initialBookingId && !result) {
              const matched = data.find(b => b.booking_id === initialBookingId);
              if (matched) setResult(matched);
            }
          }
        })
        .catch(err => console.error("Error loading my bookings:", err))
        .finally(() => setLoadingBookings(false));
    }
  }, [isLoggedIn, user]);

  const handleTrack = async (e, idToTrack) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetId = idToTrack || bookingId;
    if (!targetId) return;

    setLoading(true);
    setError('');
    setResult(null);

    const token = localStorage.getItem('customer_token') || localStorage.getItem('g3_token');

    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(targetId.trim())}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Booking not found or access denied');
      }
      setResult(data);
      setBookingId(targetId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // If not authenticated, require login first
  if (!isLoggedIn) {
    const trackingRedirect = bookingId ? `/track?id=${encodeURIComponent(bookingId)}` : '/track';
    return (
      <div className="w-full max-w-xl mx-auto pt-8 pb-16 animate-slide-up">
        <div className="premium-card p-8 sm:p-12 text-center border-t-4 border-green-600 shadow-xl">
          <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-6 bg-blue-50 text-blue-700 shadow-inner border border-blue-200">
            <Lock size={38} />
          </div>

          <h2 style={fontDisplay} className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">
            Customer Login Required
          </h2>
          <p style={fontBody} className="text-slate-600 text-sm mb-8 max-w-md mx-auto leading-relaxed">
            For privacy and security, live consignment tracking and delivery status are restricted to authenticated account holders.
          </p>

          <div className="space-y-4">
            <Link
              to={`/login?redirect=${encodeURIComponent(trackingRedirect)}`}
              style={fontDisplay}
              className="w-full btn-primary px-8 py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
            >
              Log In to Track Shipment <ChevronRight size={18} />
            </Link>

            <div className="text-center pt-1">
              <Link
                to={`/login?redirect=${encodeURIComponent(trackingRedirect)}`}
                className="text-xs font-semibold text-slate-500 hover:text-green-700 transition-colors"
              >
                Don't have an account? <span className="text-green-700 font-bold underline">Create New Account</span>
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-green-600"/> Secure Data</span>
            <span className="flex items-center gap-1.5"><Truck size={14} className="text-blue-600"/> Real-time Lorry Status</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto animate-slide-up">
      <div className="mb-8 text-center">
        <h1 style={fontDisplay} className="text-4xl font-bold mb-4 text-slate-800 tracking-tight">Track Your Lorry</h1>
        <p style={fontBody} className="text-slate-500 text-lg">Enter your booking ID to see real-time updates on your shipment.</p>
      </div>

      <div className="premium-card p-8 sm:p-12 mb-12 border border-green-100">
        <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-4 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="e.g. BK202600001"
              value={bookingId}
              onChange={e => setBookingId(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-600 transition-all text-slate-800 font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={!bookingId || loading}
            style={fontDisplay}
            className={`px-8 py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              (!bookingId || loading) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'btn-primary'
            }`}
          >
            {loading ? "Tracking..." : "Track Now"}
          </button>
        </form>

        {/* Customer's recent bookings list for one-click tracking */}
        {myBookings.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock size={12} className="text-green-600" /> Your Recent Bookings:
            </p>
            <div className="flex flex-wrap gap-2">
              {myBookings.map((b) => (
                <button
                  key={b.booking_id}
                  type="button"
                  onClick={() => handleTrack(null, b.booking_id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    bookingId === b.booking_id
                      ? 'bg-green-100 border-green-500 text-green-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-green-400 hover:text-green-800'
                  }`}
                >
                  <span className="font-mono">{b.booking_id}</span>
                  <span className="text-[11px] text-slate-400">({b.pickup} → {b.delivery})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8 p-6 rounded-xl text-sm text-red-600 bg-red-50 border border-red-200 flex items-center gap-3 animate-slide-up">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center font-bold">!</div>
            <div>
              <p className="font-bold mb-1">Tracking Failed</p>
              <p>{error}. Please check the ID and try again.</p>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-10 pt-10 border-t border-slate-100 animate-slide-up">
            <div className="flex items-center justify-between mb-8">
              <h3 style={fontDisplay} className="text-2xl font-bold text-slate-800">Status: {result.booking_status}</h3>
              <div className={`text-xs uppercase font-bold tracking-widest px-3 py-1.5 border rounded-full flex items-center gap-2 ${
                result.booking_status === 'Accepted' ? 'border-green-300 bg-green-50 text-green-700' : 
                result.booking_status === 'Rejected' ? 'border-red-200 bg-red-50 text-red-600' :
                'border-amber-200 bg-amber-50 text-amber-700'
              }`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${
                  result.booking_status === 'Accepted' ? 'bg-green-600' : 
                  result.booking_status === 'Rejected' ? 'bg-red-500' :
                  'bg-amber-500'
                }`}></span>
                {result.booking_status}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4 p-5 rounded-xl bg-green-50/40 border border-green-100">
                <div className="p-3 bg-white rounded-lg shadow-sm text-green-700 border border-green-100"><MapPin size={24} /></div>
                <div>
                  <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Pickup Location</p>
                  <p style={fontBody} className="text-lg font-bold text-slate-800">{result.pickup}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-xl bg-green-50/40 border border-green-100">
                <div className="p-3 bg-white rounded-lg shadow-sm text-green-700 border border-green-100"><MapPin size={24} /></div>
                <div>
                  <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Delivery Location</p>
                  <p style={fontBody} className="text-lg font-bold text-slate-800">{result.delivery}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="p-3 bg-white rounded-lg shadow-sm text-slate-600"><Package size={24} /></div>
                <div>
                  <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Load Type</p>
                  <p style={fontBody} className="text-lg font-bold text-slate-800">{result.load_type}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="p-3 bg-white rounded-lg shadow-sm text-slate-600"><Truck size={24} /></div>
                <div>
                  <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Lorry Booked</p>
                  <p style={fontBody} className="text-lg font-bold text-slate-800">{result.vehicle_type || 'Standard Lorry'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="p-3 bg-white rounded-lg shadow-sm text-slate-600"><Truck size={24} /></div>
                <div>
                  <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Driver Assigned</p>
                  <p style={fontBody} className="text-lg font-bold text-slate-800">{result.assigned_driver || 'Pending Assignment'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="p-3 bg-white rounded-lg shadow-sm text-slate-600"><Package size={24} /></div>
                <div>
                  <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Expected Date</p>
                  <p style={fontBody} className="text-lg font-bold text-slate-800">{result.expected_date || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-xl bg-green-50/60 border border-green-200">
                <div className="p-3 bg-white rounded-lg shadow-sm text-green-700 font-mono font-bold text-xl border border-green-100">₹</div>
                <div>
                  <p className="text-xs uppercase font-bold text-green-800 tracking-wider mb-1">Total Transport Price</p>
                  <p style={fontBody} className="text-xl font-extrabold text-green-800">₹{(result.estimated_price || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
