import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { Sparkles, ArrowRight, Smile, User as UserIcon } from 'lucide-react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', // Female 1
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', // Male 1
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', // Female 2
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', // Male 2
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80', // Female 3
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80', // Male 3
];

export const OnboardingPage: React.FC = () => {
  const { user, onboard } = useAuth();
  const { theme } = useTheme();
  
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState<'Active' | 'Away' | 'Do Not Disturb'>('Active');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [loading, setLoading] = useState(false);

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onboard(fullName, selectedAvatar, bio, status);
    } catch (err) {
      console.error('Onboarding submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full p-4 overflow-hidden">
      {/* Decorative floating blur circles */}
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-pulse-500/10 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-purple-500/10 rounded-full filter blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full max-w-xl p-8 rounded-3xl ${
          theme === 'dark' ? 'glass-panel-dark text-white' : 'glass-panel-light text-zinc-900'
        } shadow-2xl relative z-10`}
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 bg-pulse-500/20 rounded-2xl flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-pulse-500" />
          </div>
          <h2 className="text-2xl font-bold font-outfit">Welcome to Pulse, {user?.username}</h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Let's setup your profile so colleagues and friends can recognize you.
          </p>
        </div>

        <form onSubmit={handleOnboardSubmit} className="space-y-6">
          {/* Avatar picker */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-3 ${
              theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
            }`}>
              Select Profile Picture
            </label>
            <div className="grid grid-cols-6 gap-3">
              {PRESET_AVATARS.map((url, idx) => (
                <motion.button
                  key={idx}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedAvatar(url)}
                  className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer aspect-square ${
                    selectedAvatar === url ? 'border-pulse-500 scale-105 shadow-lg shadow-pulse-500/20' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                </motion.button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name input */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
              }`}>
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <UserIcon className="w-4 h-4 text-zinc-500" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 text-sm ${
                    theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                  }`}
                />
              </div>
            </div>

            {/* Status input */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
              }`}>
                Online Status
              </label>
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className={`w-full px-3 py-2.5 text-sm border focus:outline-none focus:border-pulse-500 focus:ring-1 focus:ring-pulse-500 transition-all rounded-lg ${
                  theme === 'dark'
                    ? 'bg-zinc-900 border-zinc-800 text-white'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                }`}
              >
                <option value="Active">🟢 Active</option>
                <option value="Away">🟡 Away</option>
                <option value="Do Not Disturb">🔴 Do Not Disturb</option>
              </select>
            </div>
          </div>

          {/* Bio input */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
              theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
            }`}>
              Bio Description
            </label>
            <div className="relative">
              <span className="absolute top-3 left-3">
                <Smile className="w-4 h-4 text-zinc-500" />
              </span>
              <textarea
                rows={3}
                placeholder="Share a little bit about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 text-sm resize-none ${
                  theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                }`}
              />
            </div>
          </div>

          {/* Submit button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-pulse-500 to-purple-600 hover:from-pulse-600 hover:to-purple-700 text-white font-semibold text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-pulse-500/10 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Complete Profile Setup</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};
