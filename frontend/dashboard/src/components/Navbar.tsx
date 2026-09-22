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
        return 'bg-purple-100/90 text-purple-900 border-purple-200';
      case 'Analyst':
      case 'FactVerifier':
        return 'bg-orange-100/90 text-orange-900 border-orange-200';
      case 'Executive':
        return 'bg-amber-100/90 text-amber-900 border-amber-200';
      case 'Client':
        return 'bg-teal-100/90 text-teal-900 border-teal-200';
      default:
        return 'bg-emerald-100/90 text-emerald-900 border-emerald-200';
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
    <header className="h-16 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 border-b border-orange-700/40 text-white px-6 flex items-center justify-between sticky top-0 z-50 shadow-md select-none">
      {/* Brand & Status */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onResetToChat}
          className="flex items-center space-x-2.5 text-left hover:opacity-95 transition group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-white/30 transition shadow-sm">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="font-extrabold tracking-tight text-white text-lg drop-shadow-xs">Discovery</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-sm flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-1 animate-pulse"></span>
                <span>Live Ingestion Active</span>
              </span>
            </div>
            <p className="text-[11px] text-orange-100 font-medium">Autonomous Multimodal Intelligence & Fact Verification</p>
          </div>
        </button>
      </div>

      {/* Right Controls: Chat Reset, Settings, User Badge, Refresh, Logout */}
      <div className="flex items-center space-x-2.5">
        
        {/* Reset to Unified Chat */}
        <button
          onClick={onResetToChat}
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-semibold transition backdrop-blur-sm shadow-xs cursor-pointer"
          title="Return to Unified AI Discovery Chat"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Discovery Chat</span>
        </button>

        {/* Direct Settings & User Rules Button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-semibold transition backdrop-blur-sm shadow-xs cursor-pointer"
            title="Open User Profile & Custom Rules Engine"
          >
            <Settings className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Settings & Rules</span>
          </button>
        )}

        {/* User Account Info Chip */}
        {currentUser && (
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-2.5 bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl px-3 py-1.5 shadow-xs transition text-left cursor-pointer backdrop-blur-sm"
            title="Open Account Settings"
          >
            <div className="w-7 h-7 rounded-lg bg-white text-orange-600 flex items-center justify-center font-bold text-[11px] shadow-sm">
              {getInitials(currentUser.name, currentUser.email)}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-white truncate max-w-[140px] drop-shadow-xs">
                {currentUser.name || currentUser.email}
              </div>
              <div className="flex items-center space-x-1">
                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${getRoleBadgeColor(currentUser.role)}`}>
                  {currentUser.role}
                </span>
              </div>
            </div>
          </button>
        )}

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 transition backdrop-blur-sm shadow-xs cursor-pointer"
          title="Refresh Active Pipelines"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 text-xs font-semibold transition shadow-xs cursor-pointer"
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


