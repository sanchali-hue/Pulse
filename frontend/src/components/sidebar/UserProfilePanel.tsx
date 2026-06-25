import type { Message, User } from '../../types';
import { motion } from 'framer-motion';
import { X, FileText, Image as ImageIcon, Sparkles, Folder, MessageSquare } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface UserProfilePanelProps {
  userProfile: User;
  conversationMessages: Message[];
  onClose: () => void;
}

export const UserProfilePanel: React.FC<UserProfilePanelProps> = ({
  userProfile,
  conversationMessages,
  onClose,
}) => {
  const { theme } = useTheme();

  // Filter messages for shared media (images) and shared files
  const sharedMedia = conversationMessages.filter(
    (msg) => msg.fileUrl && msg.fileType?.startsWith('image/')
  );

  const sharedFiles = conversationMessages.filter(
    (msg) => msg.fileUrl && !msg.fileType?.startsWith('image/')
  );

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-500';
      case 'Away':
        return 'bg-amber-500';
      case 'Do Not Disturb':
        return 'bg-rose-500';
      default:
        return 'bg-zinc-500';
    }
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className={`w-80 h-full flex flex-col rounded-2xl ${
        theme === 'dark' ? 'glass-panel-dark text-white border-l border-white/5' : 'glass-panel-light text-zinc-900 border-l border-black/5'
      } shadow-2xl relative z-20 overflow-hidden p-6`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-bold font-outfit text-zinc-400 uppercase tracking-widest">
          Profile Details
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main details body */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1">
        {/* User Card */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3">
            <img
              src={userProfile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${userProfile.fullName}`}
              alt={userProfile.fullName}
              className="w-24 h-24 rounded-3xl object-cover border border-white/10 shadow-lg"
            />
            <span className={`absolute -bottom-1 -right-1 w-5 h-5 border-4 ${
              theme === 'dark' ? 'border-zinc-950' : 'border-white'
            } rounded-full ${getStatusColor(userProfile.status)}`} />
          </div>

          <h4 className="text-lg font-bold font-outfit">{userProfile.fullName}</h4>
          <span className="text-xs text-zinc-500 font-medium">@{userProfile.username}</span>
          
          <div className="mt-2.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-pulse-500/10 text-pulse-400 border border-pulse-500/20">
            {userProfile.status}
          </div>
        </div>

        {/* Bio Section */}
        <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-zinc-900/40' : 'bg-zinc-100/50'}`}>
          <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pulse-400" />
            <span>Biography</span>
          </h5>
          <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
            {userProfile.bio || "No biography provided yet."}
          </p>
        </div>

        {/* Shared Media Grid */}
        <div>
          <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-pulse-400" />
            <span>Shared Media ({sharedMedia.length})</span>
          </h5>
          {sharedMedia.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {sharedMedia.slice(0, 6).map((msg) => (
                <a
                  key={msg.id}
                  href={`http://localhost:5000${msg.fileUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square rounded-lg overflow-hidden border border-white/5 bg-zinc-950/20 hover:scale-105 transition-transform duration-200"
                >
                  <img
                    src={`http://localhost:5000${msg.fileUrl}`}
                    alt="shared asset"
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-zinc-500 italic">No media shared in this chat</p>
          )}
        </div>

        {/* Shared Files Section */}
        <div>
          <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-pulse-400" />
            <span>Shared Documents ({sharedFiles.length})</span>
          </h5>
          {sharedFiles.length > 0 ? (
            <div className="space-y-2">
              {sharedFiles.slice(0, 4).map((msg) => (
                <a
                  key={msg.id}
                  href={`http://localhost:5000${msg.fileUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center gap-2.5 p-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'border-white/5 bg-zinc-900/30 hover:bg-zinc-900/60 text-zinc-200'
                      : 'border-black/5 bg-zinc-50 hover:bg-zinc-100 text-zinc-800'
                  }`}
                >
                  <FileText className="w-4 h-4 text-pulse-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold truncate">{msg.fileName}</p>
                    <span className="text-[8px] text-zinc-500">{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-zinc-500 italic">No documents shared in this chat</p>
          )}
        </div>

        {/* Mutual Groups (Mocked) */}
        <div>
          <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-pulse-400" />
            <span>Mutual Channels</span>
          </h5>
          <div className="space-y-2">
            <div className={`flex items-center gap-2.5 p-2 rounded-lg border ${
              theme === 'dark' ? 'border-white/5 bg-zinc-900/20' : 'border-black/5 bg-zinc-50'
            }`}>
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-pulse-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                PD
              </div>
              <div>
                <h6 className="text-[10px] font-bold">Pulse Design Studio</h6>
                <span className="text-[8px] text-zinc-500">4 members</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
