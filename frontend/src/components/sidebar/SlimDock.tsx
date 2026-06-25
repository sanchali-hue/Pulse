import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MessageSquare, Users, Bell, Settings, LogOut, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';

interface SlimDockProps {
  activeTab: 'chats' | 'groups' | 'notifications' | 'profile' | 'settings';
  setActiveTab: (tab: 'chats' | 'groups' | 'notifications' | 'profile' | 'settings') => void;
}

export const SlimDock: React.FC<SlimDockProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const menuItems = [
    { id: 'chats', icon: MessageSquare, label: 'Chats' },
    { id: 'groups', icon: Users, label: 'Groups' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ] as const;

  return (
    <div className={`w-20 h-full flex flex-col items-center justify-between py-6 rounded-2xl ${
      theme === 'dark' ? 'glass-panel-dark text-white' : 'glass-panel-light text-zinc-900'
    } shadow-2xl transition-all duration-300 relative z-20`}>
      {/* Brand logo / Pulse Icon */}
      <div className="flex flex-col items-center">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="w-10 h-10 bg-gradient-to-tr from-pulse-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-pulse-500/20 mb-6 cursor-pointer"
        >
          <span className="font-outfit font-extrabold text-white text-base">P</span>
        </motion.div>
      </div>

      {/* Center Navigation Dock */}
      <div className="flex flex-col gap-5 w-full items-center">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div key={item.id} className="relative group flex justify-center w-full">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(item.id)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-pulse-500 text-white shadow-lg shadow-pulse-500/30'
                    : theme === 'dark'
                      ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                      : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <IconComponent className="w-5.5 h-5.5" />
              </motion.button>
              {/* Tooltip */}
              <span className={`pulse-tooltip left-16 top-3`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer controls: User Avatar & Theme switch & Logout */}
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Theme Switcher */}
        <div className="relative group">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer ${
              theme === 'dark' ? 'text-zinc-500 hover:text-zinc-200' : 'text-zinc-400 hover:text-zinc-700'
            }`}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </motion.button>
          <span className="pulse-tooltip left-16 top-2">
            Theme Toggler
          </span>
        </div>

        {/* Profile Avatar trigger */}
        <div className="relative group">
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setActiveTab('profile')}
            className={`relative rounded-xl overflow-hidden border border-white/10 shadow-lg cursor-pointer ${
              activeTab === 'profile' ? 'ring-2 ring-pulse-500' : ''
            }`}
          >
            <img
              src={user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`}
              alt={user?.fullName}
              className="w-10 h-10 object-cover"
            />
          </motion.button>
          <span className="pulse-tooltip left-16 top-2">
            My Profile
          </span>
        </div>

        {/* Logout */}
        <div className="relative group">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={logout}
            className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer ${
              theme === 'dark' ? 'text-zinc-500 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'
            }`}
          >
            <LogOut className="w-5 h-5" />
          </motion.button>
          <span className="pulse-tooltip left-16 top-2">
            Logout
          </span>
        </div>
      </div>
    </div>
  );
};
