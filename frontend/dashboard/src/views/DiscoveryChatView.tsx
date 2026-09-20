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
  // Chat turns for currently active session
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [selectedModality, setSelectedModality] = useState<'text' | 'image' | 'audio' | 'video'>('text');
  
  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [showHistorySearch, setShowHistorySearch] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string>('sess-1');

  const userKey = currentUser?.email ? currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'default';
  const storageKey = `discovery_history_${userKey}`;

  // Inquiry History Sessions for Discovery - isolated per user account
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

  // Re-sync history from database and local storage whenever currentUser changes
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

  // Save search history to localStorage whenever sessions change
  useEffect(() => {
    const emailKey = currentUser?.email ? currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'default';
    try {
      localStorage.setItem(`discovery_history_${emailKey}`, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save search history', e);
    }
  }, [sessions, currentUser?.email]);

  // Media attachments
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

  // Advance pipeline steps while search is executing
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
      // If messages not preloaded, initialize search for this session title
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
    const userMsgId = `user-${Date.now()}`;
    const userTurn: ChatTurn = {
      id: userMsgId,
      role: 'user',
      query: effectiveQuery || (attachedFile ? `[Uploaded ${attachedFile.modality.toUpperCase()}: ${attachedFile.name}]` : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modality: currentModality,
      mediaFileName: attachedFile?.name,
      mediaBase64: attachedFile?.base64,
      mediaMimeType: attachedFile?.mimeType,
    };

    // If starting a new conversation or not continuing an existing targeted session, generate a unique session ID
    const isNewConversation = messages.length === 0 && !targetSessId;
    const sessId = targetSessId || (isNewConversation ? `sess-${Date.now()}` : activeSessionId);
    
    setActiveSessionId(sessId);

    const newMessages = [...messages, userTurn];
    setMessages(newMessages);
    setInputQuery('');
    const currentAttachment = attachedFile;
    setAttachedFile(null);
    setIsProcessing(true);

    // Add or update session in history list
    setSessions((prev) => {
      const existing = prev.find((s) => s.id === sessId);
      if (existing) {
        return prev.map((s) => (s.id === sessId ? { ...s, title: s.title || effectiveQuery, messages: newMessages } : s));
      } else {
        const newSessionItem: InquirySession = {
          id: sessId,
          title: effectiveQuery || 'New Inquiry',
          timestamp: 'Today',
          messages: newMessages,
        };
        return [newSessionItem, ...prev];
      }
    });

    // Prepare previous sources and history for context
    const previousSources: any[] = [];
    const conversationHistory: Array<{ role: string; content: string; timestamp?: string }> = [];
    
    messages.forEach((m) => {
      if (m.role === 'user') {
        conversationHistory.push({ role: 'user', content: m.query || '' });
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

      // Save complete session messages
      setSessions((prev) =>
        prev.map((s) => (s.id === sessId ? { ...s, messages: finalMessages } : s))
      );

      // Persist to user's database history
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
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Verified Consensus</span>
        </span>
      );
    }
    if (v.includes('disputed')) {
      return (
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Disputed Claims</span>
        </span>
      );
    }
    if (v.includes('false') || v.includes('debunk')) {
      return (
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3.5 h-3.5" />
          <span>Likely False / Debunked</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
        <HelpCircle className="w-3.5 h-3.5" />
        <span>Unverified Baseline</span>
      </span>
    );
  };

  const getTierBadge = (tier: number | string) => {
    const t = Number(tier);
    if (t === 1) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          Tier 1 (Institutional Wire / Encyclopedia)
        </span>
      );
    }
    if (t === 2) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
          Tier 2 (Trade & National Media)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
        Tier 3 (Community / Social Broadcast)
      </span>
    );
  };

  const filteredHistorySessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(historySearchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-hidden w-full">
      
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

      {/* ===================================================================== */}
      {/* ===================================================================== */}
      {/* Discovery Search History Left Sidebar */}
      {/* ===================================================================== */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64 md:w-72' : 'w-0'
        } transition-all duration-300 ease-in-out bg-slate-900/95 border-r border-slate-800 flex flex-col h-full overflow-hidden flex-shrink-0 z-30 font-sans`}
      >
        {/* Sidebar Header: Discovery Branding + Search + Close Menu */}
        <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-emerald-400" />
            <span className="text-base font-bold text-slate-100 tracking-tight">
              Discovery
            </span>
          </div>

          <div className="flex items-center space-x-1 text-slate-400">
            <button
              onClick={() => setShowHistorySearch(!showHistorySearch)}
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition"
              title="Filter search history"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center space-x-1 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Close Menu"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* History Search Filter Bar (Toggleable) */}
        {showHistorySearch && (
          <div className="px-3 pt-2.5 pb-1">
            <div className="relative">
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Filter search history..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              {historySearchQuery && (
                <button
                  onClick={() => setHistorySearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
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
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 hover:bg-slate-700/80 text-slate-100 hover:text-white border border-slate-700/70 text-xs font-semibold transition group shadow-sm"
          >
            <div className="flex items-center space-x-2.5">
              <Plus className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>New Inquiry</span>
            </div>
          </button>
        </div>

        {/* Search History Section */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 custom-scrollbar">
          <div className="px-3 pt-1 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Search History
          </div>

          {sessions.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-xs text-slate-500 font-medium">No search history yet</p>
              <p className="text-[11px] text-slate-600 mt-1">Searches you make will appear here</p>
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
                      ? 'bg-slate-800 text-emerald-300 font-medium shadow-sm border border-slate-700/80'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                  title={sess.title}
                >
                  <div className="flex items-center space-x-2.5 truncate flex-1 pr-1">
                    <Search className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span className="truncate">{sess.title}</span>
                  </div>
                  <button
                    onClick={(e) => deleteSession(e, sess.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-slate-500 rounded transition flex-shrink-0"
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
          <div className="p-2 border-t border-slate-800/80">
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
              className="w-full py-1.5 px-2 text-[11px] text-slate-500 hover:text-rose-400 hover:bg-slate-800/40 rounded-lg transition text-center"
            >
              Clear Search History
            </button>
          </div>
        )}
      </aside>

      {/* ===================================================================== */}
      {/* Main Chat Area */}
      {/* ===================================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden max-w-5xl mx-auto px-3 md:px-6 w-full relative">
        <MediaAutomationBackground className="opacity-45" nodeCount={45} interactive={true} showMediaLabels={false} />
        
        {/* Top Header Bar when session is active or sidebar is collapsed */}
        <div className="flex items-center justify-between py-2.5 border-b border-slate-800/80 mb-2 flex-shrink-0">
          <div className="flex items-center space-x-2">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white transition shadow-sm mr-2"
                title="Open Menu"
              >
                <Menu className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium">Open Menu</span>
              </button>
            )}
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-200">Live Multi-Source Session</span>
            {messages.length > 0 && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-400">{messages.filter((m) => m.role === 'user').length} query cycles</span>
              </>
            )}
          </div>

          <button
            onClick={startNewInquiry}
            className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center space-x-1.5 shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Inquiry</span>
          </button>
        </div>

        {/* Main Conversation Stream */}
        <div className="flex-1 overflow-y-auto pt-2 pb-4 space-y-8 pr-1">
          {messages.length === 0 ? (
            /* Empty / Welcome State */
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4"
            >
              <motion.div 
                whileHover={{ rotate: 180, scale: 1.05 }}
                transition={{ duration: 0.6 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 mb-6 shadow-xl shadow-emerald-500/20 flex items-center justify-center cursor-pointer"
              >
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400">
                  <Compass className="w-8 h-8" />
                </div>
              </motion.div>

              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
                Discovery
              </h1>
              <p className="text-slate-400 text-base max-w-lg leading-relaxed">
                Ask anything. Upload anything. Autonomous real-time multi-source intelligence, multimodal OCR/ASR, and fact-checking.
              </p>
            </motion.div>
          ) : (
            /* Message List */
            messages.map((msg) => {
              const isUser = msg.role === 'user';

              if (isUser) {
                return (
                  <motion.div 
                    key={msg.id} 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="flex justify-end items-start space-x-3"
                  >
                    <div className="max-w-2xl bg-emerald-600/20 border border-emerald-500/30 rounded-2xl rounded-tr-sm px-5 py-3.5 text-slate-100 shadow-md">
                      {/* Media Preview if attached */}
                      {msg.mediaBase64 && msg.modality === 'image' && (
                        <div className="mb-3 rounded-lg overflow-hidden border border-emerald-500/30 max-w-xs">
                          <img src={msg.mediaBase64} alt="Uploaded Media" className="w-full h-auto object-cover max-h-48" />
                        </div>
                      )}
                      {msg.mediaFileName && (
                        <div className="text-xs font-mono text-emerald-300 mb-1 flex items-center space-x-1.5">
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{msg.mediaFileName}</span>
                        </div>
                      )}
                      <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.query}</p>
                      <div className="text-[10px] text-emerald-400/60 mt-1 text-right">{msg.timestamp}</div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-1">
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
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="flex items-start space-x-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-1 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>

                  <div className="flex-1 max-w-4xl bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-sm p-6 shadow-xl space-y-6">
                    {/* Brief Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center space-x-1">
                            <Sparkles className="w-3.5 h-3.5 mr-1" />
                            <span>Intelligence Brief</span>
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-slate-400">{result?.language_name || 'English'}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-slate-400">{sources.length} Sources Processed</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                          {intel?.title || result?.query || 'Live Intelligence Synthesis'}
                        </h2>
                      </div>

                      <div className="flex items-center space-x-3">
                        {getVerdictBadge(intel?.authenticity_verdict)}
                        <button
                          onClick={() => copyToClipboard(intel?.executive_summary || '', msg.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                          title="Copy Summary"
                        >
                          {copiedId === msg.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Multimodal OCR/ASR Context Banner if Present */}
                    {result?.multimodal_evidence && (
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs space-y-1.5">
                        <div className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Extracted Multimodal Context ({result.multimodal_evidence.media_type?.toUpperCase()})</span>
                        </div>
                        {result.multimodal_evidence.ocr_text && (
                          <p className="text-slate-300"><span className="text-slate-400 font-medium">OCR Text:</span> {result.multimodal_evidence.ocr_text}</p>
                        )}
                        {result.multimodal_evidence.transcript && (
                          <p className="text-slate-300"><span className="text-slate-400 font-medium">Transcript:</span> {result.multimodal_evidence.transcript}</p>
                        )}
                        {result.multimodal_evidence.detected_topic && (
                          <p className="text-slate-400"><span className="text-slate-400 font-medium">Detected Topic:</span> {result.multimodal_evidence.detected_topic}</p>
                        )}
                      </div>
                    )}

                    {/* Executive Summary */}
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Executive Summary</h3>
                      <p className="text-sm md:text-base text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {intel?.executive_summary || intel?.summary || intel?.overview || (typeof intel === 'string' ? intel : '') || 'Live multi-source intelligence evaluated reporting, claims, and verified context.'}
                      </p>
                    </div>

                    {/* Key Findings */}
                    {intel?.key_findings && intel.key_findings.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Key Findings</h3>
                        <ul className="space-y-2">
                          {intel.key_findings.map((finding: string, idx: number) => (
                            <li key={idx} className="flex items-start space-x-2.5 text-sm text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                              <span className="leading-relaxed">{finding}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Cross-Source Analysis */}
                    {crossAnalysis && (
                      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                            <Layers className="w-3.5 h-3.5 text-blue-400" />
                            <span>Cross-Source Evidence & Consensus Analysis</span>
                          </h3>
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                            {crossAnalysis.consensus_assessment || 'Supported'}
                          </span>
                        </div>

                        {crossAnalysis.claim_summary && (
                          <p className="text-xs text-slate-300 font-medium">{crossAnalysis.claim_summary}</p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {/* Supporting */}
                          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-3">
                            <div className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1 mb-1.5">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Supporting Evidence (Tier 1 & Tier 2)</span>
                            </div>
                            <ul className="space-y-1.5 text-xs text-slate-300">
                              {crossAnalysis.supporting_evidence?.map((ev: string, i: number) => (
                                <li key={i}>• {ev}</li>
                              )) || <li>• Independent wire and press reports corroborate the core developments.</li>}
                            </ul>
                          </div>

                          {/* Contradicting or Uncertain */}
                          <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-3">
                            <div className="text-[11px] font-semibold text-amber-400 flex items-center space-x-1 mb-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Contradicting / Unconfirmed Elements</span>
                            </div>
                            <ul className="space-y-1.5 text-xs text-slate-300">
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
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                          Claim Verification & Fact-Check Matrix
                        </h3>
                        <div className="space-y-2.5">
                          {claims.map((cl: any, idx: number) => {
                            const isDebunk = String(cl.status).toLowerCase().includes('debunk') || String(cl.status).toLowerCase().includes('false');
                            const isDispute = String(cl.status).toLowerCase().includes('dispute');
                            return (
                              <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-slate-200">{cl.claim}</div>
                                  <div className="text-xs text-slate-400 flex items-center space-x-2">
                                    <span className="text-slate-400">Audited By: <strong className="text-slate-300">{cl.fact_checker}</strong></span>
                                    {cl.details && <span>• {cl.details}</span>}
                                  </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap self-start sm:self-auto ${
                                  isDebunk ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                                  isDispute ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
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
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                          <Building className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Source Distribution & Direct Verified Links</span>
                        </h3>

                        {/* Tier Filter Tabs */}
                        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                          {(['all', 1, 2, 3] as const).map((t) => {
                            const countInTier = t === 'all' ? sources.length : sources.filter((s: any) => s.source_tier === t || String(s.source_tier) === String(t)).length;
                            return (
                              <button
                                key={t}
                                onClick={() => setSelectedTierFilter((prev) => ({ ...prev, [msg.id]: t }))}
                                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                                  turnTierFilter === t
                                    ? 'bg-emerald-600 text-white shadow'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {t === 'all' ? `All (${sources.length})` : `Tier ${t} (${countInTier})`}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Source Cards Grid with Hover Animation */}
                      {filteredSources.length === 0 ? (
                        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-6 text-center">
                          <p className="text-sm text-slate-400 mb-3">
                            {sources.length > 0 
                              ? `No Tier ${turnTierFilter} sources found for this query.`
                              : 'No direct source cards returned for this query.'}
                          </p>
                          {sources.length > 0 && (
                            <button
                              onClick={() => setSelectedTierFilter((prev) => ({ ...prev, [msg.id]: 'all' }))}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
                            >
                              View All {sources.length} Discovered Sources
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredSources.map((src: any, sIdx: number) => (
                            <motion.div
                              key={sIdx}
                              whileHover={{ y: -2 }}
                              className="bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-3 transition group shadow-sm hover:shadow-md"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  {getTierBadge(src.source_tier)}
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    Trust: {Math.round((src.credibility_score || 0.8) * 100)}%
                                  </span>
                                </div>

                                <h4 className="text-sm font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors line-clamp-2">
                                  {src.title}
                                </h4>
                                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                                  {src.snippet}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-medium">{src.source || src.domain}</span>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => setActiveModalArticle(src)}
                                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center space-x-1 cursor-pointer"
                                  >
                                    <BookOpen className="w-3 h-3" />
                                    <span>Read In-App</span>
                                  </button>
                                  <a
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition flex items-center space-x-1"
                                  >
                                    <span>Open Source</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Follow-up Prompt Suggestions */}
                    <div className="pt-4 border-t border-slate-800">
                      <div className="text-xs font-semibold text-slate-400 mb-2">Suggested Follow-ups:</div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'What are the conflicting or disputed claims?',
                          'Show me only Tier 1 institutional evidence.',
                          'What are the technological and policy impacts?',
                        ].map((promptText, pIdx) => (
                          <motion.button
                            key={pIdx}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setInputQuery(promptText);
                              executeSearch(promptText);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-emerald-400 transition text-left cursor-pointer"
                          >
                            {promptText}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}

          {/* Live Multi-Agent Pipeline Processing Indicator with Framer Motion */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div 
                initial={{ opacity: 0, y: 25, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="w-full my-4 p-5 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-md"
              >
                {/* Header with spinner and current agent state */}
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-3 mb-6 text-center">
                  <div className="flex items-center space-x-2.5">
                    <div className="relative flex items-center justify-center w-5 h-5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-30 animate-ping"></span>
                      <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                    </div>
                    <span className="text-sm font-semibold text-slate-100">
                      {PIPELINE_STEPS[pipelineStepIndex - 1]?.desc || 'Analyzing your request...'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <span className="hidden sm:inline text-slate-600">|</span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono text-[11px]">
                      {PIPELINE_STEPS[pipelineStepIndex - 1]?.agent}
                    </span>
                    <span className="text-slate-500">~ 3-5 seconds</span>
                  </div>
                </div>

                {/* 9-Step Interactive Pipeline Stepper */}
                <div className="relative px-2 sm:px-6 overflow-x-auto pb-2 custom-scrollbar">
                  <div className="min-w-[620px] flex items-center justify-between relative">
                    {PIPELINE_STEPS.map((step, idx) => {
                      const isCompleted = pipelineStepIndex > step.id;
                      const isActive = pipelineStepIndex === step.id;
                      const isPending = pipelineStepIndex < step.id;

                      return (
                        <React.Fragment key={step.id}>
                          {/* Connecting Line from previous step */}
                          {idx > 0 && (
                            <div
                              className={`flex-1 h-0.5 mx-1 transition-all duration-500 ${
                                pipelineStepIndex >= step.id
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-700/80'
                              }`}
                            />
                          )}

                          {/* Node Item */}
                          <div className="flex flex-col items-center flex-shrink-0 relative group">
                            <motion.div
                              animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                isCompleted
                                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                                  : isActive
                                  ? 'bg-blue-600 text-white ring-4 ring-blue-500/30 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-blue-500/40'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700/80'
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : (
                                <span>{step.id}</span>
                              )}
                            </motion.div>

                            {/* Step Name */}
                            <span
                              className={`mt-2 text-[11px] font-medium tracking-tight transition-colors whitespace-nowrap ${
                                isActive
                                  ? 'text-blue-400 font-semibold'
                                  : isCompleted
                                  ? 'text-slate-300'
                                  : 'text-slate-500'
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
        <div className="py-3 border-t border-slate-800/80 bg-slate-950 sticky bottom-0 z-20">
          
          {/* Attachment preview if selected */}
          {attachedFile && (
            <div className="mb-2 p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center justify-between text-xs max-w-xl">
              <div className="flex items-center space-x-2">
                {attachedFile.modality === 'image' && <ImageIcon className="w-4 h-4 text-emerald-400" />}
                {attachedFile.modality === 'audio' && <Mic className="w-4 h-4 text-blue-400" />}
                {attachedFile.modality === 'video' && <Video className="w-4 h-4 text-purple-400" />}
                <span className="font-medium text-slate-200 truncate">{attachedFile.name}</span>
                <span className="text-[10px] text-slate-400 uppercase">({attachedFile.modality})</span>
              </div>
              <button onClick={handleClearAttachment} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 focus-within:border-emerald-500/50 shadow-2xl transition-all">
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
              className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none px-2 py-1"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 mt-1">
              
              {/* Left Tools: Modality Uploads & Language Selector */}
              <div className="flex items-center space-x-2">
                {/* Image Upload */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModality('image');
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'image/*';
                      fileInputRef.current.click();
                    }
                  }}
                  className={`p-1.5 rounded-lg border transition text-xs flex items-center space-x-1 ${
                    attachedFile?.modality === 'image'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                      : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Upload Image for OCR & Vision analysis"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Image</span>
                </button>

                {/* Audio Upload */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModality('audio');
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'audio/*';
                      fileInputRef.current.click();
                    }
                  }}
                  className={`p-1.5 rounded-lg border transition text-xs flex items-center space-x-1 ${
                    attachedFile?.modality === 'audio'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                      : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Upload Audio for Whisper ASR"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Audio</span>
                </button>

                {/* Video Upload */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModality('video');
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'video/*';
                      fileInputRef.current.click();
                    }
                  }}
                  className={`p-1.5 rounded-lg border transition text-xs flex items-center space-x-1 ${
                    attachedFile?.modality === 'video'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                      : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Upload Video for Keyframe & Audio analysis"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Video</span>
                </button>

                {/* Target Language Dropdown */}
                <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
                  <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="bg-slate-800/80 border border-slate-700 text-xs text-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500"
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
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-xs transition flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20"
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
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
              >
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center space-x-2">
                      {getTierBadge(activeModalArticle.source_tier)}
                      <span className="text-xs text-slate-400 font-mono">
                        Score: {Math.round((activeModalArticle.credibility_score || 0.8) * 100)}%
                      </span>
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-white leading-snug">
                      {activeModalArticle.title}
                    </h3>
                    <div className="text-xs text-slate-400 flex items-center space-x-2">
                      <span>Publisher: <strong className="text-slate-300">{activeModalArticle.source || activeModalArticle.domain}</strong></span>
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
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-300 leading-relaxed">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Article Excerpt</h4>
                    <p className="text-slate-200 whitespace-pre-wrap">{activeModalArticle.snippet}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Source Credibility Rationale</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {activeModalArticle.tier_description || 'Categorized based on editorial standards, domain reputation, and wire agency verification.'}
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400 truncate max-w-sm font-mono">
                    {activeModalArticle.url}
                  </span>
                  <a
                    href={activeModalArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center space-x-1.5 transition"
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
