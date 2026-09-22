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
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 text-slate-900 min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-orange-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Entity Profiles & Disambiguation</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Entity & Client Management</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Manage tracked corporate entities, disambiguation prompts, seed terms, and edit-precedence locks.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center space-x-2 transition shadow-sm cursor-pointer"
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
            className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-orange-300 transition shadow-sm hover:shadow-md space-y-4"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{entity.type}</span>
                <h2 className="text-lg font-bold text-slate-900 leading-snug">{entity.name}</h2>
              </div>
              <div className="flex items-center space-x-2">
                {entity.edit_precedence_locked ? (
                  <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Lock className="w-3 h-3" />
                    <span>Analyst Locked</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    <Unlock className="w-3 h-3" />
                    <span>Auto-Enriching</span>
                  </span>
                )}
              </div>
            </div>

            {/* Aliases */}
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-1.5">Monitored Aliases</span>
              <div className="flex flex-wrap gap-1.5">
                {entity.aliases.map((al, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-md text-xs bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                    {al}
                  </span>
                ))}
              </div>
            </div>

            {/* Seed Terms */}
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-1.5">Seed Expansion Terms</span>
              <div className="flex flex-wrap gap-1.5">
                {entity.seed_terms.map((st, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-md text-xs bg-orange-50 border border-orange-200 text-orange-700 font-medium">
                    {st}
                  </span>
                ))}
              </div>
            </div>

            {/* Disambiguation Context */}
            {entity.disambiguation_context && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500 block mb-1">Disambiguation Logic</span>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed font-medium">
                  {entity.disambiguation_context}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Onboard Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Onboard Tracked Entity</h2>
            <form onSubmit={handleCreate} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Entity Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tata Motors"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Entity Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 shadow-sm"
                >
                  <option value="Company">Company / Enterprise</option>
                  <option value="Person">Public Figure / Executive</option>
                  <option value="Institution">Government / NGO</option>
                  <option value="Product">Product / Technology Platform</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Monitored Aliases (comma-separated)</label>
                <input
                  type="text"
                  value={aliases}
                  onChange={(e) => setAliases(e.target.value)}
                  placeholder="Tata Motors Ltd, Tata Motors EV, TaMo"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Seed Terms (comma-separated)</label>
                <input
                  type="text"
                  value={seedTerms}
                  onChange={(e) => setSeedTerms(e.target.value)}
                  placeholder="commercial vehicle, electric bus, battery pack"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Disambiguation Context Prompt</label>
                <textarea
                  rows={3}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Explain how to differentiate this entity from homonyms or unrelated subsidiaries..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 shadow-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-sm cursor-pointer"
                >
                  {isSubmitting ? 'Onboarding...' : 'Save Entity Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
