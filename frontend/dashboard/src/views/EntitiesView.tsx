import React, { useState, useEffect } from 'react';
import { Building2, Plus, Lock, Unlock, RefreshCw, CheckCircle2, Shield, Trash2, Edit3 } from 'lucide-react';
import { Entity } from '../types';
import { api } from '../services/api';

export const EntitiesView: React.FC = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Company');
  const [url, setUrl] = useState('');
  const [aliases, setAliases] = useState('');
  const [seedTerms, setSeedTerms] = useState('');
  const [exclusionTerms, setExclusionTerms] = useState('');
  const [context, setContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    const list = await api.listEntities();
    setEntities(list);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    await api.createEntity({
      name,
      type,
      aliases: aliases.split(',').map((s) => s.trim()).filter(Boolean),
      seed_terms: seedTerms.split(',').map((s) => s.trim()).filter(Boolean),
      exclusion_terms: exclusionTerms.split(',').map((s) => s.trim()).filter(Boolean),
      disambiguation_context: context,
    });

    setIsSubmitting(false);
    setShowModal(false);
    setName('');
    setAliases('');
    setSeedTerms('');
    setExclusionTerms('');
    setContext('');
    loadEntities();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Entity Profile Agent (Agent 3)</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Entity & Client Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage tracked corporate entities, disambiguation prompts, seed terms, and edit-precedence locks.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center space-x-2 transition shadow-lg shadow-emerald-900/30"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard Tracked Entity</span>
        </button>
      </div>

      {/* Entities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {entities.map((entity) => (
          <div
            key={entity.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition shadow-lg space-y-4"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{entity.type}</span>
                <h2 className="text-lg font-bold text-white leading-snug">{entity.name}</h2>
              </div>
              <div className="flex items-center space-x-2">
                {entity.edit_precedence_locked ? (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Lock className="w-3 h-3" />
                    <span>Analyst Locked</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                    <Unlock className="w-3 h-3" />
                    <span>Auto-Enriching</span>
                  </span>
                )}
              </div>
            </div>

            {/* Context Prompt */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300">
              <span className="text-slate-400 block font-semibold mb-1">Disambiguation Context:</span>
              <p className="leading-relaxed">{entity.disambiguation_context}</p>
            </div>

            {/* Seed Terms & Aliases Chips */}
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-1">Seed Terms ({entity.seed_terms.length}):</span>
                <div className="flex flex-wrap gap-1.5">
                  {entity.seed_terms.map((t, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700 text-[11px]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {entity.exclusion_terms.length > 0 && (
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Exclusion Terms ({entity.exclusion_terms.length}):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {entity.exclusion_terms.map((ex, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[11px]">
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
              <span>768-dim Vector Generated</span>
              <button className="flex items-center space-x-1 text-slate-400 hover:text-white transition">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-Profile Embeddings</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Onboarding Entity */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Onboard New Tracked Entity</h2>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Entity Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tata Motors EV"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Company">Company</option>
                  <option value="Person">Person</option>
                  <option value="Product">Product</option>
                  <option value="Organization">Organization / Project</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Seed Terms (comma separated)</label>
                <input
                  type="text"
                  value={seedTerms}
                  onChange={(e) => setSeedTerms(e.target.value)}
                  placeholder="e.g. Tata Motors, Nexon EV, Punch EV"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Exclusion Terms (comma separated)</label>
                <input
                  type="text"
                  value={exclusionTerms}
                  onChange={(e) => setExclusionTerms(e.target.value)}
                  placeholder="e.g. Tata Salt, Tata Steel"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Disambiguation Context Prompt</label>
                <textarea
                  rows={3}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Explain what distinguish this entity from homonyms or sister divisions..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  {isSubmitting ? 'Profiling...' : 'Create & Generate Embeddings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
