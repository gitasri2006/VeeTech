import React, { useState, useEffect } from 'react';
import { History, Shield, CheckCircle2, UserCheck, ArrowRight } from 'lucide-react';
import { AuditLogEntry } from '../types';
import { api } from '../services/api';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const list = await api.getAuditLogs();
    setLogs(list);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <History className="w-4 h-4" />
          <span>Governance & Compliance</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Immutable Audit Log Trail</h1>
        <p className="text-sm text-slate-400 mt-1">
          Complete before/after governance trail recording all rule changes, fact-verification overrides, and analyst sign-offs (TRD Section 8).
        </p>
      </div>

      {/* Audit Log Stream */}
      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {log.action_type}
                </span>
                <span className="text-slate-400">Actor: <strong className="text-white">{log.actor_id}</strong></span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">Target ID: <strong className="text-white font-mono">{log.target_id}</strong></span>
              </div>
              <span className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
            </div>

            {/* State Diffs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Before State:</span>
                <pre className="text-slate-300 text-[11px] whitespace-pre-wrap">{JSON.stringify(log.before, null, 2)}</pre>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <span className="text-emerald-400 text-[10px] uppercase font-bold block">After State:</span>
                <pre className="text-emerald-300 text-[11px] whitespace-pre-wrap">{JSON.stringify(log.after, null, 2)}</pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
