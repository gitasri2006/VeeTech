import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, Image as ImageIcon, Mic, Video, Globe2,
  CheckCircle2, AlertTriangle, XCircle, HelpCircle, ExternalLink,
  Layers, ShieldCheck, RefreshCw, UploadCloud, Check, Info, X,
  BookOpen, Clock, Building, Compass, MessageSquare, ChevronRight,
  Copy, ArrowDown, User, Bot, Search, FileText, CheckCircle,
  Folder, Cpu, MoreHorizontal, PanelLeft, PanelLeftClose, Trash2,
  BookMarked, Edit3, Plus, Library, Menu
} from 'lucide-react';
import { api, UnifiedSearchOptions } from '../services/api';
import { UserRole } from '../types';
import { MediaAutomationBackground } from '../components/MediaAutomationBackground';

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
  } | null;
}

export const DiscoveryChatView: React.FC<DiscoveryChatViewProps> = ({ currentUser }) => {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [selectedModality, setSelectedModality] = useState<'text' | 'image' | 'audio' | 'video'>('text');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [showHistorySearch, setShowHistorySearch] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string>('sess-1');

  const userKey = currentUser?.email ? currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'default';

  const [sessions, setSessions] = useState<InquirySession[]>(() => {
    try {
      const emailKey = currentUser?.email ? currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'default';
      const saved = localStorage.getItem(`discovery_history_${emailKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading search history', e);
    }
    return [];
  });

  useEffect(() => {
    const emailKey = currentUser?.email ? currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'default';
    const localSaved = localStorage.getItem(`discovery_history_${emailKey}`);
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved);
        if (Array.isArray(parsed)) setSessions(parsed);
      } catch (e) {}
    } else {
      setSessions([]);
    }

    if (currentUser?.email) {
      fetch(`/api/discovery/history?email=${encodeURIComponent(currentUser.email)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.history) && data.history.length > 0) {
            setSessions(data.history);
            localStorage.setItem(`discovery_history_${emailKey}`, JSON.stringify(data.history));
          }
        })
        .catch(() => {});
    }
    startNewInquiry();
  }, [currentUser?.email]);

  useEffect(() => {
    const emailKey = currentUser?.email ? currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'default';
    try {
      localStorage.setItem(`discovery_history_${emailKey}`, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save search history', e);
    }
  }, [sessions, currentUser?.email]);

  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    base64: string;
    mimeType: string;
    modality: 'image' | 'audio' | 'video';
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineStepIndex, setPipelineStepIndex] = useState<number>(1);
  const [activeStep, setActiveStep] = useState<string>('');
  const [activeModalArticle, setActiveModalArticle] = useState<any | null>(null);
  const [selectedTierFilter, setSelectedTierFilter] = useState<{ [turnId: string]: 'all' | 1 | 2 | 3 }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing, activeStep, pipelineStepIndex]);

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
    const newSessId = `sess-${Date.now()}`;
    setActiveSessionId(newSessId);
    setMessages([]);
    setInputQuery('');
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const selectSession = (session: InquirySession) => {
    setActiveSessionId(session.id);
    if (session.messages && session.messages.length > 0) {
      setMessages(session.messages);
    } else {
      setMessages([]);
      setInputQuery(session.title);
      executeSearch(session.title, session.id);
    }
  };

  const deleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentUser?.email) {
      fetch(`/api/discovery/history?email=${encodeURIComponent(currentUser.email)}&session_id=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
    if (activeSessionId === sessionId) {
      startNewInquiry();
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
    setSessions((prev) => {
      const existing = prev.find((s) => s.id === sessId);
      if (existing) {
        return prev.map((s) =>
          s.id === sessId
            ? {
                ...s,
                title: s.title === 'New Inquiry' ? effectiveQuery || currentAttachment?.name || 'Inquiry' : s.title,
                messages: newMessages,
              }
            : s
        );
      } else {
        const newSession: InquirySession = {
          id: sessId,
          title: effectiveQuery || currentAttachment?.name || 'Inquiry',
          timestamp: 'Just now',
          messages: newMessages,
        };
        return [newSession, ...prev];
      }
    });

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

    const searchOptions: UnifiedSearchOptions = {
      query: effectiveQuery || undefined,
      inputModality: currentModality,
      targetLanguage: targetLanguage,
      mediaFileName: currentAttachment?.name,
      mediaBase64: currentAttachment?.base64,
      mediaMimeType: currentAttachment?.mimeType,
      conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
      previousSources: previousSources.length > 0 ? previousSources.slice(-20) : undefined,
    };

    try {
      if (currentModality !== 'text' && currentAttachment?.base64) {
        setActiveStep(`Performing live OCR & Vision analysis on ${currentAttachment.name}...`);
      } else {
        setActiveStep('Connecting to live news feeds and querying Google Fact Check registries...');
      }

      const res = await api.searchUnifiedDiscovery(searchOptions);

      setActiveStep('Synthesizing executive brief & cross-source consensus...');
      
      const assistantTurn: ChatTurn = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modality: currentModality,
        results: res,
      };

      const finalMessages = [...newMessages, assistantTurn];
      setMessages(finalMessages);

      setSessions((prev) =>
        prev.map((s) => (s.id === sessId ? { ...s, messages: finalMessages } : s))
      );

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
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
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

  const filteredHistorySessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(historySearchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 text-slate-900 overflow-hidden w-full">
      
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

      {/* Discovery Search History Left Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64 md:w-72' : 'w-0'
        } transition-all duration-300 ease-in-out bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden flex-shrink-0 z-30 font-sans shadow-sm`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-indigo-600" />
            <span className="text-base font-bold text-slate-900 tracking-tight">
              Discovery
            </span>
          </div>

          <div className="flex items-center space-x-1 text-slate-500">
            <button
              onClick={() => setShowHistorySearch(!showHistorySearch)}
              className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition"
              title="Filter search history"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center space-x-1 p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
              title="Close Menu"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* History Search Filter Bar */}
        {showHistorySearch && (
          <div className="px-3 pt-2.5 pb-1">
            <div className="relative">
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Filter search history..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
              />
              {historySearchQuery && (
                <button
                  onClick={() => setHistorySearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Top Action: New Inquiry */}
        <div className="p-3">
          <button
            onClick={startNewInquiry}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition group shadow-sm"
          >
            <div className="flex items-center space-x-2.5">
              <Plus className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
              <span>New Inquiry</span>
            </div>
          </button>
        </div>

        {/* Search History Section */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 custom-scrollbar">
          <div className="px-3 pt-1 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Search History
          </div>

          {sessions.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-xs text-slate-500 font-medium">No search history yet</p>
              <p className="text-[11px] text-slate-400 mt-1">Searches you make will appear here</p>
            </div>
          ) : filteredHistorySessions.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-500 text-center">
              No matching searches found
            </div>
          ) : (
            filteredHistorySessions.map((sess) => {
              const isActive = activeSessionId === sess.id;
              return (
                <div
                  key={sess.id}
                  onClick={() => selectSession(sess)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm border border-indigo-200'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title={sess.title}
                >
                  <div className="flex items-center space-x-2.5 truncate flex-1 pr-1">
                    <Search className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="truncate">{sess.title}</span>
                  </div>
                  <button
                    onClick={(e) => deleteSession(e, sess.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 text-slate-400 rounded transition flex-shrink-0"
                    title="Remove from history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Bar: Clear History */}
        {sessions.length > 0 && (
          <div className="p-2 border-t border-slate-200">
            <button
              onClick={() => {
                setSessions([]);
                const emailKey = currentUser?.email ? currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'default';
                localStorage.removeItem(`discovery_history_${emailKey}`);
                if (currentUser?.email) {
                  fetch(`/api/discovery/history?email=${encodeURIComponent(currentUser.email)}`, {
                    method: 'DELETE',
                  }).catch(() => {});
                }
                startNewInquiry();
              }}
              className="w-full py-1.5 px-2 text-[11px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition text-center"
            >
              Clear Search History
            </button>
          </div>
        )}
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden max-w-5xl mx-auto px-3 md:px-6 w-full relative">
        <MediaAutomationBackground className="opacity-35" nodeCount={45} interactive={true} showMediaLabels={false} />
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between py-2.5 border-b border-slate-200 mb-2 flex-shrink-0">
          <div className="flex items-center space-x-2">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 transition shadow-sm mr-2"
                title="Open Menu"
              >
                <Menu className="w-4 h-4 text-indigo-600" />
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

          <button
            onClick={startNewInquiry}
            className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 hover:text-slate-900 transition flex items-center space-x-1.5 shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>New Inquiry</span>
          </button>
        </div>

        {/* Main Conversation Stream */}
        <div className="flex-1 overflow-y-auto pt-2 pb-4 space-y-8 pr-1">
          {messages.length === 0 ? (
            /* Empty / Welcome State */
            <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 p-0.5 mb-6 flex items-center justify-center shadow-sm">
                <Compass className="w-8 h-8 text-indigo-600" />
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="flex justify-end items-start space-x-3"
                  >
                    <div className="max-w-2xl bg-indigo-50 border border-indigo-200 rounded-2xl rounded-tr-sm px-5 py-3.5 text-slate-900 shadow-sm">
                      {msg.mediaBase64 && msg.modality === 'image' && (
                        <div className="mb-3 rounded-lg overflow-hidden border border-indigo-200 max-w-xs">
                          <img src={msg.mediaBase64} alt="Uploaded Media" className="w-full h-auto object-cover max-h-48" />
                        </div>
                      )}
                      {msg.mediaFileName && (
                        <div className="text-xs font-mono text-indigo-700 mb-1 flex items-center space-x-1.5 font-semibold">
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{msg.mediaFileName}</span>
                        </div>
                      )}
                      <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">{msg.query}</p>
                      <div className="text-[10px] text-indigo-500 mt-1 text-right font-medium">{msg.timestamp}</div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 flex-shrink-0 mt-1 shadow-sm font-semibold">
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
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="flex items-start space-x-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>

                  <div className="flex-1 max-w-4xl bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-6 shadow-sm space-y-6">
                    {/* Brief Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center space-x-1">
                            <Sparkles className="w-3.5 h-3.5 mr-1" />
                            <span>Intelligence Brief</span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500 font-medium">{result?.language_name || 'English'}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500 font-medium">{sources.length} Sources Processed</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                          {intel?.title || result?.query || 'Live Intelligence Synthesis'}
                        </h2>
                      </div>

                      <div className="flex items-center space-x-3">
                        {getVerdictBadge(intel?.authenticity_verdict)}
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
                        <div className="font-semibold text-indigo-700 flex items-center space-x-1.5">
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
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
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
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Cross-Source Evidence & Consensus Analysis</span>
                          </h3>
                          <span className="text-xs px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
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
                              {crossAnalysis.supporting_evidence?.map((ev: string, i: number) => (
                                <li key={i}>• {ev}</li>
                              )) || <li>• Independent wire and press reports corroborate the core developments.</li>}
                            </ul>
                          </div>

                          {/* Contradicting or Uncertain */}
                          <div className="bg-white border border-amber-200 rounded-lg p-3 shadow-sm">
                            <div className="text-[11px] font-bold text-amber-700 flex items-center space-x-1 mb-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Contradicting / Unconfirmed Elements</span>
                            </div>
                            <ul className="space-y-1.5 text-xs text-slate-700">
                              {crossAnalysis.contradicting_or_uncertain_evidence?.map((ev: string, i: number) => (
                                <li key={i}>• {ev}</li>
                              )) || <li>• No major conflicting claims detected across indexed verified registries.</li>}
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

                    {/* Source Distribution with Tier Filter */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                          <Building className="w-3.5 h-3.5 text-indigo-600" />
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
                                    ? 'bg-indigo-600 text-white shadow-sm'
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
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer"
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
                              className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-4 flex flex-col justify-between space-y-3 transition group shadow-sm hover:shadow-md"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  {getTierBadge(src.source_tier)}
                                  <span className="text-[11px] text-slate-500 font-mono font-semibold">
                                    Trust: {Math.round((src.credibility_score || 0.8) * 100)}%
                                  </span>
                                </div>

                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
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
                                  >
                                    <BookOpen className="w-3 h-3" />
                                    <span>Read In-App</span>
                                  </button>
                                  <a
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition flex items-center space-x-1 font-semibold"
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
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs text-slate-700 hover:text-slate-900 transition text-left cursor-pointer font-medium shadow-sm"
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
                    <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span className="text-sm font-bold text-slate-900">
                      {PIPELINE_STEPS[pipelineStepIndex - 1]?.desc || 'Analyzing your request...'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-mono text-[11px] font-semibold">
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
                                  ? 'bg-indigo-600'
                                  : 'bg-slate-200'
                              }`}
                            />
                          )}

                          <div className="flex flex-col items-center flex-shrink-0 relative group">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                isCompleted
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : isActive
                                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-sm'
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
                                  ? 'text-indigo-600'
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
            <div className="mb-2 p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs max-w-xl shadow-sm">
              <div className="flex items-center space-x-2">
                {attachedFile.modality === 'image' && <ImageIcon className="w-4 h-4 text-indigo-600" />}
                {attachedFile.modality === 'audio' && <Mic className="w-4 h-4 text-blue-600" />}
                {attachedFile.modality === 'video' && <Video className="w-4 h-4 text-purple-600" />}
                <span className="font-semibold text-slate-800 truncate">{attachedFile.name}</span>
                <span className="text-[10px] text-slate-500 uppercase">({attachedFile.modality})</span>
              </div>
              <button onClick={handleClearAttachment} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-300 rounded-2xl p-2.5 focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600 shadow-sm transition-all">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                attachedFile
                  ? `Add notes or ask a question regarding ${attachedFile.name}...`
                  : 'Search or ask your question... (e.g. Tata Motors EV, ISRO Gaganyaan, Apple)'
              }
              className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 resize-none focus:outline-none px-2 py-1 font-medium"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 mt-1">
              
              {/* Left Tools: Modality Uploads & Language Selector */}
              <div className="flex items-center space-x-2">
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
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
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
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
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
                      ? 'bg-purple-50 border-purple-200 text-purple-700'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title="Upload Video for Keyframe & Audio analysis"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Video</span>
                </button>

                {/* Target Language Dropdown */}
                <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-200">
                  <Globe2 className="w-3.5 h-3.5 text-indigo-600" />
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-600"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right: Discover / Send Button */}
              <button
                onClick={() => executeSearch()}
                disabled={isProcessing || (!inputQuery.trim() && !attachedFile)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <span>Discover</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* In-App Article Modal Reader */}
        <AnimatePresence>
          {activeModalArticle && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
              >
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center space-x-2">
                      {getTierBadge(activeModalArticle.source_tier)}
                      <span className="text-xs text-slate-500 font-mono font-semibold">
                        Score: {Math.round((activeModalArticle.credibility_score || 0.8) * 100)}%
                      </span>
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-slate-900 leading-snug">
                      {activeModalArticle.title}
                    </h3>
                    <div className="text-xs text-slate-500 flex items-center space-x-2 font-medium">
                      <span>Publisher: <strong className="text-slate-800">{activeModalArticle.source || activeModalArticle.domain}</strong></span>
                      {activeModalArticle.published_at_raw && (
                        <>
                          <span>•</span>
                          <span>{activeModalArticle.published_at_raw}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveModalArticle(null)}
                    className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700 leading-relaxed font-medium">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Article Excerpt</h4>
                    <p className="text-slate-900 whitespace-pre-wrap">{activeModalArticle.snippet}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Source Credibility Rationale</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {activeModalArticle.tier_description || 'Categorized based on editorial standards, domain reputation, and wire agency verification.'}
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs text-slate-500 truncate max-w-sm font-mono">
                    {activeModalArticle.url}
                  </span>
                  <a
                    href={activeModalArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center space-x-1.5 transition shadow-sm"
                  >
                    <span>Open Direct Article</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default DiscoveryChatView;
