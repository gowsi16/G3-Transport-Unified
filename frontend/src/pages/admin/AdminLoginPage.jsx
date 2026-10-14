import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Lock, User, AlertCircle, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('admin.g3');
  const [password, setPassword] = useState('gggbrothers');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await loginAdmin(username, password);
      if (success) {
        navigate('/admin');
      } else {
        setError('Invalid administrator credentials. Access restricted.');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-2xl border border-green-100">
        <div>
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-green-700 hover:text-green-900 font-semibold mb-4">
            <ArrowLeft size={14} />
            <span>Back to Public Site</span>
          </Link>
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/logo.png" alt="G3 Logo" className="w-12 h-12 object-contain" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">G3 Transport</h1>
          </div>
          <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-green-700">
            Unified Admin Portal
          </h2>
          <p className="mt-1 text-center text-xs text-gray-500">
            Sign in to manage orders, driver assignments, trips, and analytics.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Administrator Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <User size={16} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin.g3"
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock size={16} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-green-700 hover:bg-green-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck size={18} />
            <span>{loading ? 'Authenticating...' : 'Sign In to Admin Portal'}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Protected endpoint. Authorized logistics dispatch team only.
          </p>
        </div>
      </div>
    </div>
  );
}
