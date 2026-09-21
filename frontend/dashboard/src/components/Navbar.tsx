import React from 'react';
import { Compass, RefreshCw, Sliders, MessageSquare, LogOut, Settings } from 'lucide-react';
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
  onOpenSettings?: () => void;
  onResetToChat?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onRefresh,
  showAdminSidebar,
  onToggleAdminSidebar,
  onOpenSettings,
  onResetToChat,
  onLogout,
}) => {
  const getRoleBadgeColor = (role?: UserRole) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Analyst':
      case 'FactVerifier':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Executive':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Client':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
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
    <header className="h-16 bg-white/95 border-b border-slate-200 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-50 shadow-sm select-none">
      {/* Brand & Status */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onResetToChat}
          className="flex items-center space-x-2 text-left hover:opacity-90 transition group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 group-hover:border-indigo-400 transition">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-slate-900 text-lg">Discovery</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1 animate-pulse"></span>
                <span>Live Ingestion Active</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Autonomous Multimodal Intelligence & Fact Verification</p>
          </div>
        </button>
      </div>

      {/* Right Controls: Chat Reset, Admin Console Toggle, User Badge, Logout */}
      <div className="flex items-center space-x-3">
        
        {/* Reset to Unified Chat */}
        <button
          onClick={onResetToChat}
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition"
          title="Return to Unified AI Discovery Chat"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Discovery Chat</span>
        </button>

        {/* Direct Settings & User Rules Button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold transition shadow-sm cursor-pointer"
            title="Open User Profile & Custom Rules Engine"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Settings & Rules</span>
          </button>
        )}

        {/* User Account Info Chip */}
        {currentUser && (
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-indigo-300 rounded-xl px-3 py-1.5 shadow-sm transition text-left cursor-pointer"
            title="Open Account Settings"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-[11px] text-indigo-700">
              {getInitials(currentUser.name, currentUser.email)}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
                {currentUser.name || currentUser.email}
              </div>
              <div className="flex items-center space-x-1">
                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${getRoleBadgeColor(currentUser.role)}`}>
                  {currentUser.role}
                </span>
              </div>
            </div>
          </button>
        )}

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition"
          title="Refresh Active Pipelines"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition"
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

