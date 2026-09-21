import React from 'react';
import { BarChart3, Download, FileSpreadsheet, FileText, Calendar, Filter } from 'lucide-react';

export const ReportingView: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-1">
          <BarChart3 className="w-4 h-4" />
          <span>Analytics & Reporting</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Reporting & Data Export</h1>
        <p className="text-sm text-slate-600 mt-1">
          Generate exportable intelligence reports, audit summaries, and automated daily/weekly digests in PDF, CSV, and JSON formats.
        </p>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Executive Intelligence Digest (PDF)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Formatted executive briefing with grounded citations, cluster trends, and sentiment distribution.
            </p>
          </div>
          <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition border border-slate-300">
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Export Executive PDF</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Coverage & Metrics Dataset (CSV)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Raw tabular dataset including source credibility tiers, authenticity scores, and language tags.
            </p>
          </div>
          <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition border border-slate-300">
            <Download className="w-4 h-4 text-blue-600" />
            <span>Export CSV Dataset</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">WhatsApp Bot Analytics Report (JSON)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Full public query volumes, multilingual breakdown, and debunked misinformation logs.
            </p>
          </div>
          <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition border border-slate-300">
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export JSON Analytics</span>
          </button>
        </div>
      </div>
    </div>
  );
};
