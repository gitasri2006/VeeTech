import React, { useState } from 'react';
import {
  Newspaper, ShieldCheck, ShieldAlert, AlertTriangle, HelpCircle,
  ExternalLink, Layers, Eye, Languages, Check, ArrowUpRight
} from 'lucide-react';
import { FactCheckVerdict } from '../types';

interface FeedViewProps {
  onSelectStory: (storyId: string) => void;
}

export const FeedView: React.FC<FeedViewProps> = ({ onSelectStory }) => {
  const [selectedVerdict, setSelectedVerdict] = useState<string>('All');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState('');

  const sampleStories = [
    {
      id: 'art-001',
      title: 'Tata Motors inaugurates advanced commercial EV hub in Pune',
      source: 'reuters.com',
      source_tier: 1,
      language: 'en',
      media_type: 'text',
      authenticity_score: 0.94,
      verdict: 'Verified' as FactCheckVerdict,
      sentiment: 'positive',
      confidence: 0.92,
      published_at: '15 mins ago',
      summary: 'Tata Motors has officially commenced operations at its dedicated zero-emission commercial vehicle manufacturing complex in Pune, focusing on heavy electric trucks and state transit buses.',
      evidence_count: 3,
    },
    {
      id: 'art-002',
      title: 'टाटा मोटर्स ने बेंगलुरु में अगली पीढ़ी की इलेक्ट्रिक तकनीक की घोषणा की',
      source: 'thehindu.com',
      source_tier: 1,
      language: 'hi',
      translated_text: 'Tata Motors announces next-generation electric vehicle mobility architecture in Bengaluru.',
      media_type: 'text',
      authenticity_score: 0.88,
      verdict: 'Verified' as FactCheckVerdict,
      sentiment: 'positive',
      confidence: 0.89,
      published_at: '45 mins ago',
      summary: 'State transport corporations collaborate on integrated telemetry platforms for regional fleet management.',
      evidence_count: 2,
    },
    {
      id: 'art-003',
      title: 'UNESCO officially ranks Indian National Anthem as best in the world for 2026',
      source: 'WhatsApp Viral Forward',
      source_tier: 3,
      language: 'en',
      media_type: 'text',
      authenticity_score: 0.12,
      verdict: 'Likely False' as FactCheckVerdict,
      sentiment: 'neutral',
      confidence: 0.95,
      published_at: '1 hour ago',
      summary: 'Viral forwarded message claiming international anthem award. Debunked by Alt News and BOOM Live as fabricated.',
      evidence_count: 4,
      needs_review: true,
    },
    {
      id: 'art-004',
      title: 'Alleged leak reveals secret boardroom discussions regarding defense drone merger',
      source: 'unverified-blog.net',
      source_tier: 3,
      language: 'en',
      media_type: 'image',
      authenticity_score: 0.42,
      verdict: 'Disputed' as FactCheckVerdict,
      sentiment: 'critical',
      confidence: 0.68,
      published_at: '2 hours ago',
      summary: 'Conflicting statements reported between primary manufacturers. Government press office has not confirmed talks.',
      evidence_count: 2,
      needs_review: true,
    },
  ];

  const getVerdictBadge = (verdict: FactCheckVerdict, score: number) => {
    switch (verdict) {
      case 'Verified':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified ({Math.round(score * 100)}%)</span>
          </span>
        );
      case 'Likely False':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Likely False ({Math.round(score * 100)}%)</span>
          </span>
        );
      case 'Disputed':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Disputed ({Math.round(score * 100)}%)</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Unverified ({Math.round(score * 100)}%)</span>
          </span>
        );
    }
  };

  const getTierBadge = (tier: number) => {
    if (tier === 1) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Tier 1 Authority</span>;
    } else if (tier === 2) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Tier 2 Mainstream</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">Tier 3 Aggregator / UGC</span>;
  };

  const filteredStories = sampleStories.filter((s) => {
    if (selectedVerdict !== 'All' && s.verdict !== selectedVerdict) return false;
    if (selectedLanguage !== 'All' && s.language !== selectedLanguage) return false;
    if (searchFilter && !s.title.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Newspaper className="w-4 h-4" />
            <span>Filtering & Contextual Validation (Agents 5 & 6)</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Unified Real-Time Story Stream</h1>
        </div>

        {/* Search input */}
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Search stories in feed..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-xs">
        <span className="text-slate-400 font-semibold mr-2">Authenticity:</span>
        {['All', 'Verified', 'Unverified', 'Disputed', 'Likely False'].map((v) => (
          <button
            key={v}
            onClick={() => setSelectedVerdict(v)}
            className={`px-3 py-1 rounded-full font-medium transition border ${
              selectedVerdict === v
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {v}
          </button>
        ))}

        <div className="h-4 w-px bg-slate-800 mx-2" />

        <span className="text-slate-400 font-semibold mr-2">Language:</span>
        {['All', 'en', 'hi', 'ta', 'te', 'fr', 'es'].map((l) => (
          <button
            key={l}
            onClick={() => setSelectedLanguage(l)}
            className={`px-2.5 py-1 rounded font-mono font-medium transition uppercase border ${
              selectedLanguage === l
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Story Cards List */}
      <div className="space-y-4">
        {filteredStories.map((story) => (
          <div
            key={story.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition shadow-lg space-y-4"
          >
            {/* Top Meta Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                {getTierBadge(story.source_tier)}
                <span className="text-xs font-semibold text-slate-300">{story.source}</span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-400">{story.published_at}</span>
              </div>
              <div>{getVerdictBadge(story.verdict, story.authenticity_score)}</div>
            </div>

            {/* Story Title & Multilingual Subtitle */}
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-white hover:text-emerald-400 transition cursor-pointer" onClick={() => onSelectStory(story.id)}>
                {story.title}
              </h2>
              {story.translated_text && (
                <div className="flex items-start space-x-2 text-xs text-emerald-300/90 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <Languages className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>English Pivot:</strong> {story.translated_text}</span>
                </div>
              )}
            </div>

            {/* Story Summary */}
            <p className="text-xs text-slate-300 leading-relaxed">{story.summary}</p>

            {/* Bottom Meta & Action Links */}
            <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <div className="flex items-center space-x-4 text-slate-400">
                <span>Disambiguation Confidence: <strong className="text-slate-200">{Math.round(story.confidence * 100)}%</strong></span>
                <span>•</span>
                <span>Evidence Sources: <strong className="text-slate-200">{story.evidence_count}</strong></span>
              </div>

              <button
                onClick={() => onSelectStory(story.id)}
                className="flex items-center space-x-1.5 text-emerald-400 hover:text-emerald-300 font-semibold transition"
              >
                <span>Inspect Evidence & Forensics</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
