import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';
import type { Conversation, User } from '../../types';
import { Search, Plus, Pin, PinOff, MessageSquare, X, Check, UserPlus, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

interface ConversationListProps {
  selectedChatId: string | null;
  setSelectedChat: (chat: Conversation) => void;
  activeTab: 'chats' | 'groups' | 'notifications' | 'profile' | 'settings';
}

export const ConversationList: React.FC<ConversationListProps> = ({
  selectedChatId,
  setSelectedChat,
  activeTab,
}) => {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { theme } = useTheme();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // New chat / New group modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [modalTab, setModalTab] = useState<'dm' | 'group'>('dm');

  // DM creation
  const [dmSearch, setDmSearch] = useState('');
  const [dmSearchResults, setDmSearchResults] = useState<User[]>([]);
  const [startingDm, setStartingDm] = useState(false);

  // Group creation
  const [groupName, setGroupName] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState<User[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/conversations');
      setConversations(response.data);
    } catch (err) {
      console.error('Failed to load conversations', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [selectedChatId]);

  // Socket updates for list
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (message: any) => {
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id === message.conversationId) {
            return {
              ...conv,
              unreadCount: conv.id === selectedChatId ? 0 : conv.unreadCount + 1,
              lastMessage: {
                content: message.content,
                isSystem: message.isSystem,
                fileUrl: message.fileUrl,
                fileName: message.fileName,
                fileType: message.fileType,
                createdAt: message.createdAt,
              },
            };
          }
          return conv;
        });

        return [...updated].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
          const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });
      });
    };

    socket.on('message_received', handleMessageReceived);
    return () => {
      socket.off('message_received', handleMessageReceived);
    };
  }, [socket, selectedChatId]);

  // DM user search (debounced)
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (!dmSearch.trim()) {
        setDmSearchResults([]);
        return;
      }
      try {
        const response = await api.get(`/users?search=${dmSearch}`);
        setDmSearchResults(response.data);
      } catch (err) {
        console.error('Failed to search users', err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [dmSearch]);

  // Group user search (debounced)
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (!groupSearch.trim()) {
        setGroupSearchResults([]);
        return;
      }
      try {
        const response = await api.get(`/users?search=${groupSearch}`);
        setGroupSearchResults(response.data);
      } catch (err) {
        console.error('Failed to search users', err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [groupSearch]);

  // Start a DM with a user
  const handleStartDM = async (otherUserId: string) => {
    setStartingDm(true);
    try {
      const response = await api.post('/conversations', {
        participantIds: [otherUserId],
        isGroup: false,
      });
      const newConv = response.data;
      await fetchConversations();
      setSelectedChat(newConv);
      closeModal();
    } catch (err) {
      console.error('Failed to start DM', err);
    } finally {
      setStartingDm(false);
    }
  };

  // Create a group
  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedParticipants.length === 0) return;
    setCreatingGroup(true);
    try {
      const response = await api.post('/conversations', {
        name: groupName,
        isGroup: true,
        participantIds: selectedParticipants,
      });
      await fetchConversations();
      setSelectedChat(response.data);
      closeModal();
    } catch (err) {
      console.error('Failed to create group', err);
    } finally {
      setCreatingGroup(false);
    }
  };

  const closeModal = () => {
    setShowNewModal(false);
    setModalTab('dm');
    setDmSearch('');
    setDmSearchResults([]);
    setGroupName('');
    setGroupSearch('');
    setGroupSearchResults([]);
    setSelectedParticipants([]);
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleTogglePin = async (e: React.MouseEvent, chat: Conversation) => {
    e.stopPropagation();
    try {
      const action = chat.isPinned ? 'unpin' : 'pin';
      await api.post(`/conversations/${chat.id}/${action}`);
      fetchConversations();
    } catch (err) {
      console.error('Pin toggle failed', err);
    }
  };

  // Filter depending on tab
  const filteredConversations = conversations.filter((conv) => {
    if (activeTab === 'groups' && !conv.isGroup) return false;
    if (activeTab === 'chats' && conv.isGroup) return false;

    if (!searchQuery.trim()) return true;

    if (conv.isGroup) {
      return conv.name?.toLowerCase().includes(searchQuery.toLowerCase());
    } else {
      const otherUser = conv.participants.find((p) => p.id !== user?.id);
      return otherUser?.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    }
  });

  const getChatDetails = (conv: Conversation) => {
    if (conv.isGroup) {
      return {
        name: conv.name || 'Group Chat',
        avatar: conv.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${conv.name}`,
        isOnline: false,
      };
    } else {
      const otherUser = conv.participants.find((p) => p.id !== user?.id);
      const isOnline = otherUser ? onlineUsers.includes(otherUser.id) : false;
      return {
        name: otherUser?.fullName || 'User',
        avatar: otherUser?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${otherUser?.fullName}`,
        isOnline,
      };
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`w-80 h-full flex flex-col p-4 rounded-2xl ${
      theme === 'dark' ? 'glass-panel-dark text-white' : 'glass-panel-light text-zinc-900'
    } shadow-2xl relative z-10 overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold font-outfit tracking-wide bg-gradient-to-r from-pulse-400 to-purple-400 bg-clip-text text-transparent">
          {activeTab === 'groups' ? 'Groups' : 'Chats'}
        </h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowNewModal(true);
            setModalTab(activeTab === 'groups' ? 'group' : 'dm');
          }}
          className={`p-2 rounded-xl cursor-pointer ${
            theme === 'dark' ? 'bg-zinc-900/80 hover:bg-zinc-800 text-pulse-400' : 'bg-zinc-100 hover:bg-zinc-200 text-pulse-600'
          }`}
        >
          <Plus className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute top-3 left-3 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full pl-9 pr-4 py-2 text-sm ${
            theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
          }`}
        />
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => {
            const isSelected = selectedChatId === conv.id;
            const details = getChatDetails(conv);

            return (
              <motion.div
                layoutId={`chat-${conv.id}`}
                key={conv.id}
                onClick={() => setSelectedChat(conv)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 relative group select-none ${
                  isSelected
                    ? theme === 'dark'
                      ? 'bg-pulse-500/10 border border-pulse-500/30'
                      : 'bg-pulse-500/10 border border-pulse-500/20'
                    : theme === 'dark'
                      ? 'hover:bg-zinc-900/40 border border-transparent'
                      : 'hover:bg-zinc-100/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <img
                      src={details.avatar}
                      alt={details.name}
                      className="w-11 h-11 rounded-xl object-cover"
                    />
                    {details.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm font-semibold truncate ${
                        isSelected ? 'text-pulse-400'
                          : theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'
                      }`}>
                        {details.name}
                      </span>
                      {conv.lastMessage && (
                        <span className={`text-[10px] flex-shrink-0 ${
                          theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
                        }`}>
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <p className={`text-xs truncate max-w-[85%] ${
                        theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
                      }`}>
                        {conv.lastMessage
                          ? conv.lastMessage.isSystem
                            ? `⚡ ${conv.lastMessage.content}`
                            : conv.lastMessage.fileUrl
                              ? `📎 File`
                              : conv.lastMessage.content
                          : 'No messages yet'}
                      </p>

                      {conv.unreadCount > 0 && (
                        <span className="flex items-center justify-center min-w-5 h-5 px-1 bg-pulse-500 text-[10px] font-bold text-white rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pin action on hover */}
                <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                  <button
                    onClick={(e) => handleTogglePin(e, conv)}
                    className={`p-1 rounded bg-zinc-900/80 hover:bg-zinc-800 cursor-pointer ${
                      conv.isPinned ? 'text-amber-400' : 'text-zinc-400'
                    }`}
                  >
                    {conv.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {conv.isPinned && !isSelected && (
                  <div className="absolute left-1 top-1">
                    <Pin className="w-3 h-3 text-amber-500/80 rotate-45" />
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-500">
            <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-xs">No conversations yet</p>
            <button
              onClick={() => { setShowNewModal(true); setModalTab('dm'); }}
              className="mt-3 px-3 py-1.5 bg-pulse-500 hover:bg-pulse-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"
            >
              Start a new chat
            </button>
          </div>
        )}
      </div>

      {/* New Chat / New Group Modal */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-2xl overflow-hidden ${
                theme === 'dark' ? 'glass-panel-dark text-white' : 'glass-panel-light text-zinc-900'
              } shadow-2xl border border-white/10`}
            >
              {/* Tab Switcher */}
              <div className="flex border-b border-white/5">
                <button
                  onClick={() => setModalTab('dm')}
                  className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    modalTab === 'dm'
                      ? 'text-pulse-400 border-b-2 border-pulse-500'
                      : theme === 'dark' ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  New Chat
                </button>
                <button
                  onClick={() => setModalTab('group')}
                  className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    modalTab === 'group'
                      ? 'text-pulse-400 border-b-2 border-pulse-500'
                      : theme === 'dark' ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  New Group
                </button>
              </div>

              <div className="p-5">
                {/* DM Tab */}
                {modalTab === 'dm' && (
                  <div>
                    <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Search for a registered user to start chatting
                    </p>
                    <div className="relative mb-4">
                      <Search className="absolute top-2.5 left-3 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search by name, username, or email..."
                        value={dmSearch}
                        onChange={(e) => setDmSearch(e.target.value)}
                        className={`w-full pl-9 pr-4 py-2 text-sm ${
                          theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                        }`}
                      />
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-1">
                      {dmSearchResults.length > 0 ? (
                        dmSearchResults.map((u) => {
                          const isOnline = onlineUsers.includes(u.id);
                          return (
                            <div
                              key={u.id}
                              onClick={() => !startingDm && handleStartDM(u.id)}
                              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                                startingDm ? 'opacity-50 pointer-events-none' : ''
                              } ${theme === 'dark' ? 'hover:bg-zinc-900/60' : 'hover:bg-zinc-100'}`}
                            >
                              <div className="relative flex-shrink-0">
                                <img
                                  src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${u.fullName}`}
                                  alt={u.fullName}
                                  className="w-10 h-10 rounded-xl object-cover"
                                />
                                {isOnline && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold truncate">{u.fullName}</h4>
                                <span className={`text-[10px] ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                  @{u.username}
                                </span>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                isOnline
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'
                              }`}>
                                {isOnline ? 'Online' : u.status}
                              </span>
                            </div>
                          );
                        })
                      ) : dmSearch.trim() ? (
                        <div className="text-center py-10 text-zinc-500">
                          <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-xs">No users found matching "{dmSearch}"</p>
                          <p className="text-[10px] mt-1 opacity-60">They need to sign up on Pulse first</p>
                        </div>
                      ) : (
                        <div className="text-center py-10 text-zinc-500">
                          <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-xs">Type a name or username to find people</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Group Tab */}
                {modalTab === 'group' && (
                  <form onSubmit={handleCreateGroupSubmit}>
                    <div className="mb-4">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                        Group Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Design Team"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className={`w-full px-3.5 py-2 text-sm ${
                          theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                        }`}
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                        Add Members ({selectedParticipants.length} selected)
                      </label>
                      <div className="relative mb-2">
                        <Search className="absolute top-2.5 left-3 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={groupSearch}
                          onChange={(e) => setGroupSearch(e.target.value)}
                          className={`w-full pl-9 pr-4 py-2 text-xs ${
                            theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                          }`}
                        />
                      </div>

                      <div className={`max-h-36 overflow-y-auto space-y-1.5 rounded-lg p-2 ${
                        theme === 'dark' ? 'bg-zinc-950/30 border border-white/5' : 'bg-zinc-50 border border-black/5'
                      }`}>
                        {groupSearchResults.length > 0 ? (
                          groupSearchResults.map((u) => {
                            const isSelected = selectedParticipants.includes(u.id);
                            return (
                              <div
                                key={u.id}
                                onClick={() => toggleParticipant(u.id)}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                  isSelected ? 'bg-pulse-500/20 text-pulse-400' : 'hover:bg-white/5'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <img src={u.avatarUrl || ''} alt={u.fullName} className="w-8 h-8 rounded-lg object-cover" />
                                  <div>
                                    <h4 className="text-xs font-bold">{u.fullName}</h4>
                                    <span className="text-[10px] text-zinc-500">@{u.username}</span>
                                  </div>
                                </div>
                                <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                                  isSelected ? 'bg-pulse-500 border-pulse-500 text-white' : 'border-zinc-700'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </div>
                              </div>
                            );
                          })
                        ) : groupSearch.trim() ? (
                          <div className="text-center text-[10px] text-zinc-500 py-4">No users found</div>
                        ) : (
                          <div className="text-center text-[10px] text-zinc-500 py-4">Search to add members</div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 rounded-xl text-xs hover:bg-white/5 cursor-pointer text-zinc-400"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creatingGroup || !groupName.trim() || selectedParticipants.length === 0}
                        className="px-4 py-2 bg-pulse-500 hover:bg-pulse-600 text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                      >
                        {creatingGroup ? 'Creating...' : 'Create Group'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Close button */}
              <div className="absolute top-3 right-3">
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
