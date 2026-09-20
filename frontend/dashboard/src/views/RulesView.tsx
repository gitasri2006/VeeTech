import React, { useState } from 'react';
import { SlidersHorizontal, Sparkles, Play, CheckCircle2, XCircle, AlertCircle, BarChart2 } from 'lucide-react';
import { api } from '../services/api';

export const RulesView: React.FC = () => {
  const [nlPrompt, setNlPrompt] = useState('Monitor all Tier 1 and Tier 2 news from India within 48 hours excluding sports');
  const [minTier, setMinTier] = useState(2);
  const [recencyWindow, setRecencyWindow] = useState('48h');
  const [excludedTerms, setExcludedTerms] = useState('sports, cricket');
  const [isCompiling, setIsCompiling] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [isRunningSandbox, setIsRunningSandbox] = useState(false);

  const handleCompileNL = async () => {
    setIsCompiling(true);
    try {
      const res = await api.compileRule('ent-001', nlPrompt);
      if (res) {
        setMinTier(res.min_source_tier || 2);
        setRecencyWindow(res.recency_window || '48h');
        setExcludedTerms(res.boolean_terms?.must_not_include?.join(', ') || '');
      }
    } catch (e) {}
    setIsCompiling(false);
  };

  const handleRunSandbox = async () => {
    setIsRunningSandbox(true);
    const res = await api.runRuleSandbox({
      domain_rules: { min_tier: minTier },
      recency_window: recencyWindow,
      boolean_terms: { must_not_include: excludedTerms.split(',').map((s) => s.trim()).filter(Boolean) },
    });
    setSandboxResult(res);
    setIsRunningSandbox(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <SlidersHorizontal className="w-4 h-4" />
          <span>Configurable Rule Engine & Sandbox</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Rule Authoring & Historical Sandbox</h1>
        <p className="text-sm text-slate-400 mt-1">
          Author multi-dimensional deterministic filtering rules using Gemini Natural Language synthesis or structured controls, and test against historical content before activation.
        </p>
      </div>

      {/* Top: Natural Language Rule Compiler */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Natural Language Rule Authoring (LLM Compiler)</span>
          </h2>
          <span className="text-xs text-slate-400">Gemini 2.5 Structured Parser</span>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
            placeholder="e.g. Only Tier 1 Indian news from last 24h excluding cricket and stock prices"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleCompileNL}
            disabled={isCompiling}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 px-5 rounded-lg flex items-center space-x-2 transition disabled:opacity-50"
          >
            {isCompiling ? <span>Compiling...</span> : <span>Compile to Rule JSON</span>}
          </button>
        </div>
      </div>

      {/* Middle: Structured Controls + Sandbox Test Trigger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Structured Visual Form */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Structured Rule Parameters</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-2">Minimum Source Credibility Tier</label>
              <select
                value={minTier}
                onChange={(e) => setMinTier(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value={1}>Tier 1 (Authoritative Wire & Official Only)</option>
                <option value={2}>Tier 2 (Commercial & Mainstream Journalism)</option>
                <option value={3}>Tier 3 (All Sources Including Social/UGC)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-2">Recency Window</label>
              <select
                value={recencyWindow}
                onChange={(e) => setRecencyWindow(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="24h">24 Hours</option>
                <option value="48h">48 Hours</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-300 font-semibold mb-2">Must-Not-Include Exclusion Terms (Comma Separated)</label>
              <input
                type="text"
                value={excludedTerms}
                onChange={(e) => setExcludedTerms(e.target.value)}
                placeholder="e.g. sports, cricket, astrology"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <span className="text-xs text-slate-400">Deterministic Gates: Recency, Tiers, Keywords</span>
            <button
              onClick={handleRunSandbox}
              disabled={isRunningSandbox}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 px-5 rounded-lg flex items-center space-x-2 transition shadow-lg shadow-indigo-900/30"
            >
              <Play className="w-4 h-4" />
              <span>{isRunningSandbox ? 'Evaluating Historical Data...' : 'Run Historical Sandbox Simulation'}</span>
            </button>
          </div>
        </div>

        {/* Sandbox Metrics Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <span>Sandbox Pass Rate</span>
          </h2>

          {sandboxResult ? (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                <span className="text-3xl font-extrabold text-emerald-400">{sandboxResult.pass_rate_pct}%</span>
                <span className="block text-slate-400 mt-1">Rule Pass Rate ({sandboxResult.passed_count} / {sandboxResult.total_evaluated})</span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-2">Failure Breakdown:</span>
                <div className="space-y-1.5">
                  {Object.entries(sandboxResult.breakdown_by_failure_reason || {}).map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="capitalize text-slate-300">{reason}</span>
                      <span className="font-bold text-rose-400">{count as number} failed</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg p-4">
              <AlertCircle className="w-8 h-8 mb-2 text-slate-600" />
              <span>Click "Run Historical Sandbox Simulation" to test against 50+ ingested stories.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
