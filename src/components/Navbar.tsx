import { Crown, Lock, ShieldCheck } from 'lucide-react';
import type { StaffSession } from '../lib/types';

export type AppView =
  | 'registry'
  | 'standings'
  | 'founders'
  | 'hierarchy'
  | 'totw'
  | 'admin';

interface NavbarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  session: StaffSession;
  brandName?: string;
}

export function Navbar({
  activeView,
  onSelectView,
  session,
  brandName = 'RFF² Registry',
}: NavbarProps) {
  const navItems: Array<{ id: AppView; label: string }> = [
    { id: 'registry', label: 'Registry' },
    { id: 'standings', label: 'Standings' },
    { id: 'hierarchy', label: 'Rank System' },
    { id: 'totw', label: 'Team of the Week' },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/85 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectView('registry')}
          className="font-display text-lg font-semibold tracking-tight text-white hover:text-ember transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-crimson"
        >
          {brandName}
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                  isActive
                    ? 'border-crimson text-white font-semibold'
                    : 'border-transparent text-fog hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action (Staff Login — No OAuth, No Support Desk) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => onSelectView('admin')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
              activeView === 'admin'
                ? 'bg-crimson text-white'
                : session.authenticated
                  ? session.role === 'founder'
                    ? 'bg-founder/15 border border-founder/45 text-founder hover:bg-founder/25'
                    : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-white/10 border border-white/15 text-white hover:bg-crimson hover:border-crimson'
            }`}
          >
            {session.authenticated ? (
              session.role === 'founder' ? (
                <>
                  <Crown className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Staff Portal · Founder</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    {session.role === 'admin' ? 'Staff Portal · Admin' : 'Staff Portal · Mod'}
                  </span>
                </>
              )
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Staff Login</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Strip */}
      <nav
        aria-label="Mobile navigation"
        className="flex md:hidden items-center gap-5 overflow-x-auto px-5 py-2.5 border-t border-white/5 text-xs font-medium"
      >
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`whitespace-nowrap shrink-0 transition-colors ${
                isActive ? 'text-ember font-semibold' : 'text-fog hover:text-white'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
