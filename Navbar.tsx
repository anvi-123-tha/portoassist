import React, { useState } from 'react';
import { Globe, Menu, Mic, Type, X } from 'lucide-react';
import { I18N } from '../i18n';
import type { AppRoute, Language, UserProfile, UserRole } from '../types';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  route: AppRoute;
  onNavigate: (route: AppRoute, anchorId?: string) => void;
  onNavigateAuth: (mode: 'login' | 'register', role: UserRole) => void;
  user: UserProfile | null;
  onLogout: () => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  largeText: boolean;
  onToggleLargeText: () => void;
  onOpenVoice: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  route,
  onNavigate,
  onNavigateAuth,
  user,
  onLogout,
  language,
  onChangeLanguage,
  largeText,
  onToggleLargeText,
  onOpenVoice,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = I18N[language];

  const dashboardRoute: AppRoute =
    user?.role === 'HELPER' ? 'helper-dashboard' : 'passenger-dashboard';

  const handleNavClick = (targetRoute: AppRoute, anchorId?: string) => {
    setMobileOpen(false);
    onNavigate(targetRoute, anchorId);
  };

  const handleAuthNav = (mode: 'login' | 'register', role: UserRole) => {
    setMobileOpen(false);
    onNavigateAuth(mode, role);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(11,37,69,0.06)] transition-shadow duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Brand Logo */}
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A6A1] rounded-lg shrink-0"
            aria-label="PortoAssist Home"
          >
            <BrandLogo />
          </button>

          {/* Zone 2: Clean Single-Line Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#526174]"
          >
            <button
              type="button"
              onClick={() => handleNavClick('home')}
              className={`whitespace-nowrap shrink-0 hover:text-[#123B67] hover:underline underline-offset-4 transition-colors duration-150 ${
                route === 'home' ? 'text-[#123B67] font-semibold' : ''
              }`}
            >
              {t.nav.home}
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('home', 'about-section')}
              className="whitespace-nowrap shrink-0 hover:text-[#123B67] hover:underline underline-offset-4 transition-colors duration-150"
            >
              About Us
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('home', 'services-section')}
              className="whitespace-nowrap shrink-0 hover:text-[#123B67] hover:underline underline-offset-4 transition-colors duration-150"
            >
              {t.nav.services}
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('home', 'how-it-works-section')}
              className="whitespace-nowrap shrink-0 hover:text-[#123B67] hover:underline underline-offset-4 transition-colors duration-150"
            >
              {t.nav.howItWorks}
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('home', 'contact-section')}
              className="whitespace-nowrap shrink-0 hover:text-[#123B67] hover:underline underline-offset-4 transition-colors duration-150"
            >
              {t.nav.contact}
            </button>
          </nav>

          {/* Zone 3: Sign In / Dashboard Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <>
                {user.role === 'PASSENGER' && (
                  <button
                    type="button"
                    onClick={() => handleNavClick('track')}
                    className={`hidden sm:inline-flex whitespace-nowrap shrink-0 text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-150 ${
                      route === 'track'
                        ? 'text-[#123B67] bg-[#EAF4FF] font-semibold'
                        : 'text-[#526174] hover:text-[#123B67] hover:bg-[#F5F8FC]'
                    }`}
                  >
                    {t.nav.track}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleNavClick(dashboardRoute)}
                  className="hidden sm:inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-white bg-[#123B67] hover:bg-[#0B2545] rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 min-h-[40px] shadow-xs"
                >
                  {t.nav.dashboard}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleAuthNav('login', 'PASSENGER')}
                  className="hidden sm:inline-flex items-center justify-center px-3.5 py-2 text-sm font-semibold text-[#123B67] hover:text-[#0B2545] hover:bg-[#EAF4FF]/70 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[40px]"
                >
                  Passenger Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleAuthNav('login', 'HELPER')}
                  className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-[#123B67] hover:bg-[#0B2545] rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 min-h-[40px] shadow-xs"
                >
                  Helper Sign In
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-slate-200 text-[#123B67] hover:bg-[#F5F8FC] transition-colors"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1.5 shadow-lg">
            <button
              type="button"
              onClick={() => handleNavClick('home')}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#0B2545] hover:bg-[#EAF4FF]"
            >
              {t.nav.home}
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('home', 'about-section')}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#0B2545] hover:bg-[#EAF4FF]"
            >
              About Us
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('home', 'services-section')}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#0B2545] hover:bg-[#EAF4FF]"
            >
              {t.nav.services}
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('home', 'how-it-works-section')}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#0B2545] hover:bg-[#EAF4FF]"
            >
              {t.nav.howItWorks}
            </button>
            {user?.role !== 'HELPER' && (
              <button
                type="button"
                onClick={() => handleNavClick('book')}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#0B2545] hover:bg-[#EAF4FF]"
              >
                {t.nav.bookNow}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleNavClick('home', 'contact-section')}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#0B2545] hover:bg-[#EAF4FF]"
            >
              {t.nav.contact}
            </button>
            <div className="pt-3 mt-2 border-t border-slate-200 flex flex-wrap gap-2">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleNavClick(dashboardRoute)}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[#123B67] rounded-lg"
                  >
                    {t.nav.dashboard}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      onLogout();
                    }}
                    className="px-4 py-2.5 text-sm font-semibold text-[#0B2545] border border-slate-300 rounded-lg"
                  >
                    {t.nav.logout}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleAuthNav('login', 'PASSENGER')}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-[#123B67] bg-[#EAF4FF] rounded-lg"
                  >
                    Passenger Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAuthNav('login', 'HELPER')}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[#123B67] rounded-lg"
                  >
                    Helper Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Non-sticky Accessibility, Language & Voice Utility Bar */}
      <div className="bg-[#EAF4FF]/65 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-3 text-[#526174]">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#123B67]">
              <Globe className="w-4 h-4 text-[#16A6A1]" />
              <label htmlFor="lang-select" className="sr-only">
                Language
              </label>
              <select
                id="lang-select"
                value={language}
                onChange={(e) => onChangeLanguage(e.target.value as Language)}
                className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs font-medium text-[#123B67] min-h-[32px] focus:border-[#16A6A1] focus:outline-none"
              >
                <option value="en">English</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </span>

            <button
              type="button"
              onClick={onToggleLargeText}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors min-h-[32px] whitespace-nowrap shrink-0 ${
                largeText
                  ? 'bg-[#123B67] text-white border-[#123B67]'
                  : 'bg-white text-[#526174] border-slate-300 hover:bg-[#F5F8FC] hover:text-[#123B67]'
              }`}
              aria-pressed={largeText}
            >
              <Type className="w-3.5 h-3.5" />
              {largeText ? 'Standard Text' : 'Large Text'}
            </button>

            <button
              type="button"
              onClick={onOpenVoice}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#123B67] hover:bg-[#0B2545] text-white text-xs font-bold transition-colors min-h-[32px] whitespace-nowrap shrink-0"
              aria-label="Start Voice Assistant"
            >
              <Mic className="w-3.5 h-3.5 text-[#16A6A1]" />
              {t.voice.title}
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#526174]">
            {user ? (
              <>
                <span className="truncate max-w-[220px] font-medium text-[#0B2545]">
                  {user.full_name} · {user.role}
                </span>
                {user.role === 'PASSENGER' ? (
                  <button
                    type="button"
                    onClick={() => handleNavClick('book')}
                    className="font-semibold text-[#16A6A1] hover:underline whitespace-nowrap shrink-0"
                  >
                    {t.nav.bookNow}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleNavClick('helper-dashboard')}
                    className="font-semibold text-[#16A6A1] hover:underline whitespace-nowrap shrink-0"
                  >
                    {t.nav.dashboard}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onLogout}
                  className="font-medium text-[#526174] hover:text-red-700 hover:underline whitespace-nowrap shrink-0"
                >
                  {t.nav.logout}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleAuthNav('register', 'PASSENGER')}
                  className="font-semibold text-[#123B67] hover:underline whitespace-nowrap shrink-0"
                >
                  {t.nav.register}
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('book')}
                  className="font-semibold text-[#16A6A1] hover:underline whitespace-nowrap shrink-0"
                >
                  {t.nav.bookNow}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
