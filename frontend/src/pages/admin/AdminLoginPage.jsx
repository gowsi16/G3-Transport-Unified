import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Lock, User, AlertCircle, ArrowLeft, Mail, RefreshCw, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function AdminLoginPage() {
  const [step, setStep] = useState(1); // 1 = Password verification, 2 = Email OTP verification
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');

  // Countdown timer for 5-minute OTP expiry
  const [timeLeft, setTimeLeft] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const { completeAdminLogin } = useAuth();
  const navigate = useNavigate();

  // Expiry countdown timer (5 mins = 300 secs)
  useEffect(() => {
    let timer;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setError('Verification OTP has expired. Please request a new code.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Verify username & password and trigger Email OTP
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid administrator credentials. Access restricted.');
      }

      setSessionToken(data.sessionToken);
      setMaskedEmail(data.maskedEmail || 'registered admin email');
      setTimeLeft(data.expiresInSeconds || 300);
      setResendCooldown(data.resendCooldownSeconds || 60);
      setStep(2);
      setInfoMessage(`Security OTP sent to registered admin email (${data.maskedEmail}).`);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification OTP code.');
      return;
    }

    if (timeLeft <= 0) {
      setError('Verification code has expired. Please click "Resend Code".');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, otp: otp.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Incorrect OTP code.');
      }

      // Complete login in AuthContext and localStorage
      completeAdminLogin(data.admin || { username: data.username, name: data.name }, data.token);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;

    setError('');
    setInfoMessage('');
    setResending(true);

    try {
      const res = await fetch('/api/admin/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend OTP.');
      }

      setTimeLeft(data.expiresInSeconds || 300);
      setResendCooldown(data.resendCooldownSeconds || 60);
      setOtp('');
      setInfoMessage(`A fresh 6-digit code was sent to ${data.maskedEmail}.`);
    } catch (err) {
      setError(err.message || 'Unable to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl shadow-2xl border border-green-100">
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
            {step === 1
              ? 'Step 1: Sign in with master administrator credentials.'
              : `Step 2: Two-factor verification code sent to ${maskedEmail}.`}
          </p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${step === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
            <span>1</span>
            <span>Password</span>
          </div>
          <div className="w-6 h-0.5 bg-gray-200" />
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${step === 2 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
            <span>2</span>
            <span>Email OTP</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}


        {step === 1 ? (
          /* STEP 1: Username & Password */
          <form className="mt-4 space-y-4" onSubmit={handlePasswordSubmit}>
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
                  placeholder="Enter administrator username"
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700 focus:outline-none cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-green-700 hover:bg-green-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck size={18} />
              <span>{loading ? 'Verifying Password...' : 'Verify Password & Request OTP'}</span>
            </button>
          </form>
        ) : (
          /* STEP 2: 6-Digit Email OTP Verification */
          <form className="mt-4 space-y-4" onSubmit={handleOtpSubmit}>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <Mail className="mx-auto text-green-700 mb-2" size={28} />
              <p className="text-xs text-gray-600 mb-1">Verification Code Sent To</p>
              <p className="text-sm font-bold text-gray-900 font-mono">{maskedEmail}</p>

              <div className="mt-3 flex items-center justify-center gap-4 text-xs">
                <span className={`font-semibold ${timeLeft < 60 ? 'text-red-600' : 'text-gray-600'}`}>
                  Expires in: <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500">Single-use (max 5 tries)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 text-center">Enter 6-Digit Verification OTP</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <KeyRound size={16} />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  autoFocus
                  required
                  className="w-full pl-9 pr-3 py-3 text-center text-xl font-bold tracking-[6px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6 || timeLeft === 0}
              className="w-full py-3 px-4 bg-green-700 hover:bg-green-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck size={18} />
              <span>{loading ? 'Verifying OTP...' : 'Verify & Enter Admin Portal'}</span>
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(''); setError(''); setInfoMessage(''); }}
                className="text-xs text-gray-500 hover:text-gray-800 font-semibold flex items-center gap-1"
              >
                <ArrowLeft size={12} />
                <span>Change username/password</span>
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || resending}
                className="text-xs text-green-700 hover:text-green-900 font-semibold disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
                <span>{resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend Code'}</span>
              </button>
            </div>
          </form>
        )}

        <div className="pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Protected endpoint with Gmail SMTP 2FA. Authorized dispatch personnel only.
          </p>
        </div>
      </div>
    </div>
  );
}
