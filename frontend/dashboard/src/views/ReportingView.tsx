import React from 'react';
import { BarChart3, Download, FileSpreadsheet, FileText, Calendar, Filter } from 'lucide-react';

export const ReportingView: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <BarChart3 className="w-4 h-4" />
          <span>Analytics & Reporting</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Executive Reporting & Data Export</h1>
        <p className="text-sm text-slate-400 mt-1">
          Generate exportable intelligence reports, audit summaries, and automated daily/weekly digests in PDF, CSV, and JSON formats.
        </p>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Executive Intelligence Digest (PDF)</h3>
            <p className="text-xs text-slate-400 mt-1">
              Formatted executive briefing with grounded citations, cluster trends, and sentiment distribution.
            </p>
          </div>
          <button className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition border border-slate-700">
            <Download className="w-4 h-4" />
            <span>Export Executive PDF</span>
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Coverage & Metrics Dataset (CSV)</h3>
            <p className="text-xs text-slate-400 mt-1">
              Raw tabular dataset including source credibility tiers, authenticity scores, and language tags.
            </p>
          </div>
          <button className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition border border-slate-700">
            <Download className="w-4 h-4" />
            <span>Export CSV Dataset</span>
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">WhatsApp Bot Analytics Report (JSON)</h3>
            <p className="text-xs text-slate-400 mt-1">
              Full public query volumes, multilingual breakdown, and debunked misinformation logs.
            </p>
          </div>
          <button className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition border border-slate-700">
            <Download className="w-4 h-4" />
            <span>Export JSON Analytics</span>
          </button>
        </div>
      </div>
    </div>
  );
};
