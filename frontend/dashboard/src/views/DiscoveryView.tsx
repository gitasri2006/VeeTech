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
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Verified Source Consensus ({Math.round(score * 100)}%)</span>
          </div>
        );
      case 'disputed':
        return (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4" />
            <span>Disputed / Developing ({Math.round(score * 100)}%)</span>
          </div>
        );
      case 'likely false':
        return (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            <XCircle className="w-4 h-4" />
            <span>Debunked / Fabricated ({Math.round(score * 100)}%)</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
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
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Brand Header */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Unified Intelligence & Multi-Source Discovery</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
          Discovery
        </h1>
        <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
          One unified search across live news wires, verified fact-checking registries, mainstream press, and technical discussions.
        </p>
      </div>

      {/* Master Search Console */}
      <form onSubmit={handleSearch} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-7 shadow-2xl space-y-5">
        {/* Modality Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => { setActiveModality('text'); setUploadedFileName(''); }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeModality === 'text'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
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
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
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
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
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
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>
          </div>

          {/* NLP Language Dropdown */}
          <div className="flex items-center space-x-2">
            <Globe2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Report Language:</span>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-emerald-500 transition"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-500 absolute left-4 top-4" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                activeModality === 'image'
                  ? 'Describe or paste keywords for the image, or upload below...'
                  : activeModality === 'audio'
                  ? 'Enter audio title, podcast topic, or upload audio file below...'
                  : activeModality === 'video'
                  ? 'Enter video topic, keynote phrase, or upload video below...'
                  : 'Search anything (e.g. Artificial Intelligence, Tata Motors EV, clean energy trends)...'
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-12 pr-4 py-3.5 text-sm md:text-base text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
            />
          </div>

          {/* Upload Dropzone / Media Attachment area if Image/Audio/Video */}
          {activeModality !== 'text' && (
            <div className="p-4 bg-slate-950 border border-dashed border-slate-700 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                  <span>
                    Upload {activeModality.toUpperCase()} for automatic {activeModality === 'image' ? 'OCR & visual analysis' : activeModality === 'audio' ? 'Whisper speech transcription' : 'Keyframe OCR & speech transcription'}
                  </span>
                </div>
                {uploadedFileName && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-mono">
                    {uploadedFileName}
                  </span>
                )}
              </div>
              <input
                type="file"
                accept={activeModality === 'image' ? 'image/*' : activeModality === 'audio' ? 'audio/*' : 'video/*'}
                onChange={(e) => handleFileUpload(e, activeModality)}
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Quick Inspiration Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-500 font-medium">Try searching:</span>
          {[
            'cm vijay',
            'Artificial Intelligence',
            'Tata Motors EV',
            'ISRO Gaganyaan Mission',
            'Quantum Computing Breakthroughs'
          ].map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => handleQuickPill(pill)}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Interactive Search Constraints Bar (Time Period & Precision) */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Time Duration Chips */}
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="text-slate-400 font-semibold flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Search Duration:</span>
              </span>
              <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                {[
                  { id: 'all', label: '⏱️ All Time' },
                  { id: '24h', label: 'Last 24 Hours' },
                  { id: '7d', label: 'Last 7 Days' },
                  { id: '30d', label: 'Last 30 Days' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTimeRange(t.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                      timeRange === t.id
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Strict Relevance Toggle */}
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={strictRelevance}
                onChange={(e) => setStrictRelevance(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className="text-slate-300 font-medium text-[11px]">
                🎯 Strict Subject Focus (Only return exact topic matches)
              </span>
            </label>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSearching}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3 px-6 rounded-xl flex items-center justify-center space-x-2 transition disabled:opacity-50 shadow-xl shadow-emerald-950/40"
          >
            {isSearching ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{searchStatusText}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Search & Analyze Intelligence</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* FINAL RESULT VIEW */}
      {results && results.intelligence_result && (
        <div className="space-y-8 animate-fadeIn">
          {/* Executive Intelligence Brief Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
                  <span className="uppercase tracking-wider text-emerald-400">Executive Intelligence Summary</span>
                  <span>•</span>
                  <span className="capitalize">{results.input_modality} Input</span>
                  <span>•</span>
                  <span className="uppercase font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                    {results.language_name || results.target_language}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  {results.intelligence_result.title || `Intelligence Brief: ${results.query}`}
                </h2>
              </div>
              {getVerdictBadge(
                results.intelligence_result.authenticity_verdict,
                results.intelligence_result.authenticity_score
              )}
            </div>

            {/* Executive Summary */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Key Context & Synthesis</h3>
              <p className="text-sm md:text-base text-slate-200 leading-relaxed whitespace-pre-line bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                {results.intelligence_result.executive_summary}
              </p>
            </div>

            {/* Key Findings */}
            {results.intelligence_result.key_findings?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Key Intelligence Findings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.intelligence_result.key_findings.map((finding: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800/60 text-xs md:text-sm text-slate-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{finding}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fact Check Claims */}
            {results.intelligence_result.claims?.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Verified & Investigated Claims</h3>
                <div className="space-y-2">
                  {results.intelligence_result.claims.map((cl: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-white">{cl.claim}</div>
                        {cl.details && <div className="text-xs text-slate-400">{cl.details}</div>}
                      </div>
                      <span className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                        cl.status?.includes('Verified') || cl.status?.includes('सत्यापित') || cl.status?.includes('சரிபார்க்கப்பட்டது')
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : cl.status?.includes('Debunked') || cl.status?.includes('भ्रामक') || cl.status?.includes('தவறானது')
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {cl.status} ({cl.fact_checker || 'Fact Check Registry'})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multimodal Evidence Panel (if media was provided) */}
            {results.multimodal_evidence && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <Layers className="w-4 h-4" />
                  <span>Multimodal Evidence Breakdown</span>
                </div>
                {results.multimodal_evidence.ocr_text && (
                  <div className="text-xs text-slate-300">
                    <strong className="text-slate-400">Extracted OCR Text:</strong> {results.multimodal_evidence.ocr_text}
                  </div>
                )}
                {results.multimodal_evidence.transcript && (
                  <div className="text-xs text-slate-300">
                    <strong className="text-slate-400">Audio Track Transcript:</strong> {results.multimodal_evidence.transcript}
                  </div>
                )}
                {results.multimodal_evidence.keyframes?.length > 0 && (
                  <div className="text-xs text-slate-300 space-y-1">
                    <strong className="text-slate-400">Keyframe Visual Scenes:</strong>
                    <ul className="list-disc pl-5 space-y-0.5 text-slate-400">
                      {results.multimodal_evidence.keyframes.map((kf: string, i: number) => (
                        <li key={i}>{kf}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* DETAILED SOURCE CREDIBILITY & TIER EXPLORER */}
          <div className="space-y-6">
            {/* Header & Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">Discovered Live Reporting & Source Tiers</h3>
                <p className="text-xs text-slate-400">
                  Click any article to inspect full extracted text, key findings, and verification details on screen.
                </p>
              </div>

              {/* Interactive Tier Filter Tabs */}
              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTierFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedTierFilter === 'all'
                      ? 'bg-slate-200 text-slate-900 shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  All Sources ({allSources.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTierFilter(1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                    selectedTierFilter === 1
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/50 border border-emerald-800/40'
                  }`}
                >
                  <span>Tier 1: High Authority ({tier1Sources.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTierFilter(2)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                    selectedTierFilter === 2
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-blue-950/40 text-blue-400 hover:bg-blue-900/50 border border-blue-800/40'
                  }`}
                >
                  <span>Tier 2: Mainstream Press ({tier2Sources.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTierFilter(3)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                    selectedTierFilter === 3
                      ? 'bg-purple-600 text-white shadow'
                      : 'bg-purple-950/40 text-purple-400 hover:bg-purple-900/50 border border-purple-800/40'
                  }`}
                >
                  <span>Tier 3: Tech & Social ({tier3Sources.length})</span>
                </button>
              </div>
            </div>

            {/* Tier Explanation Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex items-start space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <strong className="text-emerald-400 font-bold block">Tier 1: High Authority (90–98%)</strong>
                  <span className="text-slate-400">Global news wires (Reuters, BBC, The Hindu, AP), government portals, and accredited fact-checkers.</span>
                </div>
              </div>
              <div className="flex items-start space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <strong className="text-blue-400 font-bold block">Tier 2: Mainstream Press (70–88%)</strong>
                  <span className="text-slate-400">Established editorial publications (TechCrunch, Indian Express, NDTV, Forbes, Wired).</span>
                </div>
              </div>
              <div className="flex items-start space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-400 flex-shrink-0 mt-1" />
                <div>
                  <strong className="text-purple-400 font-bold block">Tier 3: Community & Social (50–69%)</strong>
                  <span className="text-slate-400">Technical discussions (Hacker News), video broadcasts (YouTube), and community forums.</span>
                </div>
              </div>
            </div>

            {/* Discovered Sources Cards */}
            {displayedSources.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <Info className="w-6 h-6 text-slate-500 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">No sources found in this Tier filter.</div>
                <div className="text-xs text-slate-500">Switch to "All Sources" to view all corroborating reporting.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedSources.map((src: any, idx: number) => {
                  const tier = src.source_tier || 2;
                  const score = Math.round((src.credibility_score || (tier === 1 ? 0.95 : tier === 2 ? 0.80 : 0.65)) * 100);
                  return (
                    <div
                      key={idx}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-emerald-500/50 transition flex flex-col justify-between space-y-4 shadow-lg group cursor-pointer"
                      onClick={() => setActiveModalArticle(src)}
                    >
                      <div className="space-y-3">
                        {/* Source Header & Tier Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-1.5 truncate">
                            <span className="font-semibold text-xs text-white bg-slate-800 border border-slate-700 px-2 py-0.5 rounded truncate">
                              {src.source}
                            </span>
                            {tier === 1 && (
                              <span title="Verified News Wire / Fact Checker">
                                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              </span>
                            )}
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap ${
                              tier === 1
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : tier === 2
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            Tier {tier} • {score}% Trust
                          </span>
                        </div>

                        {/* Article Headline */}
                        <h4 className="font-bold text-white text-sm leading-snug group-hover:text-emerald-300 transition line-clamp-2">
                          {src.title}
                        </h4>

                        {/* Snippet / Description */}
                        {src.snippet && (
                          <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                            {src.snippet}
                          </p>
                        )}
                      </div>

                      {/* Card Action Controls */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveModalArticle(src);
                          }}
                          className="flex items-center space-x-1.5 font-semibold text-emerald-400 hover:text-emerald-300 transition bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-md"
                          title={src.url && (src.url.includes('youtube.com') || src.url.includes('youtu.be')) ? 'Watch YouTube Video In-App' : 'Read Clean Article In-App'}
                        >
                          {src.url && (src.url.includes('youtube.com') || src.url.includes('youtu.be')) ? (
                            <>
                              <Play className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                              <span>Watch In-App</span>
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Read In-App</span>
                            </>
                          )}
                        </button>

                        <a
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center space-x-1 text-slate-400 hover:text-white transition text-[11px]"
                          title="Open external original URL"
                        >
                          <span>External</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* IN-APP CONTENT INGESTION & MEDIA / ARTICLE VIEWER MODAL */}
      {activeModalArticle && (
        <ContentViewer
          url={activeModalArticle.url}
          title={activeModalArticle.title}
          snippet={activeModalArticle.snippet}
          source={activeModalArticle.source}
          sourceTier={activeModalArticle.source_tier}
          credibilityScore={activeModalArticle.credibility_score}
          onClose={() => setActiveModalArticle(null)}
        />
      )}
    </div>
  );
};
export default DiscoveryView;
