import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, LogOut } from 'lucide-react';

const fontDisplay = { fontFamily: "'Inter', sans-serif" };

export default function PublicNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { customerUser, isCustomer, logoutCustomer, isAdmin } = useAuth();

  const links = [
    { name: 'Home', path: '/' },
    { name: 'Book Lorry', path: '/book' },
    { name: 'Track Order', path: '/track' },
    { name: 'About Us', path: '/about' },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-green-100 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between flex-wrap gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <img src="/logo.png" alt="G3 Transport Logo" className="w-10 h-10 object-contain drop-shadow-sm group-hover:scale-105 transition-transform" />
          <div>
            <h1 style={fontDisplay} className="text-xl font-bold leading-tight text-green-800 tracking-tight">
              G3 Transport
            </h1>
            <span className="text-[11px] text-green-600 font-semibold uppercase tracking-wider block">Logistics & Freight</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-6 text-sm font-medium">
          {links.map(l => {
            let targetPath = l.path;
            if (!isCustomer && (l.path === '/book' || l.path === '/track')) {
              targetPath = `/login?redirect=${encodeURIComponent(l.path)}`;
            }

            return (
              <Link 
                key={l.path} 
                to={targetPath} 
                className={`transition-colors hover:text-green-700 ${
                  location.pathname === l.path 
                    ? 'text-green-800 font-bold border-b-2 border-green-700 pb-0.5' 
                    : 'text-slate-600'
                }`}
              >
                {l.name}
              </Link>
            );
          })}

          {/* Customer Auth State */}
          {isCustomer && customerUser ? (
            <div className="flex items-center gap-3 pl-3 border-l border-green-200">
              <div className="flex items-center gap-1.5 bg-green-50 text-green-800 border border-green-200 px-3 py-1.5 rounded-full text-xs font-semibold">
                <User size={13} className="text-green-700" />
                <span className="max-w-[120px] truncate">{customerUser.name || customerUser.phone}</span>
              </div>
              <button
                onClick={() => {
                  logoutCustomer();
                  navigate('/');
                }}
                title="Logout Customer"
                className="text-slate-400 hover:text-red-600 transition-colors p-1"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link 
              to="/login" 
              className={`transition-colors hover:text-green-700 font-semibold ${
                location.pathname === '/login' ? 'text-green-800 font-bold' : 'text-slate-700'
              }`}
            >
              Login
            </Link>
          )}

          {/* Admin Portal Gateway Button */}
          <Link 
            to="/admin" 
            className="text-xs px-3.5 py-1.5 bg-green-50 border border-green-600 text-green-800 hover:bg-green-700 hover:text-white rounded-full font-semibold transition-all duration-150 shadow-sm flex items-center gap-1"
          >
            <span>Admin Portal</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
