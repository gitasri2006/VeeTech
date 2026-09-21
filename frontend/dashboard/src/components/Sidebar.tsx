import React from 'react';
import {
  Compass, Newspaper, FileText, Image, Building2,
  SlidersHorizontal, CheckCheck, MessageSquare, Sparkles,
  BarChart3, Users, History, Settings
} from 'lucide-react';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  pendingFactCheckCount: number;
  pendingWhatsAppCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  pendingFactCheckCount,
  pendingWhatsAppCount,
}) => {
  const sections = [
    {
      group: 'INTELLIGENCE & DISCOVERY',
      items: [
        { id: 'discovery' as ViewType, label: 'Search & Discovery', icon: Compass },
        { id: 'feed' as ViewType, label: 'Unified Real-Time Feed', icon: Newspaper },
        { id: 'story-detail' as ViewType, label: 'Story & Evidence Panel', icon: FileText },
        { id: 'media-viewer' as ViewType, label: 'Multimodal Inspector', icon: Image },
      ],
    },
    {
      group: 'CONFIGURATION & RULES',
      items: [
        { id: 'settings' as ViewType, label: 'Settings & User Rules', icon: Settings },
        { id: 'entities' as ViewType, label: 'Entity Management', icon: Building2 },
        { id: 'rules' as ViewType, label: 'Rule Builder & Sandbox', icon: SlidersHorizontal },
      ],
    },
    {
      group: 'TRUST & MODERATION',
      items: [
        {
          id: 'factcheck-queue' as ViewType,
          label: 'Fact-Check Review Queue',
          icon: CheckCheck,
          badge: pendingFactCheckCount > 0 ? pendingFactCheckCount : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        },
        {
          id: 'whatsapp-moderation' as ViewType,
          label: 'WhatsApp Bot Moderation',
          icon: MessageSquare,
          badge: pendingWhatsAppCount > 0 ? pendingWhatsAppCount : undefined,
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        },
      ],
    },
    {
      group: 'DELIVERY & GOVERNANCE',
      items: [
        { id: 'briefs' as ViewType, label: 'Executive Briefs', icon: Sparkles },
        { id: 'reporting' as ViewType, label: 'Reporting & Export', icon: BarChart3 },
        { id: 'admin-users' as ViewType, label: 'User Roles & RBAC', icon: Users },
        { id: 'audit-log' as ViewType, label: 'Audit Log Trail', icon: History },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 select-none">
      <div className="py-4 overflow-y-auto px-3 space-y-6">
        {sections.map((sec, idx) => (
          <div key={idx}>
            <h3 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 mb-2">
              {sec.group}
            </h3>
            <div className="space-y-1">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectView(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {(item as any).badge !== undefined && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${(item as any).badgeColor}`}>
                        {(item as any).badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer System Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Discovery v2.0.0</span>
        <span className="text-emerald-500 flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block mr-1"></span>
          <span>System Active</span>
        </span>
      </div>
    </aside>
  );
};
