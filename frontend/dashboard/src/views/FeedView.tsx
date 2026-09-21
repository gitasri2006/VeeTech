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
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified ({Math.round(score * 100)}%)</span>
          </span>
        );
      case 'Likely False':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Likely False ({Math.round(score * 100)}%)</span>
          </span>
        );
      case 'Disputed':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Disputed ({Math.round(score * 100)}%)</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Unverified</span>
          </span>
        );
    }
  };

  const filteredStories = sampleStories.filter((st) => {
    if (selectedVerdict !== 'All' && st.verdict !== selectedVerdict) return false;
    if (selectedLanguage !== 'All' && st.language !== selectedLanguage) return false;
    if (searchFilter && !st.title.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 text-slate-900 min-h-screen font-sans">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2.5">
            <Newspaper className="w-6 h-6 text-indigo-600" />
            <span>Unified Real-Time Ingested Feed</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Global media streams, verified fact checks, and multimodal cross-language ingestions.
          </p>
        </div>

        {/* Search input */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search stories or keywords..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm"
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        {/* Verdict Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Verdict:</span>
          {['All', 'Verified', 'Disputed', 'Likely False'].map((v) => (
            <button
              key={v}
              onClick={() => setSelectedVerdict(v)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedVerdict === v
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Language Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Language:</span>
          {['All', 'en', 'hi', 'ta'].map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition ${
                selectedLanguage === lang
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Stories Grid */}
      <div className="space-y-4">
        {filteredStories.map((story) => (
          <div
            key={story.id}
            onClick={() => onSelectStory(story.id)}
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition shadow-sm hover:shadow-md cursor-pointer space-y-3 group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center space-x-2.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">{story.source}</span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Tier {story.source_tier}
                  </span>
                  <span>•</span>
                  <span className="uppercase font-mono text-[11px]">{story.language}</span>
                  <span>•</span>
                  <span>{story.published_at}</span>
                </div>

                <h3 className="text-base md:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition">
                  {story.title}
                </h3>

                {story.translated_text && (
                  <p className="text-xs text-indigo-700 bg-indigo-50 p-2 rounded-lg border border-indigo-100 font-medium">
                    <span className="font-bold">Translated:</span> {story.translated_text}
                  </p>
                )}

                <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-2">
                  {story.summary}
                </p>
              </div>

              <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                {getVerdictBadge(story.verdict, story.authenticity_score)}
                <span className="text-[11px] text-indigo-600 font-semibold flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                  <span>View Evidence</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
