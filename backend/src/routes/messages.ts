import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/messages/:conversationId - Get messages for a conversation
router.get('/:conversationId', authMiddleware as any, async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user is a participant of this conversation
    const isParticipant = await prisma.participant.findUnique({
      where: {
        userId_conversationId: {
          userId: currentUserId,
          conversationId,
        },
      },
    });

    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not a participant of this conversation' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                username: true,
              },
            },
          },
        },
        reads: {
          select: {
            userId: true,
            readAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json(messages);
  } catch (error) {
    console.error('Fetch messages error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages - Send a new message (useful for file uploads and standard REST sending)
router.post('/', authMiddleware as any, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.userId;
    const { conversationId, content, replyToId, fileUrl, fileName, fileType } = req.body;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!conversationId || (!content && !fileUrl)) {
      return res.status(400).json({ error: 'Conversation ID and content or file are required' });
    }

    // Verify participant
    const isParticipant = await prisma.participant.findUnique({
      where: {
        userId_conversationId: {
          userId: currentUserId,
          conversationId,
        },
      },
    });

    if (!isParticipant) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: currentUserId,
        content: content || '',
        replyToId: replyToId || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        reactions: true,
        reads: true,
      },
    });

    // Automatically mark the message as read for the sender
    await prisma.messageRead.create({
      data: {
        messageId: message.id,
        userId: currentUserId,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/messages/:messageId - Edit message
router.put('/:messageId', authMiddleware as any, async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId !== currentUserId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        reactions: true,
        reads: true,
      },
    });

    return res.json(updatedMessage);
  } catch (error) {
    console.error('Edit message error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/messages/:messageId - Soft delete message
router.delete('/:messageId', authMiddleware as any, async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId !== currentUserId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: 'This message was deleted',
        isDeleted: true,
        fileUrl: null,
        fileName: null,
        fileType: null,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        replyTo: true,
        reactions: true,
        reads: true,
      },
    });

    // Delete reactions associated with deleted messages
    await prisma.reaction.deleteMany({
      where: { messageId },
    });

    return res.json(updatedMessage);
  } catch (error) {
    console.error('Delete message error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/:messageId/reaction - Add or remove reaction (Toggle)
router.post('/:messageId/reaction', authMiddleware as any, async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    // Check if reaction already exists
    const existingReaction = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: currentUserId,
          emoji,
        },
      },
    });

    if (existingReaction) {
      // Remove it (toggle off)
      await prisma.reaction.delete({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId: currentUserId,
            emoji,
          },
        },
      });
      return res.json({ messageId, userId: currentUserId, emoji, action: 'removed' });
    } else {
      // Add it
      const newReaction = await prisma.reaction.create({
        data: {
          messageId,
          userId: currentUserId,
          emoji,
        },
      });
      return res.status(201).json({ ...newReaction, action: 'added' });
    }
  } catch (error) {
    console.error('Reaction toggle error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/:messageId/read - Mark message as read
router.post('/:messageId/read', authMiddleware as any, async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messageRead = await prisma.messageRead.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId: currentUserId,
        },
      },
      create: {
        messageId,
        userId: currentUserId,
      },
      update: {},
    });

    return res.json(messageRead);
  } catch (error) {
    console.error('Read receipt error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
