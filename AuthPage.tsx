import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, UserCheck, Users } from 'lucide-react';
import { apiRequest, setStoredToken } from '../api';
import { TRANSIT_PICKUP_PRESETS } from '../data/hubs';
import type { AppRoute, UserProfile, UserRole } from '../types';

interface AuthPageProps {
  initialMode: 'login' | 'register';
  initialRole?: UserRole;
  onAuthSuccess: (user: UserProfile, redirectRoute: AppRoute) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode,
  initialRole = 'PASSENGER',
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [roleTab, setRoleTab] = useState<UserRole>(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setRoleTab(initialRole);
    setError('');
    setInfo('');
  }, [initialMode, initialRole]);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Shared Registration fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Passenger-specific
  const [age, setAge] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [accessibilityRequirements, setAccessibilityRequirements] = useState('');

  // Helper-specific
  const [languagesKnown, setLanguagesKnown] = useState('English, Kannada, Hindi');
  const [experienceYears, setExperienceYears] = useState('3');
  const [assistanceCategories, setAssistanceCategories] = useState(
    'Luggage Porter, Wheelchair Support'
  );
  const [currentLocation, setCurrentLocation] = useState(TRANSIT_PICKUP_PRESETS[2].label);

  // Forgot password fields
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [demoResetCodeHint, setDemoResetCodeHint] = useState('');

  const fillDemoAccount = (role: UserRole) => {
    setMode('login');
    setRoleTab(role);
    setError('');
    if (role === 'PASSENGER') {
      setEmail('ananya.rao@example.com');
      setPassword('Pass@123');
    } else {
      setEmail('lakshmi.helper@portoassist.in');
      setPassword('Helper@123');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: email, email, password, expectedRole: roleTab }),
      });
      setStoredToken(res.token);
      const nextRoute: AppRoute =
        res.user.role === 'HELPER' ? 'helper-dashboard' : 'passenger-dashboard';
      onAuthSuccess(res.user, nextRoute);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (roleTab === 'PASSENGER') {
        const res = await apiRequest<{ token: string; user: UserProfile }>(
          '/api/auth/register/passenger',
          {
            method: 'POST',
            body: JSON.stringify({
              fullName,
              email,
              phone,
              password,
              age: age ? Number(age) : null,
              preferredLanguage,
              accessibilityRequirements,
            }),
          }
        );
        setStoredToken(res.token);
        onAuthSuccess(res.user, 'passenger-dashboard');
      } else {
        const preset =
          TRANSIT_PICKUP_PRESETS.find((p) => p.label === currentLocation) ||
          TRANSIT_PICKUP_PRESETS[2];
        const res = await apiRequest<{ token: string; user: UserProfile }>(
          '/api/auth/register/helper',
          {
            method: 'POST',
            body: JSON.stringify({
              fullName,
              email,
              phone,
              password,
              languagesKnown,
              experienceYears: Number(experienceYears) || 1,
              assistanceCategories,
              currentLocation,
              lat: preset.lat,
              lng: preset.lng,
            }),
          }
        );
        setStoredToken(res.token);
        onAuthSuccess(res.user, 'helper-dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      const res = await apiRequest<{ message: string; demoResetCode: string }>(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ identifier: resetEmail, email: resetEmail }),
        }
      );
      setInfo(res.message);
      setDemoResetCodeHint(res.demoResetCode);
    } catch (err: any) {
      setError(err.message || 'Unable to generate reset code.');
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          identifier: resetEmail,
          email: resetEmail,
          resetCode,
          newPassword,
        }),
      });
      setInfo(res.message);
      setMode('login');
      setEmail(resetEmail);
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F5F8FC] py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto pa-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#0B2545]">
              {mode === 'login'
                ? 'Sign In to PortoAssist'
                : mode === 'register'
                ? 'Create Your Account'
                : 'Reset Password'}
            </h1>
            <p className="text-sm text-[#526174] mt-1">
              Dedicated portals for Passengers and Station Helpers
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-[#F5F8FC] border border-slate-200/80 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                mode === 'login' ? 'bg-white text-[#123B67] shadow-xs' : 'text-slate-600'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                mode === 'register' ? 'bg-white text-[#123B67] shadow-xs' : 'text-slate-600'
              }`}
            >
              Register
            </button>
          </div>
        </div>

        {/* Role Selector */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#EAF4FF]/60 rounded-lg border border-blue-100">
            <button
              type="button"
              onClick={() => setRoleTab('PASSENGER')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
                roleTab === 'PASSENGER'
                  ? 'bg-[#123B67] text-white'
                  : 'text-[#123B67] hover:bg-white/70'
              }`}
            >
              <Users className="w-4 h-4" />
              Passenger
            </button>
            <button
              type="button"
              onClick={() => setRoleTab('HELPER')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
                roleTab === 'HELPER'
                  ? 'bg-[#123B67] text-white'
                  : 'text-[#123B67] hover:bg-white/70'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Helper
            </button>
          </div>
        )}

        {/* Quick Demo Credentials Bar */}
        {mode === 'login' && (
          <div className="bg-[#F5F8FC] border border-slate-200/90 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-[#526174]">Quick-fill seeded account:</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('PASSENGER')}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:border-[#16A6A1] text-[#123B67] font-semibold"
              >
                Passenger (Ananya)
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('HELPER')}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:border-[#16A6A1] text-[#123B67] font-semibold"
              >
                Helper (Lakshmi)
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 font-medium">
            {error}
          </div>
        )}
        {info && (
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-sm text-teal-900 font-medium">
            {info}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address or Mobile Number
              </label>
              <input
                id="login-email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com or +91 98450 11223"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-[#16A6A1] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 pr-11 rounded-lg border border-slate-300 text-sm focus:border-[#16A6A1] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-[#123B67]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setError('');
                  setInfo('');
                }}
                className="text-[#16A6A1] hover:underline font-medium inline-flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#123B67] hover:bg-[#0B2545] text-white font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in...' : `Sign In as ${roleTab}`}
            </button>
          </form>
        )}

        {/* REGISTRATION FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98000 00000"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password (min 6 chars) *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-300 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>

            {roleTab === 'PASSENGER' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      min={12}
                      max={110}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 64"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Preferred Language
                    </label>
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
                    >
                      <option value="en">English</option>
                      <option value="kn">ಕನ್ನಡ (Kannada)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Accessibility Requirements
                  </label>
                  <input
                    type="text"
                    value={accessibilityRequirements}
                    onChange={(e) => setAccessibilityRequirements(e.target.value)}
                    placeholder="e.g. Wheelchair needed, elevator route, visual assistance"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Languages Known *
                    </label>
                    <input
                      type="text"
                      required
                      value={languagesKnown}
                      onChange={(e) => setLanguagesKnown(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Experience (Years) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={40}
                      required
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assistance Categories *
                  </label>
                  <input
                    type="text"
                    required
                    value={assistanceCategories}
                    onChange={(e) => setAssistanceCategories(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Transit Hub Location *
                  </label>
                  <select
                    value={currentLocation}
                    onChange={(e) => setCurrentLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    {TRANSIT_PICKUP_PRESETS.map((p) => (
                      <option key={p.id} value={p.label}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#16A6A1] hover:bg-[#11827E] text-white font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {loading ? 'Creating account...' : `Register as ${roleTab}`}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FLOW */}
        {mode === 'forgot' && (
          <div className="space-y-5">
            <form onSubmit={handleRequestReset} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Registered Email Address or Mobile Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your email or 10-digit mobile number"
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg bg-[#123B67] text-white text-xs font-semibold whitespace-nowrap"
                >
                  Send Code
                </button>
              </div>
              {demoResetCodeHint && (
                <p className="text-xs font-mono bg-[#EAF4FF] p-2.5 rounded border border-blue-200 text-[#123B67]">
                  Verification Code (Demo): <strong>{demoResetCodeHint}</strong>
                </p>
              )}
            </form>

            <form onSubmit={handleCompleteReset} className="space-y-3 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    6-Digit Reset Code
                  </label>
                  <input
                    type="text"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs font-semibold text-slate-600 hover:underline"
                >
                  Back to Login
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#16A6A1] text-white text-sm font-semibold"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
