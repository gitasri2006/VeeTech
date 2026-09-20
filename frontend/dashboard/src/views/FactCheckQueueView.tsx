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
    // Remove approved item from queue
    const updated = queue.filter((q) => q.id !== selectedItem.id);
    setQueue(updated);
    setSelectedItem(updated.length > 0 ? updated[0] : null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <CheckCheck className="w-4 h-4" />
          <span>Fact-Checking & Authenticity Verification</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Fact-Verification Analyst Review Queue</h1>
        <p className="text-sm text-slate-400 mt-1">
          <strong>Mandatory Safeguard:</strong> All Disputed and Likely-False verdicts are strictly held in this queue for analyst sign-off before being published to clients or WhatsApp.
        </p>
      </div>

      {queue.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Verification Queue Empty</h2>
          <p className="text-xs text-slate-400">All flagged items have been reviewed and verified by analysts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Queue Items List */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pending Items ({queue.length})
            </h2>
            {queue.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
                  selectedItem?.id === item.id
                    ? 'bg-slate-800/90 border-amber-500/50'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400">{item.article_id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {item.verdict} ({Math.round(item.authenticity_score * 100)}%)
                  </span>
                </div>
                <p className="text-xs font-semibold text-white line-clamp-2">
                  {item.evidence_sources[0]?.summary || 'Pending authenticity sign-off'}
                </p>
                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Sources: {item.evidence_sources.length}</span>
                  <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Full Review & Sign-Off Panel */}
          {selectedItem && (
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Reviewing Article ID</span>
                  <h2 className="text-base font-bold text-white font-mono">{selectedItem.article_id}</h2>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    Automated Verdict: {selectedItem.verdict}
                  </span>
                </div>
              </div>

              {/* Evidence Sources List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Automated Evidence Corroboration ({selectedItem.evidence_sources.length})
                </h3>
                {selectedItem.evidence_sources.map((ev, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">{ev.source}</span>
                      <span className="text-rose-400 font-semibold uppercase text-[10px]">{ev.status}</span>
                    </div>
                    <p className="text-slate-300">{ev.summary}</p>
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-white flex items-center space-x-1 text-[11px] underline"
                    >
                      <span>Check Fact-Checker Primary Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>

              {/* Analyst Decision & Rationale Form */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Fact-Verification Analyst Sign-Off Decision</span>
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Final Published Verdict</label>
                    <select
                      value={overrideVerdict}
                      onChange={(e) => setOverrideVerdict(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Likely False">Confirm as Likely False (Misinformation)</option>
                      <option value="Disputed">Confirm as Disputed (Conflicting Claims)</option>
                      <option value="Unverified">Overturn to Unverified</option>
                      <option value="Verified">Overturn to Verified</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Analyst Audit ID</label>
                    <input
                      type="text"
                      disabled
                      value="analyst-pankaj (Logged In)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">Analyst Override Rationale (Logged to Audit Trail)</label>
                  <textarea
                    rows={2}
                    value={analystReason}
                    onChange={(e) => setAnalystReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    onClick={handleSignOff}
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 px-6 rounded-lg flex items-center space-x-2 transition shadow-lg shadow-emerald-900/30"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Signing Off...' : 'Confirm Analyst Sign-Off & Clear Queue'}</span>
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
