import React, { useState } from 'react';
import {
  Settings, User as UserIcon, CheckCircle2, Globe2, Check,
  Key, RefreshCw, Cpu, Layers, Database, ArrowLeft, Menu, ShieldCheck
} from 'lucide-react';

interface SettingsViewProps {
  onBack?: () => void;
  initialTab?: 'profile' | 'system';
  isSidebarOpen?: boolean;
  onToggleSidebar?: (open: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onBack,
  initialTab = 'profile',
  isSidebarOpen = true,
  onToggleSidebar,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'system'>(initialTab);

  // User Profile State
  const [userName, setUserName] = useState('Karthick M');
  const [userEmail, setUserEmail] = useState('karthick@discovery.ai');
  const [userRole, setUserRole] = useState('Lead Intelligence Analyst & Admin');
  const [userOrg, setUserOrg] = useState('Discovery AI Intelligence Lab');
  const [profileSaved, setProfileSaved] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 text-slate-900 font-sans w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            {!isSidebarOpen && onToggleSidebar && (
              <button
                onClick={() => onToggleSidebar(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 transition shadow-xs cursor-pointer"
                title="Open Menu"
              >
                <Menu className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold">Open Menu</span>
              </button>
            )}
            {onBack && (
              <button
                onClick={onBack}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Discovery Search</span>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            <span>Control Center & User Preferences</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Settings & Configuration</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Manage your user profile, verify active AI reasoning engines, and inspect live data adapters.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UserIcon className="w-4 h-4 text-indigo-600" />
          <span>User Profile & Organization</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'system'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-4 h-4 text-indigo-600" />
          <span>AI Engines & Live Adapters</span>
        </button>
      </div>

      {/* TAB 1: USER PROFILE & ACCOUNT */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-lg">
              KM
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{userName}</h2>
              <p className="text-xs text-slate-500 font-medium">{userRole} • {userOrg}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-medium">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Full Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Email Address</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Organization / Enterprise</label>
              <input
                type="text"
                value={userOrg}
                onChange={(e) => setUserOrg(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Designation & Role</label>
              <input
                type="text"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 shadow-sm"
              />
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 px-6 rounded-xl transition shadow-sm cursor-pointer"
              >
                Save Preferences
              </button>

              {profileSaved && (
                <span className="flex items-center space-x-1.5 text-emerald-600 text-xs font-semibold animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Profile updated successfully</span>
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: SYSTEM STATUS & ENGINES */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span>Active AI Reasoning Engines</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Gemini 2.5 Flash / Pro (Google AI)</span>
                  <span className="text-[11px] text-slate-500">Autonomous synthesis & cross-source consensus</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ONLINE
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">DeepSeek Reasoner (R1)</span>
                  <span className="text-[11px] text-slate-500">Deep chain-of-thought mathematical claim corroboration</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ONLINE
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Qwen 2.5 72B Instruct (Together AI)</span>
                  <span className="text-[11px] text-slate-500">Multilingual normalization & Indian vernacular support</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ONLINE
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Globe2 className="w-4 h-4 text-indigo-600" />
              <span>Live Ingestion Adapters</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">GNews & NewsAPI Real-Time Feeds</span>
                  <span className="text-[11px] text-slate-500">Global breaking news wires (Tier 1 & Tier 2)</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  CONNECTED
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Google Fact Check API Registry</span>
                  <span className="text-[11px] text-slate-500">Authoritative claim verification knowledge graph</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  CONNECTED
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Tavily Search & Serper Neural Web</span>
                  <span className="text-[11px] text-slate-500">Deep web live search and official document crawler</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  CONNECTED
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
