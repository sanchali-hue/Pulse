import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Conversation, Message, User } from '../types';
import { SlimDock } from '../components/sidebar/SlimDock';
import { ConversationList } from '../components/sidebar/ConversationList';
import { ChatWindow } from '../components/chat/ChatWindow';
import { UserProfilePanel } from '../components/sidebar/UserProfilePanel';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Shield, Sliders, Volume2, HelpCircle, User as UserIcon, Sparkles, Smile } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const DashboardPage: React.FC = () => {
  const { user, updateProfile, updateStatus } = useAuth();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<'chats' | 'groups' | 'notifications' | 'profile' | 'settings'>('chats');
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [openProfileUser, setOpenProfileUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // Profile Edit fields
  const [editName, setEditName] = useState(user?.fullName || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editAvatar, setEditAvatar] = useState(user?.avatarUrl || '');
  const [editStatus, setEditStatus] = useState<User['status']>(user?.status || 'Active');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile(editName, editBio, editAvatar);
      await updateStatus(editStatus);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOpenProfile = (profile: User) => {
    setOpenProfileUser(profile);
  };

  return (
    <div className="flex h-screen w-screen p-6 gap-6 overflow-hidden relative">
      {/* Background radial effects */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-pulse-500/5 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-purple-500/5 rounded-full filter blur-[120px] pointer-events-none" />

      {/* 1. Left Section: Slim Navigation Dock */}
      <SlimDock
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // If switching tab to other details, clear selected chat or sheet if desired
          if (tab !== 'chats' && tab !== 'groups') {
            setSelectedChat(null);
          }
        }}
      />

      {/* 2. Middle Section: Dynamic selector list depending on Tab */}
      <AnimatePresence mode="wait">
        {(activeTab === 'chats' || activeTab === 'groups') && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="h-full"
          >
            <ConversationList
              selectedChatId={selectedChat?.id || null}
              setSelectedChat={(chat) => {
                setSelectedChat(chat);
                setOpenProfileUser(null); // Close sidebar profile details
              }}
              activeTab={activeTab}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Right Section: Active Chat Window OR other tab panels */}
      <div className="flex-1 h-full flex gap-6">
        <AnimatePresence mode="wait">
          {selectedChat ? (
            <motion.div
              key={`chat-${selectedChat.id}`}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              className="flex-1 h-full"
            >
              <ChatWindow
                chat={selectedChat}
                onOpenProfile={handleOpenProfile}
                messages={messages}
                setMessages={setMessages}
              />
            </motion.div>
          ) : activeTab === 'chats' || activeTab === 'groups' ? (
            /* Blank state for Chats/Groups */
            <motion.div
              key="chat-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`flex-1 h-full flex flex-col items-center justify-center rounded-2xl text-center p-6 ${
                theme === 'dark' ? 'glass-panel-dark text-white' : 'glass-panel-light text-zinc-900'
              }`}
            >
              <div className="w-16 h-16 bg-pulse-500/10 rounded-3xl flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-pulse-500 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold font-outfit">Select a conversation</h3>
              <p className={`text-xs mt-1 max-w-xs ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Choose from DMs or group channels in the list to start exchanging real-time messages.
              </p>
            </motion.div>
          ) : activeTab === 'notifications' ? (
            /* Notifications Panel */
            <motion.div
              key="notifications-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex-1 h-full flex flex-col p-8 rounded-2xl overflow-y-auto ${
                theme === 'dark' ? 'glass-panel-dark text-white' : 'glass-panel-light text-zinc-900'
              }`}
            >
              <h2 className="text-2xl font-bold font-outfit mb-6 flex items-center gap-2">
                <Bell className="w-6 h-6 text-pulse-500" />
                <span>Inbox Notifications</span>
              </h2>
              <div className="space-y-3.5">
                {[
                  {
                    title: 'System Security Upgrade',
                    body: 'Pulse real-time servers compiled successfully. All socket connection handshakes are encrypted.',
                    time: '10m ago',
                  },
                  {
                    title: 'Group Mention',
                    body: 'Alice Vance mentioned you in #Pulse-Design-Studio: "Let\'s use this channel to discuss layout feedback..."',
                    time: '1h ago',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${
                      theme === 'dark' ? 'border-white/5 bg-zinc-900/30' : 'border-black/5 bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold">{item.title}</h4>
                      <span className="text-[10px] text-zinc-500">{item.time}</span>
                    </div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>{item.body}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : activeTab === 'profile' ? (
            /* Profile Edit Form */
            <motion.div
              key="profile-edit-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex-1 h-full flex flex-col p-8 rounded-2xl overflow-y-auto ${
                theme === 'dark' ? 'glass-panel-dark text-white' : 'glass-panel-light text-zinc-900'
              }`}
            >
              <h2 className="text-2xl font-bold font-outfit mb-6 flex items-center gap-2">
                <UserIcon className="w-6 h-6 text-pulse-500" />
                <span>Manage Profile Workspace</span>
              </h2>

              <form onSubmit={handleProfileSave} className="max-w-md space-y-5">
                <div className="flex items-center gap-4">
                  <img
                    src={editAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`}
                    alt={user?.fullName}
                    className="w-16 h-16 rounded-2xl object-cover border border-white/10"
                  />
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      Select preset avatar URL
                    </label>
                    <input
                      type="text"
                      value={editAvatar}
                      onChange={(e) => setEditAvatar(e.target.value)}
                      className={`w-full px-3 py-1.5 text-xs ${
                        theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`w-full px-3.5 py-2 text-sm ${
                      theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Bio Description
                  </label>
                  <div className="relative">
                    <span className="absolute top-2.5 left-3">
                      <Smile className="w-4 h-4 text-zinc-500" />
                    </span>
                    <textarea
                      rows={3}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className={`w-full pl-9 pr-4 py-2 text-sm resize-none ${
                        theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Status Tag
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e: any) => setEditStatus(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border focus:outline-none focus:border-pulse-500 focus:ring-1 focus:ring-pulse-500 transition-all rounded-lg ${
                      theme === 'dark'
                        ? 'bg-zinc-900 border-zinc-800 text-white'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                    }`}
                  >
                    <option value="Active">🟢 Active</option>
                    <option value="Away">🟡 Away</option>
                    <option value="Do Not Disturb">🔴 Do Not Disturb</option>
                    <option value="Offline">⚫ Offline</option>
                  </select>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 bg-pulse-500 hover:bg-pulse-600 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Workspace Updates'}
                </motion.button>
              </form>
            </motion.div>
          ) : (
            /* Settings Panel */
            <motion.div
              key="settings-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex-1 h-full flex flex-col p-8 rounded-2xl overflow-y-auto ${
                theme === 'dark' ? 'glass-panel-dark text-white' : 'glass-panel-light text-zinc-900'
              }`}
            >
              <h2 className="text-2xl font-bold font-outfit mb-6 flex items-center gap-2">
                <Sliders className="w-6 h-6 text-pulse-500" />
                <span>Application Settings</span>
              </h2>

              <div className="max-w-md space-y-6">
                {/* Audio Toggles */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  theme === 'dark' ? 'border-white/5 bg-zinc-900/30' : 'border-black/5 bg-zinc-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-pulse-400" />
                    <div>
                      <h4 className="text-sm font-bold">Sound Notifications</h4>
                      <p className="text-[10px] text-zinc-500">Play alerts on incoming messages</p>
                    </div>
                  </div>
                  <div className="w-9 h-5 bg-pulse-500 rounded-full flex items-center px-0.5 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full ml-auto" />
                  </div>
                </div>

                {/* Privacy encryption */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  theme === 'dark' ? 'border-white/5 bg-zinc-900/30' : 'border-black/5 bg-zinc-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-pulse-400" />
                    <div>
                      <h4 className="text-sm font-bold">Workspace Encrypted</h4>
                      <p className="text-[10px] text-zinc-500">Secure real-time chats via TLS sockets</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>

                {/* About help center */}
                <div className="pt-4 border-t border-white/5 flex items-center gap-2 text-zinc-500 text-xs select-none">
                  <HelpCircle className="w-4 h-4" />
                  <span>Pulse Chat v1.0.0 — Licensed for developer audit</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. Sliding Profile panel (rightmost side) */}
        <AnimatePresence>
          {openProfileUser && (
            <UserProfilePanel
              userProfile={openProfileUser}
              conversationMessages={messages}
              onClose={() => setOpenProfileUser(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
