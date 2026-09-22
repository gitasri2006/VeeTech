import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, Image as ImageIcon, Mic, Video, Globe2,
  CheckCircle2, AlertTriangle, XCircle, HelpCircle, ExternalLink,
  Layers, ShieldCheck, RefreshCw, UploadCloud, Check, Info, X,
  BookOpen, Clock, Building, Compass, MessageSquare, ChevronRight,
  Copy, ArrowDown, User, Bot, Search, FileText, CheckCircle,
  Folder, Cpu, MoreHorizontal, PanelLeft, PanelLeftClose, Trash2,
  BookMarked, Edit3, Plus, Library, Menu, Play, Tv, Eye, SlidersHorizontal,
  Settings, MapPin, FileDown, Download
} from 'lucide-react';
import { api, UnifiedSearchOptions } from '../services/api';
import { UserRole, Rule } from '../types';
import { MediaAutomationBackground } from '../components/MediaAutomationBackground';
import { ContentViewer } from '../components/content';
import { AgentInspectorModal } from '../components/AgentInspectorModal';
import { Interactive3DGlobe } from '../components/Interactive3DGlobe';
import { exportDossierToDocx } from '../services/docxExport';

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

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  query?: string;
  timestamp: string;
  modality?: 'text' | 'image' | 'audio' | 'video';
  mediaFileName?: string;
  mediaBase64?: string;
  mediaMimeType?: string;
  results?: any;
  error?: string;
  appliedRuleName?: string;
  appliedRuleTier?: number;
}

interface InquirySession {
  id: string;
  title: string;
  timestamp: string;
  messages: ChatTurn[];
}

const PIPELINE_STEPS = [
  { id: 1, name: 'Input', agent: 'Agent 10: Ingestion', desc: 'Parsing multimodal input & parameters' },
  { id: 2, name: 'Extract', agent: 'Agent 2: Extraction', desc: 'Extracting media metadata, OCR & text' },
  { id: 3, name: 'Discover', agent: 'Agent 1: Discovery', desc: 'Querying real-time global live feeds' },
  { id: 4, name: 'Normalize', agent: 'Agent 3: Multilingual', desc: 'Cross-language translation & normalization' },
  { id: 5, name: 'Entities', agent: 'Agent 4: Entity Profile', desc: 'Resolving knowledge graph entity profiles' },
  { id: 6, name: 'Validate', agent: 'Agent 6: Validation', desc: 'Checking contextual trust & source reliability' },
  { id: 7, name: 'Fact Check', agent: 'Agent 7: Fact-Checking', desc: 'Querying Google FactCheck & claim registry' },
  { id: 8, name: 'Cluster', agent: 'Agent 9: Clustering', desc: 'Story deduplication & vector clustering' },
  { id: 9, name: 'Generate', agent: 'Agent 8: Intelligence', desc: 'Synthesizing executive brief & final consensus' },
];

export interface DiscoveryChatViewProps {
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    organization?: string;
    designation?: string;
  } | null;
  onUpdateUser?: (updated: { id: string; name: string; email: string; role: UserRole; organization?: string; designation?: string }) => void;
  activeSessionId?: string;
  sessions?: InquirySession[];
  onUpdateSessions?: (updated: InquirySession[]) => void;
  newInquiryTrigger?: number;
  onNewInquiry?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: (open: boolean) => void;
  onOpenSettings?: () => void;
  onOpenRules?: () => void;
}

