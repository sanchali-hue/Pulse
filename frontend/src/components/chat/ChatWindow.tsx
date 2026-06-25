import React, { useEffect, useRef, useState } from 'react';
import type { Conversation, Message, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Phone,
  Video,
  Info,
  CornerUpLeft,
  Edit2,
  Trash2,
  X,
  File,
  Play,
  Pause,
  Sparkles,
  CheckCheck,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ChatWindowProps {
  chat: Conversation;
  onOpenProfile: (profile: User) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '🙏'];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  onOpenProfile,
  messages,
  setMessages,
}) => {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { theme } = useTheme();

  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<{ userId: string; username: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // File Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Voice Note Recorder State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const otherParticipant = chat.isGroup
    ? null
    : chat.participants.find((p) => p.id !== user?.id) || null;

  const chatTitle = chat.isGroup ? chat.name : otherParticipant?.fullName || 'Chat';
  const chatAvatar = chat.isGroup
    ? chat.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.name}`
    : otherParticipant?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${otherParticipant?.fullName}`;

  const isOtherOnline = otherParticipant ? onlineUsers.includes(otherParticipant.id) : false;

  // Load Messages from API
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await api.get(`/messages/${chat.id}`);
        setMessages(response.data);
        scrollToBottom();
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    };
    fetchMessages();

    if (socket) {
      socket.emit('join_chat', chat.id);
    }

    return () => {
      if (socket) {
        socket.emit('leave_chat', chat.id);
      }
      setReplyMessage(null);
      setEditingMessage(null);
    };
  }, [chat.id, socket]);

  // Read Receipts trigger
  useEffect(() => {
    if (messages.length > 0 && socket && user) {
      const unread = messages.filter((m) => m.senderId !== user.id && !m.reads.some((r) => r.userId === user.id));
      unread.forEach(async (m) => {
        try {
          await api.post(`/messages/${m.id}/read`);
          socket.emit('message_read', {
            messageId: m.id,
            conversationId: chat.id,
            userId: user.id,
            readAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error(err);
        }
      });
    }
  }, [messages, chat.id, socket, user]);

  // Sockets listening for events inside room
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (msg: any) => {
      if (msg.conversationId === chat.id) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }
    };

    const handleMessageEdited = (msg: any) => {
      if (msg.conversationId === chat.id) {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
      }
    };

    const handleMessageDeleted = (msg: any) => {
      if (msg.conversationId === chat.id) {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
      }
    };

    const handleTyping = (data: { room: string; userId: string; username: string }) => {
      if (data.room === chat.id && data.userId !== user?.id) {
        setTypingUsers((prev) => {
          if (!prev.some((u) => u.userId === data.userId)) {
            return [...prev, { userId: data.userId, username: data.username }];
          }
          return prev;
        });
      }
    };

    const handleStopTyping = (data: { room: string; userId: string }) => {
      if (data.room === chat.id) {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }
    };

    const handleReactionAdded = (data: { messageId: string; reaction: any }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === data.messageId) {
            const exists = m.reactions.some((r) => r.id === data.reaction.id);
            return {
              ...m,
              reactions: exists ? m.reactions : [...m.reactions, data.reaction],
            };
          }
          return m;
        })
      );
    };

    const handleReactionRemoved = (data: { messageId: string; userId: string; emoji: string }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === data.messageId) {
            return {
              ...m,
              reactions: m.reactions.filter((r) => !(r.userId === data.userId && r.emoji === data.emoji)),
            };
          }
          return m;
        })
      );
    };

    const handleReadReceipt = (data: { messageId: string; userId: string; readAt: string }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === data.messageId) {
            const hasRead = m.reads.some((r) => r.userId === data.userId);
            return {
              ...m,
              reads: hasRead ? m.reads : [...m.reads, { userId: data.userId, readAt: data.readAt }],
            };
          }
          return m;
        })
      );
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('reaction_added', handleReactionAdded);
    socket.on('reaction_removed', handleReactionRemoved);
    socket.on('message_read_receipt', handleReadReceipt);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('reaction_added', handleReactionAdded);
      socket.off('reaction_removed', handleReactionRemoved);
      socket.off('message_read_receipt', handleReadReceipt);
    };
  }, [socket, chat.id, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Typing timer mechanics
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!socket || !user) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { room: chat.id, userId: user.id, username: user.username });
    }

    const lastTypingTime = new Date().getTime();
    const timerLength = 2000;

    setTimeout(() => {
      const timeNow = new Date().getTime();
      const difference = timeNow - lastTypingTime;
      if (difference >= timerLength && isTyping) {
        socket.emit('stop_typing', { room: chat.id, userId: user.id });
        setIsTyping(false);
      }
    }, timerLength);
  };

  // Submit new text message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      if (editingMessage) {
        // Edit flow
        const response = await api.put(`/messages/${editingMessage.id}`, { content: inputText });
        setMessages((prev) => prev.map((m) => (m.id === editingMessage.id ? response.data : m)));
        if (socket) {
          socket.emit('edit_message', { message: response.data, conversationId: chat.id });
        }
        setEditingMessage(null);
      } else {
        // Create new message flow
        const payload = {
          conversationId: chat.id,
          content: inputText,
          replyToId: replyMessage?.id || undefined,
        };

        const response = await api.post('/messages', payload);
        setMessages((prev) => [...prev, response.data]);
        if (socket) {
          socket.emit('new_message', { message: response.data, conversationId: chat.id });
          socket.emit('stop_typing', { room: chat.id, userId: user?.id });
          setIsTyping(false);
        }
        setReplyMessage(null);
      }
      setInputText('');
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete message
  const handleDeleteMessage = async (message: Message) => {
    try {
      const response = await api.delete(`/messages/${message.id}`);
      setMessages((prev) => prev.map((m) => (m.id === message.id ? response.data : m)));
      if (socket) {
        socket.emit('delete_message', { message: response.data, conversationId: chat.id });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle reactions
  const handleReactionToggle = async (messageId: string, emoji: string) => {
    try {
      const response = await api.post(`/messages/${messageId}/reaction`, { emoji });
      const action = response.data.action;

      if (action === 'added') {
        const reaction = response.data;
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: [...m.reactions, reaction] } : m))
        );
        if (socket) {
          socket.emit('add_reaction', { messageId, conversationId: chat.id, reaction });
        }
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, reactions: m.reactions.filter((r) => !(r.userId === user?.id && r.emoji === emoji)) }
              : m
          )
        );
        if (socket) {
          socket.emit('remove_reaction', { messageId, conversationId: chat.id, userId: user?.id, emoji });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Document/Image file uploading handler
  const handleUpload = async (file: File) => {
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          setUploadProgress(percentCompleted);
        },
      });

      const { fileUrl, fileName, fileType } = response.data;

      // Automatically post as message
      const msgRes = await api.post('/messages', {
        conversationId: chat.id,
        content: `Shared a file: ${fileName}`,
        fileUrl,
        fileName,
        fileType,
      });

      setMessages((prev) => [...prev, msgRes.data]);
      if (socket) {
        socket.emit('new_message', { message: msgRes.data, conversationId: chat.id });
      }
      scrollToBottom();
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploadProgress(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  // Voice note recording processes
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new (window as any).File([audioBlob], 'Voice Note.webm', { type: 'audio/webm' });
        await handleUpload(file);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Audio recorder initialization failed', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatRecordTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`flex-1 h-full flex flex-col rounded-2xl relative ${
        theme === 'dark' ? 'glass-panel-dark text-white' : 'glass-panel-light text-zinc-900'
      } shadow-2xl relative z-10 overflow-hidden`}
    >
      {/* Drag & Drop Visual Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-pulse-950/80 backdrop-blur-md z-40 border-2 border-dashed border-pulse-500 rounded-2xl flex flex-col items-center justify-center pointer-events-none"
          >
            <Paperclip className="w-12 h-12 text-pulse-400 animate-bounce mb-3" />
            <h3 className="text-lg font-bold font-outfit text-white">Drop to upload file</h3>
            <p className="text-xs text-zinc-400">Files up to 25MB are accepted</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className={`p-4 flex items-center justify-between border-b ${
        theme === 'dark' ? 'border-white/5' : 'border-black/5'
      }`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={chatAvatar || undefined} alt={chatTitle || undefined} className="w-10 h-10 rounded-xl object-cover" />
            {isOtherOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2.5 border-zinc-950 rounded-full" />
            )}
          </div>
          <div>
            <h4
              onClick={() => otherParticipant && onOpenProfile(otherParticipant)}
              className="text-sm font-bold cursor-pointer hover:text-pulse-400 font-outfit transition-colors"
            >
              {chatTitle}
            </h4>
            <p className={`text-[10px] ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {chat.isGroup
                ? `${chat.participants.length} colleagues participating`
                : isOtherOnline
                  ? `Active now`
                  : otherParticipant?.status || 'Offline'}
            </p>
          </div>
        </div>

        {/* Video / Voice mock call actions */}
        <div className="flex items-center gap-1">
          <button className={`p-2 rounded-lg cursor-pointer ${
            theme === 'dark' ? 'hover:bg-white/5 text-zinc-400' : 'hover:bg-black/5 text-zinc-500'
          }`}>
            <Phone className="w-4 h-4" />
          </button>
          <button className={`p-2 rounded-lg cursor-pointer ${
            theme === 'dark' ? 'hover:bg-white/5 text-zinc-400' : 'hover:bg-black/5 text-zinc-500'
          }`}>
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={() => otherParticipant && onOpenProfile(otherParticipant)}
            className={`p-2 rounded-lg cursor-pointer ${
              theme === 'dark' ? 'hover:bg-white/5 text-zinc-400 font-bold' : 'hover:bg-black/5 text-zinc-500'
            }`}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Upload Progress Bar */}
      {uploadProgress !== null && (
        <div className="w-full bg-zinc-950 h-1 relative overflow-hidden">
          <div
            className="bg-gradient-to-r from-pulse-500 to-purple-600 h-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Messages scrolling stack */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length > 0 ? (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.id;
            const messageDate = new Date(msg.createdAt).toLocaleDateString();
            const prevMsgDate =
              index > 0 ? new Date(messages[index - 1].createdAt).toLocaleDateString() : null;

            return (
              <React.Fragment key={msg.id}>
                {/* Date Grouping separator */}
                {messageDate !== prevMsgDate && (
                  <div className="flex items-center justify-center my-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                      theme === 'dark' ? 'bg-zinc-900/60 text-zinc-500' : 'bg-zinc-200/50 text-zinc-500'
                    }`}>
                      {messageDate === new Date().toLocaleDateString()
                        ? 'Today'
                        : messageDate === new Date(Date.now() - 86400000).toLocaleDateString()
                          ? 'Yesterday'
                          : messageDate}
                    </span>
                  </div>
                )}

                {/* System Message */}
                {msg.isSystem ? (
                  <div className="flex justify-center text-center my-2 select-none">
                    <span className="text-[10px] font-medium text-zinc-500 bg-pulse-500/5 border border-pulse-500/10 px-3 py-1 rounded-lg">
                      {msg.content}
                    </span>
                  </div>
                ) : (
                  <div className={`flex gap-3 group relative ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {/* User Avatar (only for other users) */}
                    {!isMe && (
                      <img
                        src={msg.sender.avatarUrl || ''}
                        alt={msg.sender.fullName}
                        className="w-8 h-8 rounded-lg object-cover flex-shrink-0 cursor-pointer shadow-sm hover:scale-105 transition-transform"
                        onClick={() => onOpenProfile(msg.sender as any)}
                      />
                    )}

                    <div className="max-w-[70%] flex flex-col">
                      {/* Name of group participant */}
                      {!isMe && chat.isGroup && (
                        <span className="text-[10px] font-bold text-zinc-400 mb-1 ml-1">
                          {msg.sender.fullName}
                        </span>
                      )}

                      {/* Reply-to indicator details */}
                      {msg.replyTo && (
                        <div className={`px-2.5 py-1 text-[10px] rounded-t-lg border-l-2 bg-zinc-900/30 flex items-center gap-1.5 opacity-80 ${
                          theme === 'dark' ? 'border-pulse-500 text-zinc-400' : 'border-pulse-600 text-zinc-500'
                        }`}>
                          <CornerUpLeft className="w-3 h-3 flex-shrink-0" />
                          <span className="font-bold truncate max-w-[80px]">
                            {msg.replyTo.sender.fullName}
                          </span>
                          <span className="truncate">{msg.replyTo.content}</span>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div className={`p-3.5 relative overflow-hidden transition-all duration-200 ${
                        msg.replyTo ? 'rounded-b-2xl' : 'rounded-2xl'
                      } ${
                        isMe
                          ? 'bg-pulse-500 text-white rounded-tr-none'
                          : theme === 'dark'
                            ? 'bg-zinc-900/60 text-zinc-100 rounded-tl-none border border-white/5'
                            : 'bg-zinc-100/80 text-zinc-800 rounded-tl-none border border-black/5'
                      }`}>
                        {/* If file share is an image */}
                        {msg.fileUrl && msg.fileType?.startsWith('image/') ? (
                          <div className="mb-2 rounded-lg overflow-hidden border border-white/10 max-w-sm">
                            <a href={`http://localhost:5000${msg.fileUrl}`} target="_blank" rel="noreferrer">
                              <img
                                src={`http://localhost:5000${msg.fileUrl}`}
                                alt="Shared image"
                                className="w-full h-auto object-cover max-h-56 hover:opacity-90 transition-opacity"
                              />
                            </a>
                          </div>
                        ) : msg.fileUrl && msg.fileType?.startsWith('audio/') ? (
                          /* Custom audio voice player component */
                          <CustomAudioPlayer fileUrl={msg.fileUrl} isMe={isMe} />
                        ) : msg.fileUrl ? (
                          /* Standard file download cell */
                          <a
                            href={`http://localhost:5000${msg.fileUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex items-center gap-2 p-2 mb-2 rounded-lg border text-xs font-semibold ${
                              isMe
                                ? 'bg-pulse-600/40 border-pulse-400/20 hover:bg-pulse-600/60 text-white'
                                : 'bg-zinc-950/20 border-white/5 hover:bg-zinc-950/40 text-zinc-200'
                            }`}
                          >
                            <File className="w-4 h-4 flex-shrink-0 text-pulse-400" />
                            <span className="truncate max-w-[150px]">{msg.fileName}</span>
                          </a>
                        ) : null}

                        {/* Message body */}
                        <p className="text-xs leading-relaxed break-words">{msg.content}</p>

                        {/* Timestamp & Status info */}
                        <div className={`flex items-center justify-end gap-1 text-[9px] mt-1.5 opacity-60`}>
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.isEdited && <span>(edited)</span>}
                          {isMe && (
                            <CheckCheck className={`w-3.5 h-3.5 ${
                              msg.reads.length > 1 ? 'text-cyan-400' : ''
                            }`} />
                          )}
                        </div>
                      </div>

                      {/* Display active Reactions below bubble */}
                      {msg.reactions.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {Array.from(new Set(msg.reactions.map((r) => r.emoji))).map((emoji) => {
                            const count = msg.reactions.filter((r) => r.emoji === emoji).length;
                            const hasReacted = msg.reactions.some((r) => r.userId === user?.id && r.emoji === emoji);

                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReactionToggle(msg.id, emoji)}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                  hasReacted
                                    ? 'bg-pulse-500/20 border-pulse-500/40 text-pulse-400'
                                    : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:border-zinc-700'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span>{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Popover Action hover buttons: reply, edit, delete, react */}
                    {!msg.isDeleted && (
                      <div className={`absolute -top-3.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl ${
                        isMe ? 'right-2' : 'left-10'
                      }`}>
                        {/* Reaction Emojis shortcuts */}
                        <div className="flex gap-1 pr-1 border-r border-zinc-800">
                          {EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReactionToggle(msg.id, emoji)}
                              className="hover:scale-125 transition-transform text-xs cursor-pointer px-0.5"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>

                        {/* Reply trigger */}
                        <button
                          onClick={() => setReplyMessage(msg)}
                          className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded cursor-pointer"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit trigger */}
                        {isMe && (
                          <button
                            onClick={() => {
                              setEditingMessage(msg);
                              setInputText(msg.content);
                            }}
                            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete trigger */}
                        {isMe && (
                          <button
                            onClick={() => handleDeleteMessage(msg)}
                            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-center select-none">
            <Sparkles className="w-12 h-12 text-pulse-400/40 mb-3 animate-pulse" />
            <h4 className="text-sm font-bold font-outfit">Pulse Workspace Encrypted</h4>
            <p className="text-xs text-zinc-500 max-w-[200px] mt-1">
              Start exchanging real-time conversations. Sockets are open.
            </p>
          </div>
        )}

        {/* Real-time Typing animation dots */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 pl-10 text-[10px] text-zinc-400 select-none">
            <span className="font-semibold">{typingUsers.map((u) => u.username).join(', ')}</span>
            <span>typing</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-pulse-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-pulse-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-pulse-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply status bar */}
      {replyMessage && (
        <div className={`p-2.5 px-4 flex items-center justify-between border-t border-b bg-pulse-500/5 ${
          theme === 'dark' ? 'border-white/5 text-zinc-300' : 'border-black/5 text-zinc-700'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <CornerUpLeft className="w-4 h-4 text-pulse-400 flex-shrink-0" />
            <div className="text-[10px] min-w-0">
              <span className="font-bold">Replying to {replyMessage.sender.fullName}</span>
              <p className="truncate opacity-75">{replyMessage.content}</p>
            </div>
          </div>
          <button
            onClick={() => setReplyMessage(null)}
            className="p-1 hover:bg-white/10 rounded-full cursor-pointer text-zinc-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Edit status bar */}
      {editingMessage && (
        <div className={`p-2.5 px-4 flex items-center justify-between border-t border-b bg-pulse-500/5 ${
          theme === 'dark' ? 'border-white/5 text-zinc-300' : 'border-black/5 text-zinc-700'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <Edit2 className="w-4 h-4 text-pulse-400 flex-shrink-0" />
            <div className="text-[10px] min-w-0">
              <span className="font-bold">Editing message</span>
              <p className="truncate opacity-75">{editingMessage.content}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setInputText('');
            }}
            className="p-1 hover:bg-white/10 rounded-full cursor-pointer text-zinc-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input bar */}
      <form
        onSubmit={handleSendMessage}
        className={`p-4 flex items-center gap-2.5 border-t ${
          theme === 'dark' ? 'border-white/5' : 'border-black/5'
        }`}
      >
        {/* Clip attachment */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
            theme === 'dark' ? 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500'
          }`}
        >
          <Paperclip className="w-4.5 h-4.5" />
        </button>

        {/* Text Input */}
        <input
          type="text"
          placeholder={isRecording ? 'Recording voice note...' : 'Type a secure message...'}
          value={inputText}
          onChange={handleInputChange}
          disabled={isRecording}
          className={`flex-1 px-4 py-2.5 text-xs ${
            theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
          }`}
        />

        {/* Microphone voice recorder button */}
        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="p-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white transition-colors cursor-pointer flex items-center gap-2 pr-3.5 shadow-lg shadow-rose-500/20"
          >
            <MicOff className="w-4.5 h-4.5 animate-pulse" />
            <span className="text-[10px] font-bold">{formatRecordTime(recordingSeconds)}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
              theme === 'dark' ? 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500'
            }`}
          >
            <Mic className="w-4.5 h-4.5" />
          </button>
        )}

        {/* Send Button */}
        <button
          type="submit"
          className="p-2.5 rounded-xl bg-pulse-500 hover:bg-pulse-600 text-white transition-colors cursor-pointer shadow-lg shadow-pulse-500/20"
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>
    </div>
  );
};

/* Custom Audio Player with Speed Control and waveform animations */
interface CustomAudioPlayerProps {
  fileUrl: string;
  isMe: boolean;
}

const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({ fileUrl, isMe }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSpeedToggle = () => {
    if (!audioRef.current) return;
    let nextSpeed = 1;
    if (playbackSpeed === 1) nextSpeed = 1.5;
    else if (playbackSpeed === 1.5) nextSpeed = 2;
    else nextSpeed = 1;

    audioRef.current.playbackRate = nextSpeed;
    setPlaybackSpeed(nextSpeed);
  };

  const formatAudioTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs font-medium w-64 ${
      isMe
        ? 'bg-pulse-600/40 border-pulse-400/20 text-white'
        : 'bg-zinc-950/20 border-white/5 text-zinc-200'
    }`}>
      <audio
        ref={audioRef}
        src={`http://localhost:5000${fileUrl}`}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-pulse-500 hover:bg-pulse-600 flex items-center justify-center text-white cursor-pointer shadow flex-shrink-0"
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white pl-0.5" />}
      </button>

      {/* soundwave graphics and timer */}
      <div className="flex-1 min-w-0">
        <div className="flex items-end gap-0.5 h-6 mb-1">
          {[...Array(14)].map((_, i) => (
            <span
              key={i}
              className={`w-0.75 bg-pulse-400 rounded-full origin-bottom transition-all duration-300 ${
                isPlaying ? 'wave-bar' : ''
              }`}
              style={{
                height: `${Math.max(20, Math.sin(i * 0.5) * 80)}%`,
                animationDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-[8px] opacity-60">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(duration || 0)}</span>
        </div>
      </div>

      {/* Playback speed toggle */}
      <button
        type="button"
        onClick={handleSpeedToggle}
        className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-colors cursor-pointer ${
          isMe
            ? 'bg-pulse-600/30 border-pulse-400/30 text-white hover:bg-pulse-600/50'
            : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:bg-zinc-800'
        }`}
      >
        {playbackSpeed}x
      </button>
    </div>
  );
};
