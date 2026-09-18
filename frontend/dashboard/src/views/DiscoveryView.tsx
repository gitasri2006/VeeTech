import React, { useState } from 'react';
import { Search, Globe, Filter, Sparkles, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export const DiscoveryView: React.FC = () => {
  const [keywordInput, setKeywordInput] = useState('Tata Motors EV');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['web', 'x', 'youtube', 'telegram']);
  const [recencyWindow, setRecencyWindow] = useState('48h');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywordInput.trim()) return;
    setIsSearching(true);
    const keywords = keywordInput.split(',').map((k) => k.trim()).filter(Boolean);
    const res = await api.searchGlobalDiscovery(keywords, undefined, {
      platforms: selectedPlatforms,
      recency: recencyWindow,
    });
    setResults(res);
    setIsSearching(false);
  };

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Globe className="w-4 h-4" />
          <span>Global Discovery Agent (Agent 1)</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Keyword & Entity Discovery Console</h1>
        <p className="text-sm text-slate-400 mt-1">
          Proactively expand keywords and discover un-indexed coverage across the open web, news APIs, and social media without requiring manual URLs.
        </p>
      </div>

      {/* Discovery Query Form */}
      <form onSubmit={handleSearch} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Keywords / Entity Aliases (comma separated)
          </label>
          <div className="relative">
            <Search className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="e.g. Tata Motors EV, Nexon Electric, Curvv, battery production"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* Discovery Scope Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-slate-800">
          {/* Platforms Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Ingestion Channels
            </label>
            <div className="flex flex-wrap gap-2">
              {['web', 'instagram', 'x', 'youtube', 'facebook', 'telegram', 'reddit', 'tiktok'].map((p) => {
                const active = selectedPlatforms.includes(p);
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition capitalize ${
                      active
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recency Scope */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Recency Window
            </label>
            <select
              value={recencyWindow}
              onChange={(e) => setRecencyWindow(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="48h">Last 48 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          {/* Action Button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSearching}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition disabled:opacity-50 shadow-lg shadow-emerald-900/30"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Scanning Discovery Adapters...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Fan-Out Search</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Discovery Results */}
      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Discovery Ingestion Results</h2>
            <div className="flex items-center space-x-3 text-xs text-slate-400">
              <span>Candidates: <strong className="text-white">{results.total_candidates}</strong></span>
              <span>•</span>
              <span>New Ingested: <strong className="text-emerald-400">{results.new_articles_ingested}</strong></span>
              <span>•</span>
              <span>Duplicates Filtered: <strong className="text-slate-300">{results.duplicates_skipped}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.articles?.map((art: any, i: number) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {art.source}
                  </span>
                  <span className="text-slate-400 uppercase font-mono">{art.language}</span>
                </div>
                <h3 className="font-semibold text-white text-sm leading-snug">{art.title}</h3>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                  <span className="flex items-center space-x-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>SHA-256 Deduplicated</span>
                  </span>
                  <a
                    href={art.canonical_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 text-slate-400 hover:text-white"
                  >
                    <span>Inspect Raw</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
