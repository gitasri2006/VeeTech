import React from 'react';
import { Compass, RefreshCw, Sliders, MessageSquare, LogOut, User as UserIcon } from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
  onRefresh: () => void;
  showAdminSidebar?: boolean;
  onToggleAdminSidebar?: () => void;
  onResetToChat?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onRefresh,
  showAdminSidebar,
  onToggleAdminSidebar,
  onResetToChat,
  onLogout,
}) => {
  const getRoleBadgeColor = (role?: UserRole) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Analyst':
      case 'FactVerifier':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Executive':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Client':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'DC';
  };

  return (
    <header className="h-16 bg-slate-900/90 border-b border-slate-800 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Brand & Status */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onResetToChat}
          className="flex items-center space-x-2 text-left hover:opacity-90 transition group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/60 transition">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-white text-lg">Discovery</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-1 animate-pulse"></span>
                <span>Live Ingestion Active</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Autonomous Multimodal Intelligence & Fact Verification</p>
          </div>
        </button>
      </div>

      {/* Right Controls: Chat Reset, Admin Console Toggle, User Badge, Logout */}
      <div className="flex items-center space-x-3">
        
        {/* Reset to Unified Chat */}
        <button
          onClick={onResetToChat}
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
          title="Return to Unified AI Discovery Chat"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Discovery Chat</span>
        </button>

        {/* Optional Admin Console Toggle */}
        {onToggleAdminSidebar && (
          <button
            onClick={onToggleAdminSidebar}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition ${
              showAdminSidebar
                ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Internal Diagnostics & System Telemetry Modules"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Internal Console</span>
          </button>
        )}

        {/* User Account Info Chip */}
        {currentUser && (
          <div className="flex items-center space-x-2.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center font-bold text-[11px] text-emerald-400">
              {getInitials(currentUser.name, currentUser.email)}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
                {currentUser.name || currentUser.email}
              </div>
              <div className="flex items-center space-x-1">
                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${getRoleBadgeColor(currentUser.role)}`}>
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          title="Refresh Active Pipelines"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition"
            title="Sign Out of Discovery"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        )}
      </div>
    </header>
  );
};

