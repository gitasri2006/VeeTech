import React, { useState } from 'react';
import { SlidersHorizontal, Sparkles, Play, CheckCircle2, XCircle, AlertCircle, BarChart2, ArrowLeft, Menu } from 'lucide-react';
import { api } from '../services/api';

interface RulesViewProps {
  onBack?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: (open: boolean) => void;
}

export const RulesView: React.FC<RulesViewProps> = ({ onBack, isSidebarOpen = true, onToggleSidebar }) => {
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 text-slate-900 font-sans w-full">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3 mb-2">
          {!isSidebarOpen && onToggleSidebar && (
            <button
              onClick={() => onToggleSidebar(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-orange-50 border border-orange-200 text-slate-700 transition shadow-xs cursor-pointer"
              title="Open Menu"
            >
              <Menu className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-semibold">Open Menu</span>
            </button>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-orange-600 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Discovery Search</span>
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2 text-orange-600 text-xs font-bold uppercase tracking-wider mb-1">
          <SlidersHorizontal className="w-4 h-4" />
          <span>Configurable Rule Engine & Sandbox</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Rule Authoring & Historical Sandbox</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Author multi-dimensional deterministic filtering rules using Gemini Natural Language synthesis or structured controls, and test against historical content before activation.
        </p>
      </div>

      {/* Top: Natural Language Rule Compiler */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-orange-600" />
            <span>Natural Language Rule Authoring (LLM Compiler)</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">Gemini Structured Parser</span>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
            placeholder="e.g. Only Tier 1 Indian news from last 24h excluding cricket and stock prices"
            className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 shadow-sm font-medium"
          />
          <button
            onClick={handleCompileNL}
            disabled={isCompiling}
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs py-2.5 px-5 rounded-xl flex items-center space-x-2 transition disabled:opacity-50 shadow-sm cursor-pointer"
          >
            {isCompiling ? <span>Compiling...</span> : <span>Compile to Rule JSON</span>}
          </button>
        </div>
      </div>

      {/* Middle: Structured Controls + Sandbox Test Trigger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Structured Visual Form */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Structured Rule Parameters</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-medium">
            <div>
              <label className="block text-slate-700 font-bold mb-2">Minimum Source Credibility Tier</label>
              <select
                value={minTier}
                onChange={(e) => setMinTier(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-orange-600 shadow-sm"
              >
                <option value={1}>Tier 1 (Authoritative Wire & Official Only)</option>
                <option value={2}>Tier 2 (Commercial & Mainstream Journalism)</option>
                <option value={3}>Tier 3 (All Sources Including Social/UGC)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-2">Recency Sliding Window</label>
              <select
                value={recencyWindow}
                onChange={(e) => setRecencyWindow(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-orange-600 shadow-sm"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="48h">Last 48 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-2">Exclusion Terms (Must NOT include)</label>
              <input
                type="text"
                value={excludedTerms}
                onChange={(e) => setExcludedTerms(e.target.value)}
                placeholder="sports, movie reviews, weather"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-orange-600 shadow-sm font-medium"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleRunSandbox}
              disabled={isRunningSandbox}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs py-2.5 px-6 rounded-xl flex items-center space-x-2 transition shadow-sm cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>{isRunningSandbox ? 'Evaluating Historical Data...' : 'Run Historical Sandbox Test'}</span>
            </button>
          </div>
        </div>

        {/* Sandbox Outcome Simulation Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-orange-600" />
            <span>Sandbox Simulation</span>
          </h2>

          {sandboxResult ? (
            <div className="space-y-4 text-xs font-medium">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Historical Candidates Evaluated:</span>
                  <span className="font-bold text-slate-900">{sandboxResult.evaluated_candidates}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Passed Rule Filter:</span>
                  <span>{sandboxResult.passed_candidates} (Yield {Math.round(sandboxResult.yield_ratio * 100)}%)</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Excluded by Rules:</span>
                  <span>{sandboxResult.excluded_count}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1 font-bold">Volume Impact Assessment:</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed font-medium">
                  {sandboxResult.estimated_daily_volume > 100
                    ? 'High yield rule: Recommend narrowing terms to avoid analyst queue overload.'
                    : 'Balanced filter: Produces high-confidence signal-to-noise ratio.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-medium">Run sandbox test to project rule performance against historical articles.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
