import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, Lock, Mail, UserCheck, ArrowRight, AlertCircle, Eye, EyeOff,
  Activity, Globe2, ShieldCheck, Zap, Newspaper, CheckCircle2, TrendingUp,
  Cpu, Layers, BarChart2
} from 'lucide-react';
import { UserRole } from '../types';
import { MediaAutomationBackground } from '../components/MediaAutomationBackground';

interface LoginViewProps {
  onLoginSuccess: (user: { id: string; name: string; email: string; role: UserRole }, token: string) => void;
}

const LIVE_NEWS_FEED = [
  {
    id: 'n1',
    source: 'Reuters Global',
    tier: 'Tier 1 Verified',
    title: 'Autonomous Clean Energy Grid Expansion Approved Across 12 Nations',
    trustScore: 99.4,
    time: '2s ago',
    tag: 'Energy & Policy',
    category: 'Verified Claim'
  },
  {
    id: 'n2',
    source: 'Bloomberg Markets',
    tier: 'Tier 1 Verified',
    title: 'Tata Motors EV Infrastructure Scaling: Next-Gen Battery Architecture Deployed',
    trustScore: 98.8,
    time: '14s ago',
    tag: 'Automotive & EV',
    category: 'Consensus High'
  },
  {
    id: 'n3',
    source: 'Associated Press',
    tier: 'Tier 1 Verified',
    title: 'ISRO Gaganyaan Mission: Crew Module Avionics Pass Deep-Space Simulation',
    trustScore: 99.7,
    time: '28s ago',
    tag: 'Aerospace',
    category: 'Fact-Checked'
  },
  {
    id: 'n4',
    source: 'TechCrunch Frontier',
    tier: 'Tier 2 Trusted',
    title: 'Multimodal Neural Agent Architectures Surpass Human Benchmarks in Fact Validation',
    trustScore: 96.5,
    time: '45s ago',
    tag: 'AI & Research',
    category: 'Analysis Complete'
  }
];

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Admin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Animated News Stream Index
  const [activeNewsIndex, setActiveNewsIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveNewsIndex((prev) => (prev + 1) % LIVE_NEWS_FEED.length);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const emailClean = email.trim().toLowerCase();
      
      // Try backend endpoint first
      try {
        const res = await fetch('/api/discovery/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailClean, password, role: selectedRole })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            onLoginSuccess(data.user, data.token || 'auth-token');
            return;
          }
        }
      } catch (backendErr) {
        console.warn('Backend login endpoint unavailable, falling back to local auth validation:', backendErr);
      }

      // Local fallback verification for standard accounts
      const validPresets = ['admin@gmail.com', 'analyst@gmail.com', 'executive@gmail.com', 'client@gmail.com', 'gayu2007@gmail.com'];
      if (validPresets.includes(emailClean) && password === 'password') {
        const roleLabel = selectedRole;
        const nameMap: Record<string, string> = {
          'admin@gmail.com': 'System Administrator',
          'analyst@gmail.com': 'Lead Fact Analyst',
          'executive@gmail.com': 'Executive Leader',
          'client@gmail.com': 'Enterprise Client',
          'gayu2007@gmail.com': 'Platform Owner'
        };
        const userObj = {
          id: `usr-${emailClean.split('@')[0]}`,
          email: emailClean,
          name: nameMap[emailClean] || 'Discovery User',
          role: roleLabel
        };
        onLoginSuccess(userObj, `token-${emailClean}-${Date.now()}`);
      } else {
        setErrorMessage('Invalid email or password. Please verify your login credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-8 lg:py-12 relative overflow-hidden font-sans select-none">
      
      {/* Interactive Media Automation Network Canvas Background */}
      <MediaAutomationBackground nodeCount={60} interactive={true} showMediaLabels={true} />

      {/* Main Responsive Grid Container */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left Section: Animated Live Analytics & News Automation Showcase */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="lg:col-span-7 flex flex-col justify-center space-y-6 lg:pr-4"
        >
          {/* Platform Status Badge */}
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>10 Multi-Agent Pipeline Active</span>
            </div>
            <span className="text-xs text-slate-500 font-medium flex items-center space-x-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Real-Time Ingestion</span>
            </span>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Autonomous Multimodal <br />
              <span className="text-indigo-600">
                Intelligence & Verification
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-3 max-w-xl leading-relaxed">
              Continuous cross-lingual news ingestion, knowledge graph resolution, OCR/ASR validation, and 9-agent consensus synthesis.
            </p>
          </div>

          {/* Live Ingestion Metrics Deck */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Ingestion Rate</span>
                <Activity className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">1,840<span className="text-xs text-indigo-600 font-normal">/min</span></div>
              <div className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center space-x-1">
                <TrendingUp className="w-3 h-3" />
                <span>+14.2% global spikes</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Trust Consensus</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">99.2%</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Tier 1 Multi-Source</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Pipeline Nodes</span>
                <Cpu className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">9 Agents</div>
              <div className="text-[10px] text-purple-600 mt-0.5 font-medium">Zero Bottleneck</div>
            </div>
          </div>

          {/* Animated News Article Automation Live Showcase */}
          <div className="relative rounded-2xl bg-white border border-slate-200 p-5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs mb-3">
              <div className="flex items-center space-x-2">
                <Newspaper className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-900">Live Ingested News Stream</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-medium">
                <Globe2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Auto-Synthesized</span>
              </div>
            </div>

            {/* News Cards Carousel with Framer Motion AnimatePresence */}
            <div className="min-h-[100px] relative">
              <AnimatePresence mode="wait">
                {LIVE_NEWS_FEED.map((news, idx) => {
                  if (idx !== activeNewsIndex) return null;
                  return (
                    <motion.div
                      key={news.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold">
                            {news.source}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200">
                            {news.tier}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono">{news.time}</span>
                      </div>

                      <h4 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                        {news.title}
                      </h4>

                      <div className="flex items-center justify-between pt-2 text-[11px] border-t border-slate-100">
                        <div className="flex items-center space-x-1.5 text-emerald-600 font-semibold font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Credibility Score: {news.trustScore}%</span>
                        </div>
                        <span className="text-slate-500 text-[10px] bg-slate-100 px-2 py-0.5 rounded font-medium border border-slate-200">
                          {news.tag}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center space-x-1.5 mt-3 pt-2 border-t border-slate-100">
              {LIVE_NEWS_FEED.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveNewsIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    i === activeNewsIndex ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Section: Clean Professional White Login Card */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
          className="lg:col-span-5 w-full"
        >
          <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative">
            
            {/* Brand Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 p-0.5 mx-auto mb-3 flex items-center justify-center">
                <Compass className="w-7 h-7 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Discovery</h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Secure AI-Agent Platform Access</p>
            </div>

            {/* Error Alert */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Role Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Select Role</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition cursor-pointer appearance-none shadow-sm"
                  >
                    <option value="Admin">Admin (Full Platform Control)</option>
                    <option value="Analyst">Lead Fact Analyst (Verification & Queue)</option>
                    <option value="Executive">Executive (Briefs & Risk Reports)</option>
                    <option value="Client">Client (Search & Discovery Inquiries)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  name="discovery_email"
                  autoComplete="off"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition shadow-sm"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="discovery_password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50 mt-6 cursor-pointer"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In to Discovery</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
