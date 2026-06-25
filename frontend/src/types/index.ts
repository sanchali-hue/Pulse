export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  status: 'Active' | 'Away' | 'Do Not Disturb' | 'Offline';
  isOnboarded: boolean;
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  user?: {
    id: string;
    fullName: string;
    username: string;
  };
}

export interface MessageRead {
  userId: string;
  readAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isSystem: boolean;
  replyToId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
  replyTo?: {
    id: string;
    content: string;
    sender: {
      id: string;
      fullName: string;
    };
  } | null;
  reactions: Reaction[];
  reads: MessageRead[];
}

export interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  unreadCount: number;
  lastMessage: {
    id?: string;
    content: string;
    isSystem?: boolean;
    fileUrl?: string | null;
    fileName?: string | null;
    fileType?: string | null;
    createdAt: string;
  } | null;
  participants: User[];
}
