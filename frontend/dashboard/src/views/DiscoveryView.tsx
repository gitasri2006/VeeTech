import React, { useState } from 'react';
import {
  Search, Sparkles, Image as ImageIcon, Mic, Video, Globe2,
  CheckCircle2, AlertTriangle, XCircle, HelpCircle, ExternalLink,
  Layers, ShieldCheck, RefreshCw, UploadCloud,
  Check, Info, X, BookOpen, Clock, Building, Play, Tv
} from 'lucide-react';
import { api, UnifiedSearchOptions } from '../services/api';
import { ContentViewer } from '../components/content';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English (Global)' },
  { code: 'hi', name: 'Hindi (हिंदी)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', name: 'Malayalam (മലയാളം)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ru', name: 'Russian (Русский)' },
];

export const DiscoveryView: React.FC = () => {
  const [searchInput, setSearchInput] = useState('Artificial Intelligence');
  const [activeModality, setActiveModality] = useState<'text' | 'image' | 'audio' | 'video'>('text');
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  const [timeRange, setTimeRange] = useState<string>('all');
  const [strictRelevance, setStrictRelevance] = useState<boolean>(true);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedBase64, setUploadedBase64] = useState<string>('');
  const [uploadedMimeType, setUploadedMimeType] = useState<string>('');
  const [mockMediaContext, setMockMediaContext] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatusText, setSearchStatusText] = useState('Searching live sources...');
  const [results, setResults] = useState<any>(null);
  const [selectedTierFilter, setSelectedTierFilter] = useState<'all' | 1 | 2 | 3>('all');
  const [activeModalArticle, setActiveModalArticle] = useState<any | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchInput.trim() && !uploadedBase64 && !mockMediaContext.trim() && !uploadedFileName) return;

    setIsSearching(true);
    if (activeModality !== 'text' && uploadedBase64) {
      setSearchStatusText(`Performing live OCR & Vision Analysis on ${uploadedFileName}...`);
    } else {
      setSearchStatusText('Connecting to live news feeds, fact-checking registries, and analyzing sources...');
    }

    const searchOptions: UnifiedSearchOptions = {
      query: searchInput.trim() || undefined,
      inputModality: activeModality,
      targetLanguage: targetLanguage,
      timeRange: timeRange,
      strictRelevance: strictRelevance,
      mediaFileName: uploadedFileName || undefined,
      mediaBase64: uploadedBase64 || undefined,
      mediaMimeType: uploadedMimeType || undefined,
    };

    if (activeModality === 'image') {
      searchOptions.mockOcrText = mockMediaContext || undefined;
    } else if (activeModality === 'audio') {
      searchOptions.mockTranscript = mockMediaContext || undefined;
    } else if (activeModality === 'video') {
      searchOptions.mockTranscript = mockMediaContext || undefined;
    }

    try {
      const res = await api.searchUnifiedDiscovery(searchOptions);
      setResults(res);
      setSelectedTierFilter('all');
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, modality: 'image' | 'audio' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setUploadedMimeType(file.type || (modality === 'image' ? 'image/png' : modality === 'audio' ? 'audio/mp3' : 'video/mp4'));
      setActiveModality(modality);
      
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuickPill = (query: string) => {
    setSearchInput(query);
    setActiveModality('text');
    setUploadedFileName('');
    setUploadedBase64('');
    setUploadedMimeType('');
    setMockMediaContext('');
  };

  const getVerdictBadge = (verdict: string, score: number) => {
    switch (verdict?.toLowerCase()) {
      case 'verified':
        return (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Verified Source Consensus ({Math.round(score * 100)}%)</span>
          </div>
        );
      case 'disputed':
        return (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4" />
            <span>Disputed / Developing ({Math.round(score * 100)}%)</span>
          </div>
        );
      case 'likely false':
        return (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            <XCircle className="w-4 h-4" />
            <span>Debunked / Fabricated ({Math.round(score * 100)}%)</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
            <HelpCircle className="w-4 h-4" />
            <span>Investigated ({Math.round((score || 0.5) * 100)}%)</span>
          </div>
        );
    }
  };

  const allSources: any[] = results?.sources || [];
  const tier1Sources = allSources.filter((s) => s.source_tier === 1);
  const tier2Sources = allSources.filter((s) => s.source_tier === 2);
  const tier3Sources = allSources.filter((s) => s.source_tier === 3 || !s.source_tier);

  const displayedSources =
    selectedTierFilter === 'all'
      ? allSources
      : allSources.filter((s) => s.source_tier === selectedTierFilter);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 bg-slate-50 text-slate-900 min-h-screen font-sans">
      {/* Brand Header */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Unified Intelligence & Multi-Source Discovery</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          Discovery
        </h1>
        <p className="text-sm md:text-base text-slate-500 max-w-2xl mx-auto font-medium">
          One unified search across live news wires, verified fact-checking registries, mainstream press, and technical discussions.
        </p>
      </div>

      {/* Master Search Console */}
      <form onSubmit={handleSearch} className="bg-white border border-slate-200 rounded-2xl p-5 md:p-7 shadow-sm space-y-5">
        {/* Modality Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => { setActiveModality('text'); setUploadedFileName(''); }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeModality === 'text'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Text / Keyword</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModality('image')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeModality === 'image'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModality('audio')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeModality === 'audio'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Audio</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModality('video')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeModality === 'video'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>
          </div>

          {/* Multilingual Selector */}
          <div className="flex items-center space-x-2">
            <Globe2 className="w-4 h-4 text-orange-600" />
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-orange-600 transition shadow-sm"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Input Field based on modality */}
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                activeModality === 'text'
                  ? 'Search live wire feeds, enter keywords, or ask a question (e.g. Tata Motors EV, ISRO, Apple M4)...'
                  : `Add search terms or questions regarding this ${activeModality}...`
              }
              className="w-full bg-white border border-slate-300 rounded-xl pl-12 pr-4 py-3.5 text-sm md:text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-600 transition shadow-sm font-medium"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>

          {/* File Upload Box for Image/Audio/Video */}
          {activeModality !== 'text' && (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Upload {activeModality.toUpperCase()} for Multimodal Analysis
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {uploadedFileName ? `Attached: ${uploadedFileName}` : 'Select a file from your device for live OCR, whisper transcript, and scene analysis.'}
                    </p>
                  </div>
                </div>

                <label className="cursor-pointer">
                  <span className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition inline-block shadow-sm">
                    {uploadedFileName ? 'Change File' : 'Browse File'}
                  </span>
                  <input
                    type="file"
                    accept={activeModality === 'image' ? 'image/*' : activeModality === 'audio' ? 'audio/*' : 'video/*'}
                    onChange={(e) => handleFileUpload(e, activeModality)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Quick Prompt Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-500 font-bold">Trending Topics:</span>
            {[
              'Tata Motors EV battery tech',
              'ISRO Gaganyaan mission crew',
              'French AI Sovereignty policy',
              'Qualcomm Snapdragon X Elite benchmarks',
              'Stripe stablecoin acquisition'
            ].map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleQuickPill(q)}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 transition font-medium shadow-sm cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-white border border-slate-300 text-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none focus:border-orange-600"
              >
                <option value="all">All Time</option>
                <option value="24h">Past 24 Hours</option>
                <option value="7d">Past 7 Days</option>
                <option value="30d">Past 30 Days</option>
              </select>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={strictRelevance}
                onChange={(e) => setStrictRelevance(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
              />
              <span className="text-slate-700 font-medium">Strict Subject Relevance Filter</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition shadow-sm flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isSearching ? 'Investigating...' : 'Discover & Synthesize'}</span>
          </button>
        </div>
      </form>

      {/* Live Loading Indicator */}
      {isSearching && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm animate-pulse">
          <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-900">Multi-Agent Autonomous Investigation in Progress</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">{searchStatusText}</p>
          </div>
        </div>
      )}

      {/* Intelligence Results Dossier */}
      {results && !isSearching && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                  Grounded Intelligence Synthesis
                </span>
                <h2 className="text-xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {results.intelligence_result?.title || results.query}
                </h2>
              </div>
              {results.intelligence_result?.authenticity_verdict && (
                <div>
                  {getVerdictBadge(
                    results.intelligence_result.authenticity_verdict,
                    results.intelligence_result.authenticity_score ?? 0.5
                  )}
                </div>
              )}
            </div>

            {/* Executive Summary */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Executive Briefing</h3>
              <p className="text-sm md:text-base text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium">
                {results.intelligence_result?.executive_summary || 'Multi-source summary synthesized from live indexed sources.'}
              </p>
            </div>

            {/* Key Findings */}
            {results.intelligence_result?.key_findings && results.intelligence_result.key_findings.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Key Verified Findings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.intelligence_result.key_findings.map((f: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs md:text-sm text-slate-800 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-2 flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Discovered Sources Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Discovered Sources ({displayedSources.length})
              </h3>
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setSelectedTierFilter('all')}
                  className={`px-3 py-1 rounded-lg transition ${
                    selectedTierFilter === 'all'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Sources ({allSources.length})
                </button>
                <button
                  onClick={() => setSelectedTierFilter(1)}
                  className={`px-3 py-1 rounded-lg transition ${
                    selectedTierFilter === 1
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tier 1 ({tier1Sources.length})
                </button>
                <button
                  onClick={() => setSelectedTierFilter(2)}
                  className={`px-3 py-1 rounded-lg transition ${
                    selectedTierFilter === 2
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tier 2 ({tier2Sources.length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedSources.map((source: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => setActiveModalArticle(source)}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-orange-300 transition flex flex-col justify-between space-y-4 shadow-sm group cursor-pointer"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 truncate max-w-[160px]">
                        {source.source || source.domain}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                        source.source_tier === 1
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : source.source_tier === 2
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        Tier {source.source_tier || 2} ({Math.round((source.credibility_score ?? 0.8) * 100)}%)
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition line-clamp-2">
                      {source.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {source.snippet}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>{source.platform || 'web'}</span>
                    <span className="text-orange-600 font-semibold group-hover:underline flex items-center space-x-1">
                      <span>Read Article</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content Viewer Reader Modal */}
      {activeModalArticle && (
        <ContentViewer
          url={activeModalArticle.url}
          title={activeModalArticle.title}
          snippet={activeModalArticle.snippet}
          source={activeModalArticle.source || activeModalArticle.domain}
          sourceTier={activeModalArticle.source_tier}
          credibilityScore={activeModalArticle.credibility_score}
          onClose={() => setActiveModalArticle(null)}
        />
      )}
    </div>
  );
};