export const DiscoveryChatView: React.FC<DiscoveryChatViewProps> = ({
  currentUser,
  onUpdateUser,
  activeSessionId: propActiveSessionId,
  sessions: propSessions,
  onUpdateSessions,
  newInquiryTrigger,
  onNewInquiry,
  isSidebarOpen = true,
  onToggleSidebar,
  onOpenSettings,
  onOpenRules,
}) => {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [selectedModality, setSelectedModality] = useState<'text' | 'image' | 'audio' | 'video'>('text');

  // Profile preferences modal state triggered right after login on discovery page
  const [showProfileModal, setShowProfileModal] = useState<boolean>(() => {
    return sessionStorage.getItem('open_profile_setup_on_discovery') === 'true';
  });
  const [profileName, setProfileName] = useState<string>(currentUser?.name || (currentUser?.email ? currentUser.email.split('@')[0] : ''));
  const [profileEmail, setProfileEmail] = useState<string>(currentUser?.email || '');
  const [profileRole, setProfileRole] = useState<UserRole>(currentUser?.role || 'Analyst');
  const [profileOrg, setProfileOrg] = useState<string>(currentUser?.organization || 'Enterprise Intelligence Network');
  const [profileDesignation, setProfileDesignation] = useState<string>(currentUser?.designation || 'Lead Intelligence Analyst');
  const [profileSavedToast, setProfileSavedToast] = useState<boolean>(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      id: currentUser?.id || `usr-${Date.now()}`,
      name: profileName || profileEmail.split('@')[0],
      email: profileEmail,
      role: profileRole,
      organization: profileOrg,
      designation: profileDesignation,
    };
    if (onUpdateUser) {
      onUpdateUser(updated);
    }
    sessionStorage.removeItem('open_profile_setup_on_discovery');
    setProfileSavedToast(true);
    setTimeout(() => {
      setShowProfileModal(false);
      setProfileSavedToast(false);
    }, 800);
  };
  
  const activeSessionId = propActiveSessionId || 'sess-1';
  const sessions = propSessions || [];

  useEffect(() => {
    if (activeSessionId && sessions.length > 0) {
      const found = sessions.find((s) => s.id === activeSessionId);
      if (found) {
        setMessages(found.messages || []);
        setInputQuery('');
        setAttachedFile(null);
      }
    }
  }, [activeSessionId, sessions]);

  useEffect(() => {
    if (newInquiryTrigger && newInquiryTrigger > 0) {
      setMessages([]);
      setInputQuery('');
      setAttachedFile(null);
      setSelectedModality('text');
    }
  }, [newInquiryTrigger]);

  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    base64: string;
    mimeType: string;
    modality: 'image' | 'audio' | 'video';
  } | null>(null);

  const [availableRules, setAvailableRules] = useState<Rule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [inspectingTurn, setInspectingTurn] = useState<ChatTurn | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineStepIndex, setPipelineStepIndex] = useState<number>(1);
  const [activeStep, setActiveStep] = useState<string>('');
  const [activeModalArticle, setActiveModalArticle] = useState<any | null>(null);
  const [selectedTierFilter, setSelectedTierFilter] = useState<{ [turnId: string]: 'all' | 1 | 2 | 3 }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const refreshAvailableRules = useCallback(async () => {
    try {
      let combinedRules: Rule[] = [];
      // 1. Read from local storage
      try {
        const stored = localStorage.getItem('discovery_user_rules');
        if (stored) {
          const parsed: Rule[] = JSON.parse(stored);
          if (Array.isArray(parsed)) combinedRules = [...parsed];
        }
      } catch (e) {}

      // 2. Fetch from backend API
      const rList = await api.listRules();
      if (Array.isArray(rList)) {
        rList.forEach((r) => {
          const idx = combinedRules.findIndex((c) => c.id === r.id);
          if (idx >= 0) {
            combinedRules[idx] = { ...combinedRules[idx], ...r, name: r.name || combinedRules[idx].name };
          } else {
            combinedRules.push(r);
          }
        });
      }

      setAvailableRules(combinedRules);
    } catch (e) {
      console.warn('Rule fetch notice:', e);
    }
  }, []);

  useEffect(() => {
    refreshAvailableRules();
    window.addEventListener('discovery_rules_updated', refreshAvailableRules);
    window.addEventListener('storage', refreshAvailableRules);
    return () => {
      window.removeEventListener('discovery_rules_updated', refreshAvailableRules);
      window.removeEventListener('storage', refreshAvailableRules);
    };
  }, [refreshAvailableRules]);

  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      setPipelineStepIndex(1);
      interval = setInterval(() => {
        setPipelineStepIndex((prev) => (prev < 9 ? prev + 1 : prev));
      }, 600);
    } else {
      setPipelineStepIndex(1);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing]);

  const scrollToTurn = (turnId: string) => {
    setTimeout(() => {
      const el = document.getElementById(`chat-turn-${turnId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      scrollToTurn(lastMsg.id);
    }
  }, [messages.length]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, modality: 'image' | 'audio' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      const mime = file.type || (modality === 'image' ? 'image/png' : modality === 'audio' ? 'audio/mp3' : 'video/mp4');
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFile({
          name: file.name,
          base64: reader.result as string,
          mimeType: mime,
          modality: modality,
        });
        setSelectedModality(modality);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearAttachment = () => {
    setAttachedFile(null);
    setSelectedModality('text');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startNewInquiry = () => {
    if (onNewInquiry) {
      onNewInquiry();
    } else {
      setMessages([]);
      setInputQuery('');
      setAttachedFile(null);
    }
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const executeSearch = async (queryText?: string, targetSessId?: string) => {
    const effectiveQuery = (queryText !== undefined ? queryText : inputQuery).trim();
    if (!effectiveQuery && !attachedFile) return;

    const currentModality = attachedFile ? attachedFile.modality : 'text';
    const currentAttachment = attachedFile;

    const userTurn: ChatTurn = {
      id: `turn-${Date.now()}`,
      role: 'user',
      query: effectiveQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modality: currentModality,
      mediaFileName: currentAttachment?.name,
      mediaBase64: currentAttachment?.base64,
      mediaMimeType: currentAttachment?.mimeType,
    };

    const newMessages = [...messages, userTurn];
    setMessages(newMessages);
    setInputQuery('');
    setAttachedFile(null);
    setIsProcessing(true);

    const sessId = targetSessId || activeSessionId;
    if (onUpdateSessions) {
      const existing = sessions.find((s) => s.id === sessId);
      if (existing) {
        onUpdateSessions(
          sessions.map((s) =>
            s.id === sessId
              ? {
                  ...s,
                  title: s.title === 'New Inquiry' ? effectiveQuery || currentAttachment?.name || 'Inquiry' : s.title,
                  messages: newMessages,
                }
              : s
          )
        );
      } else {
        const newSession: InquirySession = {
          id: sessId,
          title: effectiveQuery || currentAttachment?.name || 'Inquiry',
          timestamp: 'Just now',
          messages: newMessages,
        };
        onUpdateSessions([newSession, ...sessions]);
      }
    }

    const conversationHistory: { role: string; content: string }[] = [];
    const previousSources: any[] = [];
    messages.forEach((m) => {
      if (m.role === 'user' && m.query) {
        conversationHistory.push({ role: 'user', content: m.query });
      } else if (m.role === 'assistant' && m.results) {
        conversationHistory.push({ role: 'assistant', content: m.results?.intelligence_result?.executive_summary || '' });
        if (Array.isArray(m.results?.sources)) {
          previousSources.push(...m.results.sources);
        }
      }
    });

    const activeRule = availableRules.find((r) => r.id === selectedRuleId);
    const customScope = activeRule ? {
      min_tier: activeRule.min_source_tier || activeRule.domain_rules?.min_tier || 2,
      allowed_domains: activeRule.domain_rules?.allowed_domains,
      blocked_domains: activeRule.domain_rules?.blocked_domains,
      recency_window: activeRule.recency_window,
      must_include: activeRule.boolean_terms?.must_include,
      must_not_include: activeRule.boolean_terms?.must_not_include,
      geography: activeRule.geo_filter?.countries || ['global'],
      rule_id: activeRule.id,
      rule_name: activeRule.name || activeRule.id,
    } : undefined;

    const searchOptions: UnifiedSearchOptions = {
      query: effectiveQuery || undefined,
      inputModality: currentModality,
      targetLanguage: targetLanguage,
      mediaFileName: currentAttachment?.name,
      mediaBase64: currentAttachment?.base64,
      mediaMimeType: currentAttachment?.mimeType,
      conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
      previousSources: previousSources.length > 0 ? previousSources.slice(-20) : undefined,
      scope: customScope,
    };

    try {
      if (currentModality !== 'text' && currentAttachment?.base64) {
        setActiveStep(`Performing live OCR & Vision analysis on ${currentAttachment.name}...`);
      } else {
        setActiveStep('Connecting to live news feeds and querying Google Fact Check registries...');
      }

      const res = await api.searchUnifiedDiscovery(searchOptions);

      setActiveStep('Synthesizing executive brief & cross-source consensus...');

      // Strictly filter returned sources by active rule criteria if rule is selected
      if (activeRule && res && Array.isArray(res.sources)) {
        const minT = activeRule.min_source_tier || activeRule.domain_rules?.min_tier || 2;
        const allowedD = activeRule.domain_rules?.allowed_domains?.map((d: string) => d.trim().toLowerCase()).filter(Boolean);
        const blockedD = activeRule.domain_rules?.blocked_domains?.map((d: string) => d.trim().toLowerCase()).filter(Boolean);
        const mustNot = activeRule.boolean_terms?.must_not_include?.map((t: string) => t.trim().toLowerCase()).filter(Boolean);
        const mustInc = activeRule.boolean_terms?.must_include?.map((t: string) => t.trim().toLowerCase()).filter(Boolean);

        res.sources = res.sources.filter((s: any) => {
          const tier = s.source_tier || 2;
          if (tier > minT) return false;
          const dom = (s.domain || s.source || '').toLowerCase();
          const txt = `${s.title || ''} ${s.snippet || ''}`.toLowerCase();
          if (allowedD && allowedD.length > 0 && !allowedD.some((d: string) => dom.includes(d))) return false;
          if (blockedD && blockedD.length > 0 && blockedD.some((d: string) => dom.includes(d))) return false;
          if (mustNot && mustNot.length > 0 && mustNot.some((t: string) => txt.includes(t))) return false;
          if (mustInc && mustInc.length > 0 && !mustInc.some((t: string) => txt.includes(t))) return false;
          return true;
        });
      }
      
      const turnId = `asst-${Date.now()}`;
      const assistantTurn: ChatTurn = {
        id: turnId,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modality: currentModality,
        results: res,
        appliedRuleName: activeRule?.name,
        appliedRuleTier: activeRule?.min_source_tier,
      };

      if (activeRule?.min_source_tier && activeRule.min_source_tier <= 2) {
        setSelectedTierFilter((prev) => ({ ...prev, [turnId]: activeRule.min_source_tier as 1 | 2 }));
      }

      const finalMessages = [...newMessages, assistantTurn];
      setMessages(finalMessages);

      if (onUpdateSessions) {
        onUpdateSessions(
          sessions.map((s) => (s.id === sessId ? { ...s, messages: finalMessages } : s))
        );
      }

      if (currentUser?.email) {
        const itemToSave = {
          id: sessId,
          title: effectiveQuery || 'New Inquiry',
          timestamp: 'Today',
          messages: finalMessages,
        };
        fetch('/api/discovery/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentUser.email,
            item: itemToSave,
          }),
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error('Search error:', err);
      const assistantErrorTurn: ChatTurn = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: err.message || 'Failed to complete multi-source discovery. Please check network connection and try again.',
      };
      setMessages((prev) => [...prev, assistantErrorTurn]);
    } finally {
      setIsProcessing(false);
      setActiveStep('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeSearch();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getVerdictBadge = (verdict: string) => {
    const v = (verdict || 'Unverified').toLowerCase();
    if (v.includes('verified')) {
      return (
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Verified Consensus</span>
        </span>
      );
    }
    if (v.includes('disputed')) {
      return (
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Disputed Claims</span>
        </span>
      );
    }
    if (v.includes('false') || v.includes('debunk')) {
      return (
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3.5 h-3.5" />
          <span>Likely False / Debunked</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <HelpCircle className="w-3.5 h-3.5" />
        <span>Unverified Baseline</span>
      </span>
    );
  };

  const getTierBadge = (tier: number | string) => {
    const t = Number(tier);
    if (t === 1) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Tier 1 (Institutional Wire / Encyclopedia)
        </span>
      );
    }
    if (t === 2) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
          Tier 2 (Trade & National Media)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        Tier 3 (Community / Social Broadcast)
      </span>
    );
  };



  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 overflow-hidden w-full">
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          if (selectedModality === 'image') handleFileUpload(e, 'image');
          else if (selectedModality === 'audio') handleFileUpload(e, 'audio');
          else if (selectedModality === 'video') handleFileUpload(e, 'video');
        }}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden max-w-5xl mx-auto px-3 md:px-6 w-full relative">
        <MediaAutomationBackground className="opacity-35" nodeCount={45} interactive={true} showMediaLabels={false} />
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between py-2.5 border-b border-orange-200/60 mb-2 flex-shrink-0">
          <div className="flex items-center space-x-2">
            {!isSidebarOpen && onToggleSidebar && (
              <button
                onClick={() => onToggleSidebar(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-orange-50 border border-orange-200 text-slate-700 hover:text-orange-700 transition shadow-xs mr-2 cursor-pointer"
                title="Open Menu"
              >
                <Menu className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-semibold">Open Menu</span>
              </button>
            )}
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800">Live Multi-Source Session</span>
            {messages.length > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500">{messages.filter((m) => m.role === 'user').length} query cycles</span>
              </>
            )}
          </div>
        </div>

        {/* Main Conversation Stream */}
        <div className="flex-1 overflow-y-auto pt-2 pb-4 space-y-8 pr-1">
          {messages.length === 0 ? (
            /* Empty / Welcome State */
            <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 p-0.5 mb-6 flex items-center justify-center shadow-xs">
                <Compass className="w-8 h-8 text-orange-600" />
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
                Discovery
              </h1>
              <p className="text-slate-600 text-base max-w-lg leading-relaxed font-medium">
                Ask anything. Upload anything. Autonomous real-time multi-source intelligence, multimodal OCR/ASR, and fact-checking.
              </p>
            </div>
          ) : (
            /* Message List */
            messages.map((msg) => {
              const isUser = msg.role === 'user';

              if (isUser) {
                return (
                  <motion.div 
                    key={msg.id} 
                    id={`chat-turn-${msg.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="flex justify-end items-start space-x-3 scroll-mt-6"
                  >
                    <div className="max-w-2xl bg-orange-50/90 border border-orange-200 rounded-2xl rounded-tr-sm px-5 py-3.5 text-slate-900 shadow-xs">
                      {msg.mediaBase64 && msg.modality === 'image' && (
                        <div className="mb-3 rounded-lg overflow-hidden border border-orange-200 max-w-xs">
                          <img src={msg.mediaBase64} alt="Uploaded Media" className="w-full h-auto object-cover max-h-48" />
                        </div>
                      )}
                      {msg.mediaFileName && (
                        <div className="text-xs font-mono text-orange-700 mb-1 flex items-center space-x-1.5 font-semibold">
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{msg.mediaFileName}</span>
                        </div>
                      )}
                      <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">{msg.query}</p>
                      <div className="text-[10px] text-orange-500 mt-1 text-right font-medium">{msg.timestamp}</div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-700 flex-shrink-0 mt-1 shadow-xs font-semibold">
                      <User className="w-4 h-4" />
                    </div>
                  </motion.div>
                );
              }

              // Assistant Turn (Intelligence Brief)
              const result = msg.results;
              const intel = result?.intelligence_result;
              const sources = result?.sources || [];
              const claims = intel?.claims || [];
              const crossAnalysis = intel?.cross_source_analysis;
              const turnTierFilter = selectedTierFilter[msg.id] || 'all';

              const filteredSources = sources.filter((s: any) => {
                if (turnTierFilter === 'all') return true;
                return s.source_tier === turnTierFilter || String(s.source_tier) === String(turnTierFilter);
              });

              return (
                <motion.div 
                  key={msg.id} 
                  id={`chat-turn-${msg.id}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="flex items-start space-x-3 scroll-mt-6"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>

                  <div className="flex-1 max-w-4xl bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-6 shadow-sm space-y-6">
                    {/* Brief Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center space-x-1">
                            <Sparkles className="w-3.5 h-3.5 mr-1" />
                            <span>Intelligence Brief</span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500 font-medium">{result?.language_name || 'English'}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500 font-medium">{sources.length} Sources Processed</span>
                          {msg.appliedRuleName && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-300 flex items-center space-x-1 shadow-2xs">
                                <span>⚡ Rule: {msg.appliedRuleName}</span>
                                {msg.appliedRuleTier && <span className="text-orange-600 font-normal"> (Tier {msg.appliedRuleTier} Max)</span>}
                              </span>
                            </>
                          )}
                        </div>
                        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                          {intel?.title || result?.query || 'Live Intelligence Synthesis'}
                        </h2>
                      </div>

                      <div className="flex items-center space-x-2">
                        {getVerdictBadge(intel?.authenticity_verdict)}
                        <button
                          onClick={() => setInspectingTurn(msg)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold transition cursor-pointer shadow-xs"
                          title="Inspect Full Multi-Agent Pipeline, OCR/ASR, and Evidence Analysis"
                        >
                          <Eye className="w-3.5 h-3.5 text-orange-600" />
                          <span>Inspect</span>
                        </button>
                        <button
                          onClick={async () => {
                            if (!result) return;
                            try {
                              setDownloadingId(msg.id);
                              await exportDossierToDocx(result, msg.query);
                            } catch (err) {
                              console.error('Failed to export DOCX:', err);
                            } finally {
                              setTimeout(() => setDownloadingId(null), 1000);
                            }
                          }}
                          disabled={downloadingId === msg.id}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition cursor-pointer shadow-sm disabled:opacity-75"
                          title="Download Complete Dossier & Detailed Tier Sources (.docx)"
                        >
                          {downloadingId === msg.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <FileDown className="w-3.5 h-3.5" />
                              <span>Download DOCX</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(intel?.executive_summary || '', msg.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer border border-slate-200"
                          title="Copy Summary"
                        >
                          {copiedId === msg.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Multimodal OCR/ASR Context Banner if Present */}
                    {result?.multimodal_evidence && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5">
                        <div className="font-semibold text-orange-700 flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Extracted Multimodal Context ({result.multimodal_evidence.media_type?.toUpperCase()})</span>
                        </div>
                        {result.multimodal_evidence.ocr_text && (
                          <p className="text-slate-800"><span className="text-slate-500 font-medium">OCR Text:</span> {result.multimodal_evidence.ocr_text}</p>
                        )}
                        {result.multimodal_evidence.transcript && (
                          <p className="text-slate-800"><span className="text-slate-500 font-medium">Transcript:</span> {result.multimodal_evidence.transcript}</p>
                        )}
                        {result.multimodal_evidence.detected_topic && (
                          <p className="text-slate-800"><span className="text-slate-500 font-medium">Detected Topic:</span> {result.multimodal_evidence.detected_topic}</p>
                        )}
                      </div>
                    )}

                    {/* Executive Summary */}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Executive Summary</h3>
                      <p className="text-sm md:text-base text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                        {intel?.executive_summary || intel?.summary || intel?.overview || (typeof intel === 'string' ? intel : '') || 'Live multi-source intelligence evaluated reporting, claims, and verified context.'}
                      </p>
                    </div>

                    {/* Key Findings */}
                    {intel?.key_findings && intel.key_findings.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Key Findings</h3>
                        <ul className="space-y-2">
                          {intel.key_findings.map((finding: string, idx: number) => (
                            <li key={idx} className="flex items-start space-x-2.5 text-sm text-slate-800 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-2 flex-shrink-0" />
                              <span className="leading-relaxed">{finding}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Cross-Source Analysis */}
                    {crossAnalysis && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                            <Layers className="w-3.5 h-3.5 text-orange-600" />
                            <span>Cross-Source Evidence & Consensus Analysis</span>
                          </h3>
                          <span className="text-xs px-2.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 font-semibold">
                            {crossAnalysis.consensus_assessment || 'Supported'}
                          </span>
                        </div>

                        {crossAnalysis.claim_summary && (
                          <p className="text-xs text-slate-800 font-semibold">{crossAnalysis.claim_summary}</p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {/* Supporting */}
                          <div className="bg-white border border-emerald-200 rounded-lg p-3 shadow-sm">
                            <div className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1 mb-1.5">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Supporting Evidence (Tier 1 & Tier 2)</span>
                            </div>
                            <ul className="space-y-1.5 text-xs text-slate-700">
                              {crossAnalysis.supporting_evidence && crossAnalysis.supporting_evidence.filter(Boolean).length > 0 ? (
                                crossAnalysis.supporting_evidence.filter(Boolean).map((ev: string, i: number) => (
                                  <li key={i}>• {ev}</li>
                                ))
                              ) : (
                                <li className="text-slate-500 italic">• Independent wire and press reports corroborate the core developments.</li>
                              )}
                            </ul>
                          </div>

                          {/* Contradicting or Uncertain */}
                          <div className="bg-white border border-amber-200 rounded-lg p-3 shadow-sm">
                            <div className="text-[11px] font-bold text-amber-700 flex items-center space-x-1 mb-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Contradicting / Unconfirmed Elements</span>
                            </div>
                            <ul className="space-y-1.5 text-xs text-slate-700">
                              {crossAnalysis.contradicting_or_uncertain_evidence && crossAnalysis.contradicting_or_uncertain_evidence.filter(Boolean).length > 0 ? (
                                crossAnalysis.contradicting_or_uncertain_evidence.filter(Boolean).map((ev: string, i: number) => (
                                  <li key={i}>• {ev}</li>
                                ))
                              ) : (
                                <li className="text-slate-500 italic">• No contradictory claims or unconfirmed elements detected across verified sources.</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fact-Checking & Claims Matrix */}
                    {claims.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                          Claim Verification & Fact-Check Matrix
                        </h3>
                        <div className="space-y-2.5">
                          {claims.map((cl: any, idx: number) => {
                            const isDebunk = String(cl.status).toLowerCase().includes('debunk') || String(cl.status).toLowerCase().includes('false');
                            const isDispute = String(cl.status).toLowerCase().includes('dispute');
                            return (
                              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                                <div className="space-y-1">
                                  <div className="text-sm font-semibold text-slate-900">{cl.claim}</div>
                                  <div className="text-xs text-slate-500 flex items-center space-x-2">
                                    <span>Audited By: <strong className="text-slate-800">{cl.fact_checker}</strong></span>
                                    {cl.details && <span>• {cl.details}</span>}
                                  </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap self-start sm:self-auto border ${
                                  isDebunk ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                  isDispute ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  {cl.status}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Interactive 3D Geocoded Globe */}
                    {sources && sources.length > 0 && (
                      <Interactive3DGlobe
                        sources={sources}
                        onSelectArticle={(art) => setActiveModalArticle(art)}
                        title="3D Global & Regional Geo-Intelligence Globe"
                      />
                    )}

                    {/* Source Distribution with Tier Filter */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                          <Building className="w-3.5 h-3.5 text-orange-600" />
                          <span>Source Distribution & Direct Verified Links</span>
                        </h3>

                        {/* Tier Filter Tabs */}
                        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                          {(['all', 1, 2, 3] as const).map((t) => {
                            const countInTier = t === 'all' ? sources.length : sources.filter((s: any) => s.source_tier === t || String(s.source_tier) === String(t)).length;
                            return (
                              <button
                                key={t}
                                onClick={() => setSelectedTierFilter((prev) => ({ ...prev, [msg.id]: t }))}
                                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                                  turnTierFilter === t
                                    ? 'bg-orange-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {t === 'all' ? `All (${sources.length})` : `Tier ${t} (${countInTier})`}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Source Cards Grid */}
                      {filteredSources.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                          <p className="text-sm text-slate-600 mb-3">
                            {sources.length > 0 
                              ? `No Tier ${turnTierFilter} sources found for this query.`
                              : 'No direct source cards returned for this query.'}
                          </p>
                          {sources.length > 0 && (
                            <button
                              onClick={() => setSelectedTierFilter((prev) => ({ ...prev, [msg.id]: 'all' }))}
                              className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition cursor-pointer"
                            >
                              View All {sources.length} Discovered Sources
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredSources.map((src: any, sIdx: number) => (
                            <div
                              key={sIdx}
                              className="bg-white border border-slate-200 hover:border-orange-300 rounded-xl p-4 flex flex-col justify-between space-y-3 transition group shadow-xs hover:shadow-md"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                                    {getTierBadge(src.source_tier)}
                                    {src.location?.formatted && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 flex items-center space-x-1">
                                        <MapPin className="w-2.5 h-2.5 text-orange-600" />
                                        <span>{src.location.formatted}</span>
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-500 font-mono font-semibold">
                                    Trust: {Math.round((src.credibility_score || 0.8) * 100)}%
                                  </span>
                                </div>

                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                                  {src.title}
                                </h4>
                                <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                                  {src.snippet}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                <span className="text-slate-600 font-medium">{src.source || src.domain}</span>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => setActiveModalArticle(src)}
                                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition flex items-center space-x-1 cursor-pointer font-medium"
                                    title={src.url && (src.url.includes('youtube.com') || src.url.includes('youtu.be')) ? 'Watch YouTube Video In-App' : 'Read Clean Article In-App'}
                                  >
                                    {src.url && (src.url.includes('youtube.com') || src.url.includes('youtu.be')) ? (
                                      <>
                                        <Play className="w-3 h-3 text-rose-600 fill-rose-600" />
                                        <span>Watch In-App</span>
                                      </>
                                    ) : (
                                      <>
                                        <BookOpen className="w-3 h-3 text-orange-600" />
                                        <span>Read In-App</span>
                                      </>
                                    )}
                                  </button>
                                  <a
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition flex items-center space-x-1 font-semibold"
                                  >
                                    <span>Open Source</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Follow-up Prompt Suggestions */}
                    <div className="pt-4 border-t border-slate-200">
                      <div className="text-xs font-bold text-slate-500 mb-2">Suggested Follow-ups:</div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'What are the conflicting or disputed claims?',
                          'Show me only Tier 1 institutional evidence.',
                          'What are the technological and policy impacts?',
                        ].map((promptText, pIdx) => (
                          <button
                            key={pIdx}
                            onClick={() => {
                              setInputQuery(promptText);
                              executeSearch(promptText);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-orange-50 hover:border-orange-200 border border-slate-200 text-xs text-slate-700 hover:text-orange-800 transition text-left cursor-pointer font-medium shadow-xs"
                          >
                            {promptText}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}

          {/* Live Multi-Agent Pipeline Processing Indicator */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="w-full my-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-md"
              >
                {/* Header with spinner and current agent state */}
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-3 mb-6 text-center">
                  <div className="flex items-center space-x-2.5">
                    <RefreshCw className="w-4 h-4 text-orange-600 animate-spin" />
                    <span className="text-sm font-bold text-slate-900">
                      {PIPELINE_STEPS[pipelineStepIndex - 1]?.desc || 'Analyzing your request...'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <span className="bg-orange-50 border border-orange-200 px-2 py-0.5 rounded text-orange-800 font-mono text-[11px] font-semibold">
                      {PIPELINE_STEPS[pipelineStepIndex - 1]?.agent}
                    </span>
                    <span className="text-slate-400">~ 3-5 seconds</span>
                  </div>
                </div>

                {/* 9-Step Interactive Pipeline Stepper */}
                <div className="relative px-2 sm:px-6 overflow-x-auto pb-2 custom-scrollbar">
                  <div className="min-w-[620px] flex items-center justify-between relative">
                    {PIPELINE_STEPS.map((step, idx) => {
                      const isCompleted = pipelineStepIndex > step.id;
                      const isActive = pipelineStepIndex === step.id;

                      return (
                        <React.Fragment key={step.id}>
                          {idx > 0 && (
                            <div
                              className={`flex-1 h-0.5 mx-1 transition-all duration-500 ${
                                pipelineStepIndex >= step.id
                                  ? 'bg-orange-600'
                                  : 'bg-slate-200'
                              }`}
                            />
                          )}

                          <div className="flex flex-col items-center flex-shrink-0 relative group">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                isCompleted
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : isActive
                                  ? 'bg-orange-600 text-white ring-4 ring-orange-100 shadow-sm'
                                  : 'bg-slate-100 text-slate-500 border border-slate-300'
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : (
                                <span>{step.id}</span>
                              )}
                            </div>

                            <span
                              className={`mt-2 text-[11px] font-semibold tracking-tight transition-colors whitespace-nowrap ${
                                isActive
                                  ? 'text-orange-600 font-bold'
                                  : isCompleted
                                  ? 'text-slate-800'
                                  : 'text-slate-400'
                              }`}
                            >
                              {step.name}
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Input / Discovery Controller */}
        <div className="py-3 border-t border-slate-200 bg-slate-50 sticky bottom-0 z-20">
          
          {attachedFile && (
            <div className="mb-2 p-2.5 rounded-xl bg-white border border-orange-200 flex items-center justify-between text-xs max-w-xl shadow-xs">
              <div className="flex items-center space-x-2">
                {attachedFile.modality === 'image' && <ImageIcon className="w-4 h-4 text-orange-600" />}
                {attachedFile.modality === 'audio' && <Mic className="w-4 h-4 text-orange-600" />}
                {attachedFile.modality === 'video' && <Video className="w-4 h-4 text-purple-600" />}
                <span className="font-semibold text-slate-800 truncate">{attachedFile.name}</span>
                <span className="text-[10px] text-slate-500 uppercase">({attachedFile.modality})</span>
              </div>
              <button onClick={handleClearAttachment} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Custom Rule Banner if chosen */}
          {selectedRuleId && (
            <div className="mb-2 p-2 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between text-xs max-w-xl shadow-xs">
              <div className="flex items-center space-x-2 text-orange-900">
                <SlidersHorizontal className="w-4 h-4 text-orange-600" />
                <span className="font-semibold">
                  Active Filter Rule: {availableRules.find((r) => r.id === selectedRuleId)?.name || selectedRuleId}
                </span>
              </div>
              <button
                onClick={() => setSelectedRuleId('')}
                className="p-1 hover:bg-orange-100 rounded text-orange-700 hover:text-orange-900 cursor-pointer"
                title="Remove rule filter and return to global search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-300 rounded-2xl p-2.5 focus-within:border-orange-600 focus-within:ring-1 focus-within:ring-orange-600 shadow-xs transition-all">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                attachedFile
                  ? `Add notes or ask a question regarding ${attachedFile.name}...`
                  : selectedRuleId
                  ? `Search using active rule '${availableRules.find((r) => r.id === selectedRuleId)?.name || selectedRuleId}'...`
                  : 'Search or ask your question... (e.g. Tata Motors EV, ISRO Gaganyaan, Apple)'
              }
              className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 resize-none focus:outline-none px-2 py-1 font-medium"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 mt-1">
              
              {/* Left Tools: Modality Uploads, Language Selector, & Rule Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModality('image');
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'image/*';
                      fileInputRef.current.click();
                    }
                  }}
                  className={`p-1.5 rounded-lg border transition text-xs flex items-center space-x-1 font-medium ${
                    attachedFile?.modality === 'image'
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title="Upload Image for OCR & Vision analysis"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedModality('audio');
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'audio/*';
                      fileInputRef.current.click();
                    }
                  }}
                  className={`p-1.5 rounded-lg border transition text-xs flex items-center space-x-1 font-medium ${
                    attachedFile?.modality === 'audio'
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title="Upload Audio for Whisper ASR"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Audio</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedModality('video');
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'video/*';
                      fileInputRef.current.click();
                    }
                  }}
                  className={`p-1.5 rounded-lg border transition text-xs flex items-center space-x-1 font-medium ${
                    attachedFile?.modality === 'video'
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title="Upload Video for Keyframe & Audio analysis"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Video</span>
                </button>

                {/* Target Language Dropdown */}
                <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                  <Globe2 className="w-3.5 h-3.5 text-orange-600" />
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium rounded-lg px-2 py-1 focus:outline-none focus:border-orange-600"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom User Rule Selector (Optional) */}
                <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <select
                    value={selectedRuleId}
                    onChange={(e) => setSelectedRuleId(e.target.value)}
                    className={`border text-xs font-medium rounded-lg px-2.5 py-1 focus:outline-none focus:border-orange-600 max-w-[210px] truncate cursor-pointer transition shadow-2xs ${
                      selectedRuleId ? 'bg-orange-50 border-orange-400 text-orange-900 font-bold' : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                    title="Optional: Select a created rule to filter search results strictly according to rule criteria"
                  >
                    <option value="">🌐 Global (No Rule)</option>
                    {availableRules.map((r) => {
                      const displayName = r.name || (r.min_source_tier ? `Tier ${r.min_source_tier} Rule` : `Rule ${r.id.slice(0, 8)}`);
                      return (
                        <option key={r.id} value={r.id}>
                          ⚡ {displayName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Right: Discover / Send Button */}
              <button
                onClick={() => executeSearch()}
                disabled={isProcessing || (!inputQuery.trim() && !attachedFile)}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs transition flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
              >
                <span>Discover</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Profile Preferences Setup Modal right on Discovery Page */}
        <AnimatePresence>
          {showProfileModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 15 }}
                className="bg-white rounded-3xl border border-orange-200 shadow-2xl max-w-md w-full overflow-hidden text-slate-900"
              >
                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-sm">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">Complete Profile Preferences</h3>
                      <p className="text-xs text-orange-100">Set your intelligence analyst identity & parameters</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      sessionStorage.removeItem('open_profile_setup_on_discovery');
                      setShowProfileModal(false);
                    }}
                    className="p-1.5 rounded-xl hover:bg-white/20 text-white transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSaveProfile} className="p-6 space-y-4 text-xs">
                  {profileSavedToast && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 font-semibold animate-bounce">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Preferences saved successfully! Welcome to Discovery.</span>
                    </div>
                  )}

                  {/* Full Name */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Full Name / Display Alias</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. Gyathri Gayatri, Dr. Rajesh Kumar"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 font-medium"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="analyst@gmail.com"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 font-medium"
                    />
                  </div>

                  {/* Organization */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Organization / Agency</label>
                    <input
                      type="text"
                      value={profileOrg}
                      onChange={(e) => setProfileOrg(e.target.value)}
                      placeholder="e.g. ISRO, Reuters Bureau, National Research Lab"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 font-medium"
                    />
                  </div>

                  {/* Role & Designation */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Role Type</label>
                      <select
                        value={profileRole}
                        onChange={(e) => setProfileRole(e.target.value as UserRole)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-600 font-medium"
                      >
                        <option value="Analyst">Analyst</option>
                        <option value="FactVerifier">Fact Verifier</option>
                        <option value="Executive">Executive</option>
                        <option value="Admin">Admin</option>
                        <option value="Client">Client</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Designation</label>
                      <input
                        type="text"
                        value={profileDesignation}
                        onChange={(e) => setProfileDesignation(e.target.value)}
                        placeholder="e.g. Lead Analyst"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-600 font-medium"
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        sessionStorage.removeItem('open_profile_setup_on_discovery');
                        setShowProfileModal(false);
                      }}
                      className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition font-semibold cursor-pointer"
                    >
                      Skip
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition shadow-sm cursor-pointer"
                    >
                      Save Preferences
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Multi-Agent Full Analysis Inspector Modal */}
        {inspectingTurn && (
          <AgentInspectorModal
            turn={inspectingTurn}
            onClose={() => setInspectingTurn(null)}
          />
        )}

        {/* In-App Content Ingestion & Media / Article Modal Reader */}
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
    </div>
  );
};

export default DiscoveryChatView;

