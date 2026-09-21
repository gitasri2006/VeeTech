import React, { useState, useEffect } from 'react';
import {
  Settings, User as UserIcon, Shield, SlidersHorizontal, Plus, Trash2,
  Sparkles, CheckCircle2, AlertCircle, Play, Globe2, Clock, Check, X,
  Key, RefreshCw, Cpu, Layers, Database
} from 'lucide-react';
import { Rule, Entity } from '../types';
import { api } from '../services/api';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rules' | 'profile' | 'system'>('rules');

  // User Profile State
  const [userName, setUserName] = useState('Karthick M');
  const [userEmail, setUserEmail] = useState('karthick@discovery.ai');
  const [userRole, setUserRole] = useState('Lead Intelligence Analyst & Admin');
  const [userOrg, setUserOrg] = useState('Discovery AI Intelligence Lab');
  const [profileSaved, setProfileSaved] = useState(false);

  // Custom Rules State
  const [rules, setRules] = useState<Rule[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Rule Form State
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [recencyWindow, setRecencyWindow] = useState('24h');
  const [allowedDomains, setAllowedDomains] = useState('thehindu.com, economictimes.indiatimes.com, livemint.com, techcrunch.com');
  const [blockedDomains, setBlockedDomains] = useState('spammyblog.com');
  const [mustInclude, setMustInclude] = useState('');
  const [mustNotInclude, setMustNotInclude] = useState('');
  const [naturalLanguage, setNaturalLanguage] = useState('');
  const [isCompilingNL, setIsCompilingNL] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);

  // Sandbox Test State
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [isRunningSandbox, setIsRunningSandbox] = useState(false);

  useEffect(() => {
    loadRulesAndEntities();
  }, []);

  const loadRulesAndEntities = async () => {
    setIsLoadingRules(true);
    try {
      const [rulesList, entityList] = await Promise.all([
        api.listRules(),
        api.listEntities()
      ]);
      setRules(rulesList);
      setEntities(entityList);
      if (entityList.length > 0 && !selectedEntityId) {
        setSelectedEntityId(entityList[0].id);
      }
    } catch (e) {
      console.error('Failed to load rules/entities:', e);
    } finally {
      setIsLoadingRules(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleCompileNL = async () => {
    if (!naturalLanguage.trim()) return;
    setIsCompilingNL(true);
    try {
      const res = await api.compileRule(selectedEntityId || 'global', naturalLanguage);
      if (res) {
        setRecencyWindow(res.recency_window || '24h');
        if (res.domain_rules?.allowed_domains) {
          setAllowedDomains(res.domain_rules.allowed_domains.join(', '));
        }
        if (res.domain_rules?.blocked_domains) {
          setBlockedDomains(res.domain_rules.blocked_domains.join(', '));
        }
        if (res.boolean_terms?.must_include) {
          setMustInclude(res.boolean_terms.must_include.join(', '));
        }
        if (res.boolean_terms?.must_not_include) {
          setMustNotInclude(res.boolean_terms.must_not_include.join(', '));
        }
      }
    } catch (err) {
      console.error('NL Rule compile error:', err);
    } finally {
      setIsCompilingNL(false);
    }
  };

  const handleRunSandbox = async () => {
    setIsRunningSandbox(true);
    try {
      const sampleRule: Partial<Rule> = {
        entity_id: selectedEntityId || undefined,
        recency_window: recencyWindow,
        domain_rules: {
          allowed_domains: allowedDomains.split(',').map((s) => s.trim()).filter(Boolean),
          blocked_domains: blockedDomains.split(',').map((s) => s.trim()).filter(Boolean),
        },
        boolean_terms: {
          must_include: mustInclude.split(',').map((s) => s.trim()).filter(Boolean),
          must_not_include: mustNotInclude.split(',').map((s) => s.trim()).filter(Boolean),
        },
        natural_language: naturalLanguage || undefined,
      };
      const res = await api.runRuleSandbox(sampleRule, 30);
      setSandboxResult(res);
    } catch (e) {
      console.error('Sandbox run error:', e);
    } finally {
      setIsRunningSandbox(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRule(true);
    try {
      const newRule: Partial<Rule> = {
        entity_id: selectedEntityId || undefined,
        recency_window: recencyWindow,
        domain_rules: {
          allowed_domains: allowedDomains.split(',').map((s) => s.trim()).filter(Boolean),
          blocked_domains: blockedDomains.split(',').map((s) => s.trim()).filter(Boolean),
        },
        boolean_terms: {
          must_include: mustInclude.split(',').map((s) => s.trim()).filter(Boolean),
          must_not_include: mustNotInclude.split(',').map((s) => s.trim()).filter(Boolean),
        },
        natural_language: naturalLanguage || undefined,
      };
      await api.createRule(newRule);
      setShowCreateModal(false);
      // Reset form
      setNaturalLanguage('');
      setMustInclude('');
      setMustNotInclude('');
      setSandboxResult(null);
      await loadRulesAndEntities();
    } catch (e) {
      console.error('Create rule error:', e);
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this custom rule?')) return;
    await api.deleteRule(ruleId);
    await loadRulesAndEntities();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            <span>Control Center & User Preferences</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Settings & Custom Rule Engine</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your user account, customize real-time discovery rules without hardcoded limits, and inspect live runtime models.
          </p>
        </div>

        {activeTab === 'rules' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center space-x-2 transition shadow-lg shadow-emerald-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Rule</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'rules'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Custom User Rules ({rules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'profile'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>User Profile & Organization</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'system'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>AI Engines & Live Adapters</span>
        </button>
      </div>

      {/* TAB 1: CUSTOM RULES ENGINE */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {rules.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
              <SlidersHorizontal className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
              <div>
                <h3 className="text-base font-bold text-white">No Custom Rules Configured Yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Create flexible custom rules to filter live news by recency window, domain whitelists/blacklists, and mandatory/excluded keywords.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 px-5 rounded-xl inline-flex items-center space-x-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Author Your First Custom Rule</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rules.map((rule) => {
                const entityObj = entities.find((e) => e.id === rule.entity_id);
                return (
                  <div
                    key={rule.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition shadow-xl space-y-4 relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-mono text-emerald-400 uppercase font-semibold">
                          Rule: {rule.id.slice(0, 10)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {rule.natural_language && (
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 italic">
                        "{rule.natural_language}"
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Target Entity</span>
                        <span className="text-white font-medium">{entityObj ? entityObj.name : 'Global / All Topics'}</span>
                      </div>
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Recency Window</span>
                        <span className="text-emerald-300 font-medium">{rule.recency_window}</span>
                      </div>
                    </div>

                    {/* Details tags */}
                    <div className="space-y-2 text-xs">
                      {rule.boolean_terms?.must_include && rule.boolean_terms.must_include.length > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block mb-1">Mandatory Keywords:</span>
                          <div className="flex flex-wrap gap-1">
                            {rule.boolean_terms.must_include.map((t: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[11px] border border-emerald-500/20">
                                + {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {rule.boolean_terms?.must_not_include && rule.boolean_terms.must_not_include.length > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block mb-1">Excluded Keywords:</span>
                          <div className="flex flex-wrap gap-1">
                            {rule.boolean_terms.must_not_include.map((t: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[11px] border border-rose-500/20">
                                - {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {rule.domain_rules?.allowed_domains && rule.domain_rules.allowed_domains.length > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block mb-1">Allowed Domains:</span>
                          <span className="text-slate-300 text-[11px]">{rule.domain_rules.allowed_domains.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USER PROFILE & ACCOUNT */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-xl">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
              KM
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{userName}</h2>
              <p className="text-xs text-slate-400">{userRole} • {userOrg}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Full Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Email Address</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Organization / Enterprise</label>
              <input
                type="text"
                value={userOrg}
                onChange={(e) => setUserOrg(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Designation & Role</label>
              <input
                type="text"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 px-6 rounded-xl transition shadow-lg shadow-emerald-900/30"
              >
                Save Preferences
              </button>

              {profileSaved && (
                <span className="flex items-center space-x-1.5 text-emerald-400 text-xs font-semibold animate-fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Profile updated successfully</span>
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: SYSTEM STATUS & ENGINES */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Active AI Reasoning Engines</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white block">Primary Reasoning LLM</span>
                  <span className="text-slate-400 text-[11px]">Mistral Large / Codestral Live</span>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  PRIMARY ACTIVE
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white block">Fallback & Extraction LLM</span>
                  <span className="text-slate-400 text-[11px]">Google Gemini 2.5 Flash</span>
                </div>
                <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/30">
                  AUTO-FALLBACK
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Unified Backend Gateway</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white block">Gateway Architecture</span>
                  <span className="text-slate-400 text-[11px]">Single Consolidated Port 8000</span>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  10 SERVICES MOUNTED
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white block">PostgreSQL 18 & pgvector</span>
                  <span className="text-slate-400 text-[11px]">Dynamic persistent storage</span>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  CONNECTED
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE RULE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2 text-emerald-400">
                <SlidersHorizontal className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Create Custom Investigation Rule</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Natural Language Bar */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AI Natural Language Assistant</span>
                </span>
                <span className="text-slate-500 text-[11px]">Type in plain English to auto-populate parameters</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={naturalLanguage}
                  onChange={(e) => setNaturalLanguage(e.target.value)}
                  placeholder="e.g. Only alert me if Tier 1 Indian media covers banking regulations in the last 24h excluding cricket"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleCompileNL}
                  disabled={isCompilingNL || !naturalLanguage.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isCompilingNL ? <span>Parsing...</span> : <span>Auto-Fill</span>}
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Assign Target Entity (Optional)</label>
                  <select
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Global / All Searches</option>
                    {entities.map((ent) => (
                      <option key={ent.id} value={ent.id}>{ent.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Recency Window</label>
                  <select
                    value={recencyWindow}
                    onChange={(e) => setRecencyWindow(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="1h">Last 1 Hour (Ultra Breaking)</option>
                    <option value="6h">Last 6 Hours</option>
                    <option value="24h">Last 24 Hours (Today)</option>
                    <option value="48h">Last 48 Hours</option>
                    <option value="7d">Last 7 Days (Past Week)</option>
                    <option value="30d">Last 30 Days (Past Month)</option>
                    <option value="all">All Time (Full History)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Allowed / Whitelisted Domains (comma-separated)</label>
                <input
                  type="text"
                  value={allowedDomains}
                  onChange={(e) => setAllowedDomains(e.target.value)}
                  placeholder="e.g. thehindu.com, economictimes.indiatimes.com, techcrunch.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Blocked / Blacklisted Domains (comma-separated)</label>
                <input
                  type="text"
                  value={blockedDomains}
                  onChange={(e) => setBlockedDomains(e.target.value)}
                  placeholder="e.g. spammyblog.com, clickbait.net"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Mandatory Keywords (must include)</label>
                  <input
                    type="text"
                    value={mustInclude}
                    onChange={(e) => setMustInclude(e.target.value)}
                    placeholder="e.g. fintech, regulation, funding"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Excluded Keywords (must NOT include)</label>
                  <input
                    type="text"
                    value={mustNotInclude}
                    onChange={(e) => setMustNotInclude(e.target.value)}
                    placeholder="e.g. sports, cricket, horoscope"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Sandbox Preview */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRunSandbox}
                  disabled={isRunningSandbox}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs py-2 px-4 rounded-xl flex items-center space-x-2 transition border border-slate-700"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isRunningSandbox ? 'Evaluating against articles...' : 'Test in Sandbox Dry-Run'}</span>
                </button>

                {sandboxResult && (
                  <div className="mt-3 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Sandbox Evaluation Results:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                        {sandboxResult.pass_rate_pct}% Pass Rate
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Evaluated {sandboxResult.total_evaluated} sample database articles. {sandboxResult.passed_count} passed, {sandboxResult.failed_count} filtered out.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRule}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-5 rounded-xl transition shadow-lg shadow-emerald-900/30 flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingRule ? 'Saving Rule...' : 'Save & Activate Custom Rule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
