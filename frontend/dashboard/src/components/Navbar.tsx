import React from 'react';
import { Compass, Bell, RefreshCw, Radio, UserCheck } from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRole, onRoleChange, onRefresh }) => {
  return (
    <header className="h-16 bg-slate-900/90 border-b border-slate-800 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Brand & Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-white text-lg">Discovery</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                10 Agents Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Real-Time Global News Discovery & Media Authentication</p>
          </div>
        </div>

        {/* Live Multi-Agent Telemetry Pill */}
        <div className="hidden xl:flex items-center space-x-2 bg-slate-950/60 border border-slate-800 rounded-full px-3 py-1 text-xs text-slate-300">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Live Internet Streaming</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Google News & GDELT Live</span>
        </div>
      </div>

      {/* Right Controls: Role Switcher, Refresh, Alerts */}
      <div className="flex items-center space-x-4">
        {/* Role Selector */}
        <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Role:</span>
          <select
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="bg-transparent text-emerald-400 font-medium focus:outline-none cursor-pointer"
          >
            <option value="Admin">Admin</option>
            <option value="FactVerifier">Fact-Verification Analyst</option>
            <option value="Analyst">Lead Analyst</option>
            <option value="Executive">Executive</option>
            <option value="Client">Client</option>
          </select>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          title="Refresh Active Pipelines"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Alerts Notification */}
        <div className="relative cursor-pointer p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        </div>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-emerald-700 border border-emerald-600 flex items-center justify-center font-bold text-xs text-white">
          DC
        </div>
      </div>
    </header>
  );
};
