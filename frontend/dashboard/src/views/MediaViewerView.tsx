import React, { useState } from 'react';
import { Image, Video, Mic, CheckCircle2, AlertTriangle, Layers, Clock, Eye } from 'lucide-react';

export const MediaViewerView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'audio'>('image');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Layers className="w-4 h-4" />
          <span>Multimodal Extraction & Forensics (Agent 2)</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Multimodal Media Asset Inspector</h1>
        <p className="text-sm text-slate-400 mt-1">
          Inspect multi-stream forensic extractions across embedded Image OCR, Video Key-Frame Captioning, and Audio Speech-to-Text.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center space-x-3 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('image')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === 'image'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Image className="w-4 h-4" />
          <span>Image Sub-Module (OCR & Vision)</span>
        </button>

        <button
          onClick={() => setActiveTab('video')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === 'video'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Video Sub-Module (Multi-Stream)</span>
        </button>

        <button
          onClick={() => setActiveTab('audio')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === 'audio'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>Audio Sub-Module (ASR Speech-to-Text)</span>
        </button>
      </div>

      {/* Tab Content 1: Image OCR & Vision */}
      {activeTab === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Visual Asset Canvas */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Source Media Asset</h3>
            <div className="h-64 bg-slate-950 border border-slate-800 rounded-lg flex flex-col items-center justify-center text-slate-500 relative overflow-hidden">
              <Image className="w-12 h-12 mb-2 text-slate-600" />
              <span className="text-xs">whatsapp_forward_image_2026.jpg</span>
              <span className="text-[10px] text-slate-600">Resolution: 1920x1080 • SHA-256 Verified</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Authenticity Check: <strong className="text-emerald-400">Original / Untampered</strong></span>
              <span>Reverse Matches: <strong className="text-white">0 Recycled Instances</strong></span>
            </div>
          </div>

          {/* Extracted OCR & Vision Scene Description */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                <span>Optical Character Recognition (OCR)</span>
                <span className="text-[10px] text-slate-400">Tesseract / Cloud Vision</span>
              </h3>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
                "BREAKING: Ministry announces new fast-track charging subsidies for commercial transit operators."
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                <span>Visual Scene Captioning</span>
                <span className="text-[10px] text-slate-400">Gemini Vision</span>
              </h3>
              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 leading-relaxed">
                Photograph depicts industrial press conference in an automotive assembly hall with corporate executives standing in front of heavy electric commercial vehicles.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Video Multi-Stream */}
      {activeTab === 'video' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stream 1: ASR */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Mic className="w-3.5 h-3.5" />
                <span>Audio Track ASR</span>
              </h3>
              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 leading-relaxed font-mono">
                "Our target is 10,000 electric commercial units deployed across state transit routes before the third quarter."
              </p>
            </div>

            {/* Stream 2: Keyframes */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Keyframe Captions</span>
              </h3>
              <div className="space-y-2 text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>• [00:04] Presenter speaking at podium.</div>
                <div>• [00:22] Camera pans to new electric chassis.</div>
                <div>• [00:50] Graph showing battery density metrics.</div>
              </div>
            </div>

            {/* Stream 3: On-Screen Text OCR */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>On-Screen Burned-In OCR</span>
              </h3>
              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 leading-relaxed font-mono">
                Lower-Third: "Dr. Rajesh Verma — Chief Battery Architect, EV Propulsion Labs"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: Audio ASR */}
      {activeTab === 'audio' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Speech-To-Text Transcription Engine (Whisper / Cloud Speech)
            </h3>
            <span className="text-xs text-slate-400">Duration: 01:45 • Audio Sample Rate: 48kHz</span>
          </div>

          <div className="space-y-3">
            {[
              { time: '00:00 - 00:25', speaker: 'Speaker 1', text: 'Good morning everyone. Today we are presenting the final validation metrics of our zero-emission commercial transit pilot.' },
              { time: '00:25 - 00:55', speaker: 'Speaker 2', text: 'The battery cycles demonstrated a 98.4% uptime across high temperature operational conditions.' },
              { time: '00:55 - 01:30', speaker: 'Speaker 1', text: 'We will be releasing full performance logs to municipal transport authorities by end of month.' },
            ].map((entry, idx) => (
              <div key={idx} className="flex items-start space-x-4 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                <span className="font-mono text-slate-400 shrink-0">{entry.time}</span>
                <span className="font-bold text-emerald-400 shrink-0">{entry.speaker}:</span>
                <span className="text-slate-200">{entry.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
