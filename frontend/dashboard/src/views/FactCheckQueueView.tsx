import React, { useState, useEffect } from 'react';
import { CheckCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, ExternalLink, UserCheck, Shield } from 'lucide-react';
import { FactCheckResult } from '../types';
import { api } from '../services/api';

export const FactCheckQueueView: React.FC = () => {
  const [queue, setQueue] = useState<FactCheckResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<FactCheckResult | null>(null);
  const [overrideVerdict, setOverrideVerdict] = useState('Likely False');
  const [analystReason, setAnalystReason] = useState('Confirmed viral hoax based on official denial statements.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    const list = await api.getFactCheckQueue();
    setQueue(list);
    if (list.length > 0 && !selectedItem) {
      setSelectedItem(list[0]);
    }
  };

  const handleSignOff = async () => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    await api.submitFactCheckReview(
      selectedItem.article_id,
      overrideVerdict,
      'analyst-pankaj',
      analystReason
    );
    setIsSubmitting(false);
    const updated = queue.filter((q) => q.id !== selectedItem.id);
    setQueue(updated);
    setSelectedItem(updated.length > 0 ? updated[0] : null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 text-slate-900 min-h-screen font-sans">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">
          <CheckCheck className="w-4 h-4" />
          <span>Fact-Checking & Authenticity Verification</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fact-Verification Analyst Review Queue</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          <strong>Mandatory Safeguard:</strong> All Disputed and Likely-False verdicts are strictly held in this queue for analyst sign-off before being published to clients or WhatsApp.
        </p>
      </div>

      {queue.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Verification Queue Empty</h2>
          <p className="text-xs text-slate-500 font-medium">All flagged items have been reviewed and verified by analysts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Queue Items List */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Items ({queue.length})
            </h2>
            {queue.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`p-4 rounded-2xl border cursor-pointer transition space-y-2 ${
                  selectedItem?.id === item.id
                    ? 'bg-amber-50 border-amber-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-500 font-semibold">{item.article_id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    {item.verdict} ({Math.round(item.authenticity_score * 100)}%)
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 line-clamp-2">
                  {item.evidence_sources[0]?.summary || 'Pending authenticity sign-off'}
                </p>
                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 font-medium">
                  <span>Sources: {item.evidence_sources.length}</span>
                  <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Full Review & Sign-Off Panel */}
          {selectedItem && (
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Reviewing Article ID</span>
                  <h2 className="text-lg font-bold text-slate-900 font-mono">{selectedItem.article_id}</h2>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    AI Verdict: {selectedItem.verdict} ({Math.round(selectedItem.authenticity_score * 100)}%)
                  </span>
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Automated Agent Reasoning</h3>
                <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed font-medium">
                  {selectedItem.reasoning}
                </p>
              </div>

              {/* Evidence list */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Corroborating / Debunking Evidence</h3>
                <div className="space-y-2">
                  {selectedItem.evidence_sources.map((ev, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between text-xs">
                      <div className="space-y-1">
                        <span className="font-bold text-slate-900 block">{ev.source}</span>
                        <p className="text-slate-600 font-medium">{ev.summary}</p>
                      </div>
                      <a href={ev.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 p-1 font-semibold">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analyst Sign-Off Form */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <span>Analyst Audit & Human Sign-Off (TRD 5.7)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">Override or Confirm Verdict</label>
                    <select
                      value={overrideVerdict}
                      onChange={(e) => setOverrideVerdict(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 shadow-sm"
                    >
                      <option value="Likely False">Confirm Likely False / Debunk</option>
                      <option value="Disputed">Confirm Disputed Claims</option>
                      <option value="Verified">Override to Verified (Authentic)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">Auditor Identity</label>
                    <input
                      type="text"
                      disabled
                      value="analyst-pankaj (Lead Fact Analyst)"
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-600 font-semibold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1.5">Analyst Rationale / Verification Notes</label>
                    <textarea
                      rows={2}
                      value={analystReason}
                      onChange={(e) => setAnalystReason(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 shadow-sm font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSignOff}
                    disabled={isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 px-6 rounded-xl flex items-center space-x-2 transition shadow-sm cursor-pointer"
                  >
                    <Shield className="w-4 h-4" />
                    <span>{isSubmitting ? 'Signing Off...' : 'Complete Sign-Off & Publish'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
