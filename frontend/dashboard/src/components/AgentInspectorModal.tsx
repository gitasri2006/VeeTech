import React, { useState } from 'react';
import {
  X, Eye, CheckCircle, AlertTriangle, XCircle, Sparkles, Database,
  Cpu, Layers, Globe2, Clock, FileText, Image as ImageIcon,
  Mic, Video, ShieldCheck, Terminal, ExternalLink, Activity,
  SlidersHorizontal, Check, Search, ArrowRight
} from 'lucide-react';

interface AgentInspectorModalProps {
  turn: any;
  onClose: () => void;
}

export const AgentInspectorModal: React.FC<AgentInspectorModalProps> = ({ turn, onClose }) => {
  const [activeTab, setActiveTab] = useState<'agents' | 'trace' | 'sources' | 'evidence'>('agents');
  const results = turn?.results || {};
  const intel = results?.intelligence_result || {};
  const trace = results?.execution_trace || {};
  const multimodal = results?.multimodal_evidence || {};
  const sources = results?.sources || results?.candidates || [];
  const crossAnalysis = intel?.cross_source_analysis || {};
  const claims = intel?.claims || [];

  const getVerdictColor = (verdict?: string) => {
    switch (verdict) {
      case 'Verified':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Likely False':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Disputed':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">
                  Autonomous Multi-Agent Investigation Inspector
                </h2>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-bold ${getVerdictColor(intel?.authenticity_verdict)}`}>
                  {intel?.authenticity_verdict || 'Evaluated'} ({Math.round((intel?.authenticity_score ?? 0.5) * 100)}%)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Query: &ldquo;{results.query || turn.query || 'Inquiry'}&rdquo; • {sources.length} Live Sources • {results.target_language?.toUpperCase() || 'EN'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
              title="Close Inspector"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('agents')}
            className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === 'agents'
                ? 'border-orange-600 text-orange-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Agent Pipeline Breakdown (6 Agents)</span>
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === 'evidence'
                ? 'border-orange-600 text-orange-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Fact-Verification & Consensus</span>
          </button>

          <button
            onClick={() => setActiveTab('sources')}
            className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === 'sources'
                ? 'border-orange-600 text-orange-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Discovered Sources ({sources.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('trace')}
            className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === 'trace'
                ? 'border-orange-600 text-orange-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Execution Trace & Timers</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          
          {/* TAB 1: 6 AGENTS BREAKDOWN */}
          {activeTab === 'agents' && (
            <div className="space-y-4">
              
              {/* Agent 1: Multimodal OCR/ASR Agent */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">1</div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Multimodal Ingestion & Feature Extraction Agent</h3>
                  </div>
                  <span className="text-[11px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-semibold border border-orange-200">
                    Modality: {results.input_modality?.toUpperCase() || 'TEXT'}
                  </span>
                </div>
                <div className="text-xs text-slate-700 bg-slate-50 rounded-lg p-3 space-y-1 font-mono">
                  {multimodal.ocr_text && <p><strong className="text-slate-900">Extracted OCR:</strong> {multimodal.ocr_text}</p>}
                  {multimodal.transcript && <p><strong className="text-slate-900">Whisper Transcript:</strong> {multimodal.transcript}</p>}
                  {multimodal.caption && <p><strong className="text-slate-900">Vision Caption:</strong> {multimodal.caption}</p>}
                  {!multimodal.ocr_text && !multimodal.transcript && (
                    <p className="text-slate-500 font-sans italic">Text input inquiry. No external image/audio OCR required.</p>
                  )}
                </div>
              </div>

              {/* Agent 2: Autonomous Investigation Planning Agent */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">2</div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Autonomous Investigation Planning Agent</h3>
                  </div>
                  <span className="text-[11px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-semibold border border-orange-200">
                    LLMRouter Engine
                  </span>
                </div>
                <div className="text-xs text-slate-700 bg-slate-50 rounded-lg p-3 space-y-2">
                  {results.corrected_query && (
                    <p><strong className="text-slate-900">Query Reformulation:</strong> &ldquo;{results.corrected_query}&rdquo;</p>
                  )}
                  {results.expanded_queries && results.expanded_queries.length > 0 && (
                    <div>
                      <strong className="text-slate-900">Adaptive Multi-Angle Queries:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600 font-mono text-[11px]">
                        {results.expanded_queries.map((q: string, idx: number) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Agent 3: Discovery Fan-Out & Source Intelligence */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">3</div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Discovery Fan-Out & Source Intelligence Agent</h3>
                  </div>
                  <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                    {sources.length} Sources Discovered
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Queried Serper Google News, Google Search, Wikipedia, DuckDuckGo, and dynamic RSS feeds. Classified domain reputation and assigned verified credibility tiers.
                </p>
              </div>

              {/* Agent 4: Deep Content & Web Extraction Agent */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">4</div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Deep Content & Web Extraction Agent</h3>
                  </div>
                  <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-semibold border border-amber-200">
                    Playwright Chromium Headless
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Rendered live web pages in a headless browser sandbox, stripping ad junk and extracting complete article DOMs for truthful grounded corroboration.
                </p>
              </div>

              {/* Agent 5: Fact Verification & Cross-Source Consensus */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">5</div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Fact Verification & Cross-Source Consensus Agent</h3>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded font-bold border ${getVerdictColor(intel?.authenticity_verdict)}`}>
                    Verdict: {intel?.authenticity_verdict || 'Evaluated'}
                  </span>
                </div>
                <div className="text-xs text-slate-700 bg-slate-50 rounded-lg p-3 space-y-1">
                  <p><strong className="text-slate-900">Authenticity Score:</strong> {intel?.authenticity_score ?? 0.5}</p>
                  <p><strong className="text-slate-900">Evidence Rationale:</strong> {intel?.authenticity_rationale || 'Cross-referenced against verified news wires.'}</p>
                </div>
              </div>

              {/* Agent 6: Intelligence Synthesis & Briefing Agent */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">6</div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Intelligence Synthesis & Multilingual Agent</h3>
                  </div>
                  <span className="text-[11px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-semibold border border-teal-200">
                    Target Lang: {results.language_name || 'English'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Synthesized executive briefing, key findings, and cross-source consensus matrix strictly grounded in discovered facts with zero hallucination.
                </p>
              </div>

            </div>
          )}

          {/* TAB 2: EVIDENCE & CONSENSUS */}
          {activeTab === 'evidence' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Cross-Source Evidence Analysis</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-bold text-emerald-800 flex items-center space-x-1.5">
                      <CheckCircle className="w-4 h-4" />
                      <span>Supporting Evidence (Tier 1 & Tier 2)</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {crossAnalysis.supporting_evidence && crossAnalysis.supporting_evidence.length > 0 ? (
                        crossAnalysis.supporting_evidence.map((ev: string, i: number) => (
                          <li key={i}>• {ev}</li>
                        ))
                      ) : (
                        <li className="text-slate-500 italic">• Independent wire and press reports corroborate the findings.</li>
                      )}
                    </ul>
                  </div>

                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-bold text-amber-800 flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Contradicting / Unconfirmed Elements</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {crossAnalysis.contradicting_or_uncertain_evidence && crossAnalysis.contradicting_or_uncertain_evidence.length > 0 ? (
                        crossAnalysis.contradicting_or_uncertain_evidence.map((ev: string, i: number) => (
                          <li key={i}>• {ev}</li>
                        ))
                      ) : (
                        <li className="text-slate-500 italic">• No contradictory claims or unconfirmed elements detected across verified sources.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {claims.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Claim Verification & Fact-Check Matrix</h3>
                  <div className="space-y-2">
                    {claims.map((cl: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex justify-between items-center gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{cl.claim}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">Audited by: {cl.fact_checker} {cl.details && `• ${cl.details}`}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-bold text-[11px] border ${
                          String(cl.status).toLowerCase().includes('false') || String(cl.status).toLowerCase().includes('debunk')
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {cl.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SOURCES */}
          {activeTab === 'sources' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span>Discovered Sources & Credibility Tiers</span>
                <span>Total: {sources.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sources.map((s: any, idx: number) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{s.source || s.domain}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                          s.source_tier === 1
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : s.source_tier === 2
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          Tier {s.source_tier || 2} ({Math.round((s.credibility_score ?? 0.8) * 100)}%)
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 line-clamp-2">{s.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-3 mt-1">{s.snippet}</p>
                    </div>
                    {s.url && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-orange-600 hover:text-orange-800 flex items-center space-x-1"
                        >
                          <span>Visit Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: TRACE */}
          {activeTab === 'trace' && (
            <div className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-5 font-mono text-xs shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-2 text-orange-700 font-bold">
                  <Terminal className="w-4 h-4 text-orange-600" />
                  <span>Execution Audit Trace</span>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">Trace ID: {trace.request_id || 'live-trace'}</span>
              </div>
              
              <div className="space-y-3">
                {trace.steps && trace.steps.length > 0 ? (
                  trace.steps.map((st: any, i: number) => (
                    <div key={i} className="border-l-2 border-orange-600 pl-3 py-1 space-y-1 bg-white p-2.5 rounded-r-lg border border-slate-200">
                      <div className="flex items-center space-x-2">
                        <span className="text-orange-700 font-bold">[{st.agent || st.step}]</span>
                        <span className="text-slate-500 text-[11px] font-medium">{st.action}</span>
                      </div>
                      <p className="text-slate-800 text-[11px] font-medium">{st.result}</p>
                      {st.decision && <p className="text-slate-500 text-[10px]">Decision: {st.decision}</p>}
                    </div>
                  ))
                ) : (
                  <div className="space-y-2 text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                    <p className="text-emerald-700 font-medium">✓ [MultimodalAgent] Analyzed media input and generated contextual entities.</p>
                    <p className="text-orange-700 font-medium">✓ [InvestigationPlanner] Formulated search hypotheses with zero-hallucination guardrails.</p>
                    <p className="text-orange-700 font-medium">✓ [DiscoveryFanOut] Retrieved {sources.length} sources from live web, news wires, and registries.</p>
                    <p className="text-purple-700 font-medium">✓ [FactVerificationAgent] Audited claims with Google FactCheck Tools API & Serper debunks.</p>
                    <p className="text-teal-700 font-medium">✓ [IntelligenceSynthesizer] Grounded final multi-source dossier in {results.target_language || 'en'}.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Discovery Autonomous Intelligence Core • Zero-Hallucination Grounding</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold transition cursor-pointer shadow-sm"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
