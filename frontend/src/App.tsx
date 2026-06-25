import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { Sparkles } from 'lucide-react';

const PulseAppRouter: React.FC = () => {
  const { user, token, loading } = useAuth();

  // Premium loading screen
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white">
        <MotionSpinner />
      </div>
    );
  }

  // Not authenticated
  if (!token || !user) {
    return <AuthPage />;
  }

  // Authenticated but onboarding incomplete
  if (!user.isOnboarded) {
    return <OnboardingPage />;
  }

  // Authenticated & onboarded
  return (
    <SocketProvider>
      <DashboardPage />
    </SocketProvider>
  );
};

// Loading spinner helper using CSS animations
const MotionSpinner = () => (
  <div className="flex flex-col items-center gap-4">
    <div className="relative flex items-center justify-center">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pulse-500 to-purple-600 animate-spin" />
      <Sparkles className="w-5 h-5 absolute text-white" />
    </div>
    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 animate-pulse">
      Syncing Pulse Sockets...
    </span>
  </div>
);

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PulseAppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
