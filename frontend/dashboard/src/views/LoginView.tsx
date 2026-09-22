import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, Mail, Lock, ArrowRight, AlertCircle, 
  Eye, EyeOff
} from 'lucide-react';
import { UserRole } from '../types';
import { MediaAutomationBackground } from '../components/MediaAutomationBackground';

interface LoginViewProps {
  onLoginSuccess: (user: { id: string; name: string; email: string; role: UserRole; organization?: string; designation?: string }, token: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const emailClean = email.trim().toLowerCase();
    if (!emailClean || !emailClean.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    setIsLoading(true);

    // Retrieve any existing saved profile for this email
    const storageKey = `discovery_profile_${emailClean.replace(/[^a-z0-9]/g, '_')}`;
    const saved = localStorage.getItem(storageKey);
    let profileName = 'Karthick M';
    let profileOrg = 'Discovery AI Intelligence Lab';
    let profileRole = 'Lead Intelligence Analyst & Admin';

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name) profileName = parsed.name;
        if (parsed.organization) profileOrg = parsed.organization;
        if (parsed.designation) profileRole = parsed.designation;
      } catch (e) {
        // fallback
      }
    } else {
      const prefix = emailClean.split('@')[0];
      const capitalized = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      profileName = capitalized === 'Admin' ? 'Karthick M' : capitalized;
    }

    const userObj = {
      id: `usr-${emailClean.split('@')[0]}`,
      name: profileName,
      email: emailClean,
      role: 'Admin' as UserRole,
      organization: profileOrg,
      designation: profileRole,
    };

    setTimeout(() => {
      setIsLoading(false);
      // Mark that profile setup modal should open on discovery page if not previously completed
      sessionStorage.setItem('open_profile_setup_on_discovery', 'true');
      onLoginSuccess(userObj, `token-${emailClean}-${Date.now()}`);
    }, 350);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-center items-center px-4 py-8 lg:py-12 relative overflow-hidden font-sans select-none">
      
      {/* Framer motion Orange background canvas */}
      <MediaAutomationBackground nodeCount={60} interactive={true} showMediaLabels={true} />

      {/* Centered Login Box Container */}
      <div className="w-full max-w-md mx-auto relative z-10 flex flex-col items-center">
        
        {/* Top Status Pill */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-6 flex items-center space-x-2"
        >
          <div className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-xs font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
            <span>Discovery Multi-Agent Platform</span>
          </div>
        </motion.div>

        {/* Clean Pure White & Orange Centered Login Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="w-full"
        >
          <div className="w-full bg-white border border-orange-200 rounded-3xl p-7 sm:p-9 shadow-2xl shadow-orange-950/10 relative">
            
            {/* Brand Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 border border-orange-200 mx-auto mb-3.5 flex items-center justify-center shadow-sm">
                <Compass className="w-7 h-7 text-orange-600" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sign In to Discovery</h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">Enter your account credentials to access intelligence</p>
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
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-orange-600" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  name="discovery_email"
                  autoComplete="email"
                  required
                  placeholder="e.g. karthick@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-500/15 transition shadow-xs font-medium"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-orange-600" />
                    <span>Password</span>
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="discovery_password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-500/15 transition shadow-xs pr-10 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-orange-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-sm shadow-lg shadow-orange-600/25 transition flex items-center justify-center space-x-2 cursor-pointer mt-2 disabled:opacity-75"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-[11px] text-slate-400 font-medium">
              VeeTech Multi-Agent Autonomous Intelligence System • Zero Hallucination
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
