import React from 'react';
import {
  FileText, ShieldCheck, ShieldAlert, AlertTriangle, ExternalLink,
  CheckCircle2, XCircle, ArrowLeft, Image as ImageIcon, Video, Mic
} from 'lucide-react';
import { FactCheckVerdict } from '../types';

interface StoryDetailViewProps {
  storyId: string;
  onBack: () => void;
}

export const StoryDetailView: React.FC<StoryDetailViewProps> = ({ storyId, onBack }) => {
  const story = {
    id: storyId || 'art-001',
    title: 'Tata Motors inaugurates advanced commercial EV hub in Pune',
    canonical_url: 'https://reuters.com/business/tata-motors-pune-ev-hub-2026',
    source: 'Reuters Business Wire',
    source_tier: 1,
    author: 'Aditi Sharma, Senior Automotive Correspondent',
    published_at: '2026-09-18T09:30:00Z',
    language: 'en',
    media_type: 'text',
    authenticity_score: 0.94,
    verdict: 'Verified' as FactCheckVerdict,
    manipulated_media_flag: false,
    stale_context_flag: false,
    needs_human_review: false,
    extracted_text: `Tata Motors has officially commenced operations at its dedicated zero-emission commercial vehicle manufacturing complex in Pune. 
The facility will focus on the assembly of heavy-duty electric trucks and state transit buses featuring next-generation lithium-iron phosphate battery packs with high thermal stability.
According to company executives, the platform incorporates indigenous software telemetry developed in partnership with regional technology centers across Bengaluru.`,
    evidence_sources: [
      {
        source: 'Reuters Official Wire',
        status: 'corroborating',
        url: 'https://reuters.com/business/tata-motors-pune-ev-hub-2026',
        summary: 'Primary reporting from ribbon-cutting ceremony attended by state transport ministers.',
      },
      {
        source: 'Press Information Bureau (PIB)',
        status: 'corroborating',
        url: 'https://pib.gov.in/pressrelease/tata-ev-facility',
        summary: 'Official gazette notification approving industrial production subsidies.',
      },
      {
        source: 'NDTV Auto News',
        status: 'corroborating',
        url: 'https://ndtv.com/auto/tata-motors-ev-expansion-pune',
        summary: 'Broadcast footage confirms infrastructure and vehicle test drive trials.',
      },
    ],
    validation: {
      matched_entity: 'Tata Motors EV',
      confidence: 0.92,
      sentiment: 'positive',
      reason: "Entity 'Tata Motors EV' is clearly mentioned in domain-relevant automotive commercial fleet context.",
      validated_by: 'Contextual Validation & Semantic Disambiguation',
    },
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 bg-slate-50 text-slate-900 min-h-screen font-sans">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Stream</span>
      </button>

      {/* Main Title & Verdict Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Tier 1 Authority
            </span>
            <span className="text-xs text-slate-500 font-medium">{story.source}</span>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-4 h-4" />
            <span>AUTHENTICITY SCORE: {Math.round(story.authenticity_score * 100)}% (VERIFIED)</span>
          </div>
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-snug">{story.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>By <strong className="text-slate-800">{story.author}</strong></span>
          <span>•</span>
          <span>Published: {new Date(story.published_at).toLocaleString()}</span>
          <span>•</span>
          <a
            href={story.canonical_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1 text-indigo-600 hover:underline font-semibold"
          >
            <span>Canonical Source</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Extracted Text and Validation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Full Extracted Text */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Extracted Normalized Content</span>
          </h2>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
            {story.extracted_text}
          </div>

          {/* Evidence Corroboration List */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Multi-Source Evidence Corroboration
            </h3>
            <div className="space-y-2">
              {story.evidence_sources.map((ev, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{ev.source}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed font-medium">{ev.summary}</p>
                  </div>
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Validation & Integrity Signals */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Contextual Validation
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Matched Entity</span>
                <span className="font-bold text-slate-900">{story.validation.matched_entity}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Confidence Score</span>
                <span className="font-bold text-emerald-600">{Math.round(story.validation.confidence * 100)}%</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Semantic Sentiment</span>
                <span className="font-bold text-slate-900 capitalize">{story.validation.sentiment}</span>
              </div>
              <div className="py-2">
                <span className="text-slate-500 block mb-1 font-semibold">Semantic Reasoning</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed font-medium">
                  {story.validation.reason}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Media Integrity Signals
            </h2>
            <div className="space-y-2.5 text-xs font-semibold">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span>Manipulated Media Flag</span>
                <span>CLEAR</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span>Stale Context / Recycled Claim</span>
                <span>ORIGINAL</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                <span>Human Review Required</span>
                <span>NO (AUTO-CLEARED)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
