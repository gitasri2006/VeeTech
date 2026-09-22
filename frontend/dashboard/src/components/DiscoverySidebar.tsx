import React, { useState } from 'react';
import {
  Compass, Search, PanelLeftClose, Plus, SlidersHorizontal,
  ChevronRight, Trash2, Settings, X, Globe2
} from 'lucide-react';
import { ViewType, UserRole } from '../types';

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  query?: string;
  timestamp: string;
  modality?: 'text' | 'image' | 'audio' | 'video';
  mediaFileName?: string;
  mediaBase64?: string;
  mediaMimeType?: string;
  results?: any;
  error?: string;
}

export interface InquirySession {
  id: string;
  title: string;
  timestamp: string;
  messages: ChatTurn[];
}

interface DiscoverySidebarProps {
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
  currentView: ViewType;
  sessions: InquirySession[];
  activeSessionId: string;
  isSidebarOpen: boolean;
  onToggleSidebar: (open: boolean) => void;
  onSelectSession: (session: InquirySession) => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  onClearHistory: () => void;
  onNewInquiry: () => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
  onOpenGlobe?: () => void;
}

export const DiscoverySidebar: React.FC<DiscoverySidebarProps> = ({
  currentView,
  sessions,
  activeSessionId,
  isSidebarOpen,
  onToggleSidebar,
  onSelectSession,
  onDeleteSession,
  onClearHistory,
  onNewInquiry,
  onOpenRules,
  onOpenSettings,
  onOpenGlobe,
}) => {
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [showHistorySearch, setShowHistorySearch] = useState(false);

  const filteredHistorySessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(historySearchQuery.toLowerCase())
  );

  if (!isSidebarOpen) {
    return null;
  }

  return (
    <aside className="w-64 bg-[#fffaf5] border-r border-orange-200/80 flex flex-col h-full transition-all duration-300 select-none flex-shrink-0 z-30 shadow-xs">
      {/* Header */}
      <div className="p-3.5 border-b border-orange-200/80 flex items-center justify-between bg-orange-50/50">
        <div className="flex items-center space-x-2">
          <Compass className="w-5 h-5 text-orange-600" />
          <span className="text-base font-bold text-slate-900 tracking-tight">
            Discovery
          </span>
        </div>

        <div className="flex items-center space-x-1 text-slate-500">
          <button
            onClick={() => setShowHistorySearch(!showHistorySearch)}
            className="p-1.5 rounded-lg hover:bg-orange-100/70 hover:text-orange-700 transition cursor-pointer"
            title="Filter search history"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleSidebar(false)}
            className="flex items-center space-x-1 p-1.5 rounded-lg hover:bg-orange-100/70 text-slate-500 hover:text-orange-700 transition cursor-pointer"
            title="Close Menu"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* History Search Filter Bar */}
      {showHistorySearch && (
        <div className="px-3 pt-2.5 pb-1 bg-orange-50/30">
          <div className="relative">
            <input
              type="text"
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              placeholder="Filter search history..."
              className="w-full bg-white border border-orange-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
            />
            {historySearchQuery && (
              <button
                onClick={() => setHistorySearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Action: New Inquiry, Live 3D Globe & Set Your Rules */}
      <div className="p-3 pb-2 space-y-2">
        <button
          onClick={onNewInquiry}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition group shadow-sm cursor-pointer"
        >
          <div className="flex items-center space-x-2.5">
            <Plus className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
            <span>New Inquiry</span>
          </div>
          <span className="text-[10px] bg-orange-700/60 text-white px-1.5 py-0.5 rounded font-medium">⌘N</span>
        </button>

        {/* Live 3D Globe */}
        <button
          onClick={onOpenGlobe}
          className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition group shadow-xs cursor-pointer ${
            currentView === 'globe'
              ? 'bg-orange-100 text-orange-900 font-bold border border-orange-300 shadow-xs'
              : 'bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-700 border border-orange-200/80 hover:border-orange-300'
          }`}
          title="Open 360° Live Global Trending 3D Globe"
        >
          <div className="flex items-center space-x-2">
            <Globe2 className="w-3.5 h-3.5 text-orange-600 group-hover:scale-110 transition-transform" />
            <span>Trending Globe</span>
          </div>
          <span className="flex items-center space-x-1 text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
            <span>3D</span>
          </span>
        </button>

        {/* Set Your Rules */}
        <button
          onClick={onOpenRules}
          className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition group shadow-xs cursor-pointer ${
            currentView === 'rules'
              ? 'bg-orange-100 text-orange-800 font-bold border border-orange-300 shadow-xs'
              : 'bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-700 border border-orange-200/80 hover:border-orange-300'
          }`}
          title="Set your custom search rules and filters"
        >
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600 group-hover:scale-110 transition-transform" />
            <span>Set Your Rules</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-600 transition-transform" />
        </button>
      </div>

      {/* Search History Section */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 custom-scrollbar">
        <div className="px-3 pt-1 pb-1.5 text-[11px] font-bold text-orange-400 uppercase tracking-wider">
          Search History
        </div>

        {sessions.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-slate-500 font-medium">No search history yet</p>
            <p className="text-[11px] text-slate-400 mt-1">Searches you make will appear here</p>
          </div>
        ) : filteredHistorySessions.length === 0 ? (
          <div className="px-3 py-4 text-xs text-slate-500 text-center">
            No matching searches found
          </div>
        ) : (
          filteredHistorySessions.map((sess) => {
            const isActive = currentView === 'discovery' && activeSessionId === sess.id;
            return (
              <div
                key={sess.id}
                onClick={() => onSelectSession(sess)}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                  isActive
                    ? 'bg-orange-100/90 text-orange-900 font-semibold shadow-xs border border-orange-300'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-orange-50/80'
                }`}
                title={sess.title}
              >
                <div className="flex items-center space-x-2.5 truncate flex-1 pr-1">
                  <Search className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-orange-600' : 'text-slate-400 group-hover:text-orange-600'}`} />
                  <span className="truncate">{sess.title}</span>
                </div>
                <button
                  onClick={(e) => onDeleteSession(e, sess.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 text-slate-400 rounded transition flex-shrink-0"
                  title="Remove from history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Pinned Bottom Bar: Settings & Clear History */}
      <div className="p-2 border-t border-orange-200/80 bg-orange-50/60 space-y-1 mt-auto">
        <button
          onClick={onOpenSettings}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition group cursor-pointer ${
            currentView === 'settings'
              ? 'bg-orange-100 text-orange-900 border border-orange-300 font-bold'
              : 'text-slate-700 hover:text-orange-700 hover:bg-orange-100/60 border border-transparent hover:border-orange-200'
          }`}
          title="System Settings & API Configuration"
        >
          <Settings className={`w-4 h-4 transition-colors ${currentView === 'settings' ? 'text-orange-600' : 'text-slate-500 group-hover:text-orange-600'}`} />
          <span>Settings</span>
        </button>

        {sessions.length > 0 && (
          <button
            onClick={onClearHistory}
            className="w-full py-1 px-3 text-[11px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition text-left cursor-pointer"
          >
            Clear search history
          </button>
        )}
      </div>
    </aside>
  );
};

