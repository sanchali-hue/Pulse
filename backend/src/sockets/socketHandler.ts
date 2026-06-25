import { Server, Socket } from 'socket.io';

// Track active connections: userId -> Set of socket IDs (to support multiple tabs)
const activeConnections = new Map<string, Set<string>>();

export function setupSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    let currentUserId: string | null = null;

    // Setup user connection mapping
    socket.on('setup', (data: { userId: string }) => {
      const { userId } = data;
      currentUserId = userId;
      socket.join(userId);

      if (!activeConnections.has(userId)) {
        activeConnections.set(userId, new Set());
      }
      activeConnections.get(userId)!.add(socket.id);

      // Broadcast user online status
      io.emit('user_status_updated', { userId, status: 'Active' });
      
      console.log(`Socket setup complete for user: ${userId}, Socket ID: ${socket.id}`);
    });

    // Join a specific conversation room
    socket.on('join_chat', (room: string) => {
      socket.join(room);
      console.log(`Socket ${socket.id} joined conversation room: ${room}`);
    });

    // Leave a specific conversation room
    socket.on('leave_chat', (room: string) => {
      socket.leave(room);
      console.log(`Socket ${socket.id} left conversation room: ${room}`);
    });

    // Handle typing indicators
    socket.on('typing', (data: { room: string; userId: string; username: string }) => {
      socket.to(data.room).emit('typing', data);
    });

    socket.on('stop_typing', (data: { room: string; userId: string }) => {
      socket.to(data.room).emit('stop_typing', data);
    });

    // Broadcast message events
    socket.on('new_message', (data: { message: any; conversationId: string }) => {
      const { conversationId, message } = data;
      // Broadcast to other participants in the room
      socket.to(conversationId).emit('message_received', message);
    });

    // Broadcast message edits
    socket.on('edit_message', (data: { message: any; conversationId: string }) => {
      socket.to(data.conversationId).emit('message_edited', data.message);
    });

    // Broadcast message deletions
    socket.on('delete_message', (data: { message: any; conversationId: string }) => {
      socket.to(data.conversationId).emit('message_deleted', data.message);
    });

    // Broadcast message read receipts
    socket.on('message_read', (data: { messageId: string; conversationId: string; userId: string; readAt: string }) => {
      socket.to(data.conversationId).emit('message_read_receipt', data);
    });

    // Broadcast added reactions
    socket.on('add_reaction', (data: { messageId: string; conversationId: string; reaction: any }) => {
      socket.to(data.conversationId).emit('reaction_added', data);
    });

    // Broadcast removed reactions
    socket.on('remove_reaction', (data: { messageId: string; conversationId: string; userId: string; emoji: string }) => {
      socket.to(data.conversationId).emit('reaction_removed', data);
    });

    // Check user online status query
    socket.on('get_online_users', (callback: (users: string[]) => void) => {
      const onlineUserIds = Array.from(activeConnections.keys());
      callback(onlineUserIds);
    });

    // User explicitly changes status (Active, Away, DND, Offline)
    socket.on('user_status_change', (data: { userId: string; status: string }) => {
      io.emit('user_status_updated', data);
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      if (currentUserId && activeConnections.has(currentUserId)) {
        const sockets = activeConnections.get(currentUserId)!;
        sockets.delete(socket.id);
        
        if (sockets.size === 0) {
          activeConnections.delete(currentUserId);
          // Broadcast user went offline
          io.emit('user_status_updated', { userId: currentUserId, status: 'Offline' });
        }
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
