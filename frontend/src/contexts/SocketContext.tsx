import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: string[];
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.emit('setup', { userId: user.id });

    newSocket.on('user_status_updated', (data: { userId: string; status: string }) => {
      setOnlineUsers((prev) => {
        if (data.status === 'Offline') {
          return prev.filter((id) => id !== data.userId);
        } else {
          if (!prev.includes(data.userId)) {
            return [...prev, data.userId];
          }
          return prev;
        }
      });
    });

    // Request active list of online users on connection
    newSocket.emit('get_online_users', (users: string[]) => {
      setOnlineUsers(users);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};
