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
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Stream</span>
      </button>

      {/* Main Title & Verdict Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Tier 1 Authority
            </span>
            <span className="text-xs text-slate-400">{story.source}</span>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4" />
            <span>AUTHENTICITY SCORE: {Math.round(story.authenticity_score * 100)}% (VERIFIED)</span>
          </div>
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-white leading-snug">{story.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800">
          <span>By <strong>{story.author}</strong></span>
          <span>•</span>
          <span>Published: {new Date(story.published_at).toLocaleString()}</span>
          <span>•</span>
          <a
            href={story.canonical_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1 text-emerald-400 hover:underline"
          >
            <span>Canonical Source</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Grid: Story Text + Evidence Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Full Extracted Story */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Extracted & Normalized Content
            </h2>
            <div className="prose prose-invert max-w-none text-xs leading-relaxed text-slate-300 whitespace-pre-line font-mono bg-slate-950 p-4 rounded-lg border border-slate-800">
              {story.extracted_text}
            </div>
          </div>

          {/* Contextual Validation Disambiguation Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Contextual Disambiguation Audit
            </h2>
            <div className="grid grid-cols-2 gap-4 text-xs text-slate-300">
              <div>Matched Entity: <strong className="text-white">{story.validation.matched_entity}</strong></div>
              <div>Disambiguation Confidence: <strong className="text-emerald-400">{Math.round(story.validation.confidence * 100)}%</strong></div>
              <div>Sentiment Classification: <strong className="text-emerald-400 capitalize">{story.validation.sentiment}</strong></div>
              <div>Validated Engine: <strong className="text-slate-200">{story.validation.validated_by}</strong></div>
            </div>
            <p className="text-xs text-slate-400 italic bg-slate-950/60 p-3 rounded border border-slate-800">
              "{story.validation.reason}"
            </p>
          </div>
        </div>

        {/* Right Column: Evidence & Corroboration Panel */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
              <span>Evidence Trail ({story.evidence_sources.length})</span>
              <span className="text-[10px] text-emerald-400 font-mono">3/3 Corroborated</span>
            </h2>

            <div className="space-y-3">
              {story.evidence_sources.map((ev, i) => (
                <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{ev.source}</span>
                    <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="capitalize">{ev.status}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{ev.summary}</p>
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 text-[11px] text-emerald-400 hover:underline pt-1"
                  >
                    <span>View Primary Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>

            {/* Media Forensics Indicator */}
            <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-slate-300">Media Forensics & Reverse Image Check:</span>
              <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400">Deepfake / Tamper Flag:</span>
                <span className="text-emerald-400 font-bold">CLEAN (0.02)</span>
              </div>
              <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400">Stale Context Recycled Flag:</span>
                <span className="text-emerald-400 font-bold">FALSE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
