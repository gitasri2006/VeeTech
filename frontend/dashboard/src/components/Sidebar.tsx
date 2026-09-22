import React from 'react';
import {
  Compass, Newspaper, FileText, Image, Building2,
  SlidersHorizontal, CheckCheck, MessageSquare, Sparkles,
  BarChart3, Users, History, Settings, Globe2
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
        { id: 'globe' as ViewType, label: 'Live 3D Globe', icon: Globe2 },
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
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        },
        {
          id: 'whatsapp-moderation' as ViewType,
          label: 'WhatsApp Bot Moderation',
          icon: MessageSquare,
          badge: pendingWhatsAppCount > 0 ? pendingWhatsAppCount : undefined,
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 select-none shadow-sm">
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
                        ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-slate-500'}`} />
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
      <div className="p-4 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="font-medium text-slate-600">Discovery v2.0.0</span>
        <span className="text-emerald-600 font-medium flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block mr-1"></span>
          <span>System Active</span>
        </span>
      </div>
    </aside>
  );
};
