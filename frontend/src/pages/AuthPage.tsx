import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User as UserIcon, ShieldAlert, Sparkles, Globe } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const AuthPage: React.FC = () => {
  const { login, signup, loginWithGoogle, error, clearError } = useAuth();
  const { theme } = useTheme();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage(null);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'signup') {
        await signup(email, password, username, fullName);
      } else if (mode === 'forgot') {
        // Mock post request
        const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessMessage(data.message);
        } else {
          throw new Error(data.error || 'Failed to dispatch password recovery email.');
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    clearError();
    try {
      // Mocking a Google OAuth response payload
      const mockGoogleEmails = ['designer.alex@gmail.com', 'julia.code@gmail.com', 'developer.steve@gmail.com'];
      const mockGoogleNames = ['Alex Vance', 'Julia Code', 'Steve Dev'];
      const randomIdx = Math.floor(Math.random() * mockGoogleEmails.length);

      await loginWithGoogle(
        mockGoogleEmails[randomIdx],
        mockGoogleNames[randomIdx],
        `google-id-${Date.now()}`,
        `https://api.dicebear.com/7.x/initials/svg?seed=${mockGoogleNames[randomIdx]}`
      );
    } catch (err) {
      console.error('Google login mock error:', err);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'signup' | 'forgot') => {
    clearError();
    setSuccessMessage(null);
    setMode(newMode);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full p-4 overflow-hidden">
      {/* Decorative floating blur circles */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-pulse-500/10 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`w-full max-w-md p-8 rounded-3xl ${
          theme === 'dark' ? 'glass-panel-dark text-white' : 'glass-panel-light text-zinc-900'
        } shadow-2xl relative z-10`}
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="w-14 h-14 bg-gradient-to-tr from-pulse-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pulse-500/20 mb-4"
          >
            <Sparkles className="w-7 h-7 text-white" />
          </motion.div>
          <h2 className="text-3xl font-extrabold tracking-widest font-outfit uppercase bg-gradient-to-r from-pulse-400 to-purple-500 bg-clip-text text-transparent">
            Pulse
          </h2>
          <p className={`text-xs mt-1 font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Feel the Rhythm of Conversation
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 p-3.5 mb-6 text-sm rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 font-medium"
            >
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 p-3.5 mb-6 text-sm rounded-xl border border-green-500/20 bg-green-500/10 text-green-400 font-medium"
            >
              <Sparkles className="w-5 h-5 flex-shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === 'signup' && (
              <motion.div
                key="signup-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <UserIcon className="w-5 h-5 text-zinc-500" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    className={`w-full pl-10 pr-4 py-3 text-sm ${
                      theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                    }`}
                  />
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <UserIcon className="w-5 h-5 text-zinc-500" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 text-sm ${
                      theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                    }`}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="w-5 h-5 text-zinc-500" />
            </span>
            <input
              type="email"
              required
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 text-sm ${
                theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
              }`}
            />
          </div>

          {mode !== 'forgot' && (
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="w-5 h-5 text-zinc-500" />
              </span>
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 text-sm ${
                  theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                }`}
              />
            </div>
          )}

          {mode === 'login' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-xs text-pulse-400 hover:text-pulse-300 font-medium transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-pulse-500 to-purple-600 hover:from-pulse-600 hover:to-purple-700 text-white font-semibold text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-pulse-500/10 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'login' ? (
              'Sign In'
            ) : mode === 'signup' ? (
              'Create Account'
            ) : (
              'Send Reset Link'
            )}
          </motion.button>
        </form>

        {mode !== 'forgot' && (
          <>
            <div className="relative flex items-center justify-center my-6">
              <div className={`w-full border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`} />
              <span className={`absolute px-3 text-xs uppercase font-semibold ${
                theme === 'dark' ? 'bg-zinc-950/20 text-zinc-500' : 'bg-white text-zinc-400'
              }`}>
                Or continue with
              </span>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleGoogleLogin}
              disabled={loading}
              type="button"
              className={`w-full py-3 border ${
                theme === 'dark'
                  ? 'border-zinc-800 hover:bg-zinc-900/40 text-white'
                  : 'border-zinc-200 hover:bg-zinc-50 text-zinc-800'
              } font-medium text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50`}
            >
              <Globe className="w-5 h-5 text-pulse-400" />
              <span>Google Authentication</span>
            </motion.button>
          </>
        )}

        <div className="mt-8 text-center text-xs">
          {mode === 'login' ? (
            <p className={theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}>
              Don't have an account?{' '}
              <button onClick={() => switchMode('signup')} className="text-pulse-400 hover:underline font-semibold">
                Sign Up
              </button>
            </p>
          ) : mode === 'signup' ? (
            <p className={theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}>
              Already have an account?{' '}
              <button onClick={() => switchMode('login')} className="text-pulse-400 hover:underline font-semibold">
                Sign In
              </button>
            </p>
          ) : (
            <p className={theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}>
              Remembered your credentials?{' '}
              <button onClick={() => switchMode('login')} className="text-pulse-400 hover:underline font-semibold">
                Sign In
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
