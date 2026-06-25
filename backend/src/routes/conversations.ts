import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/conversations - Get all conversations for current user
router.get('/', authMiddleware as any, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.userId;
    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find all conversations where the user is a participant
    const participants = await prisma.participant.findMany({
      where: { userId: currentUserId },
      select: { conversationId: true },
    });

    const conversationIds = participants.map((p) => p.conversationId);

    const conversations = await prisma.conversation.findMany({
      where: { id: { in: conversationIds } },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatarUrl: true,
                status: true,
                bio: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            reads: true,
          },
        },
        pinnedBy: {
          where: { userId: currentUserId },
        },
      },
    });

    // Format the response and calculate unread counts
    const formattedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const isPinned = conv.pinnedBy.length > 0;
        const lastMessage = conv.messages[0] || null;

        // Calculate unread count for current user
        let unreadCount = 0;
        if (lastMessage) {
          unreadCount = await prisma.message.count({
            where: {
              conversationId: conv.id,
              senderId: { not: currentUserId },
              reads: {
                none: { userId: currentUserId },
              },
            },
          });
        }

        return {
          id: conv.id,
          name: conv.name,
          isGroup: conv.isGroup,
          avatarUrl: conv.avatarUrl,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          isPinned,
          unreadCount,
          lastMessage,
          participants: conv.participants.map((p) => p.user),
        };
      })
    );

    // Sort: pinned first, then by last message timestamp (or creation timestamp)
    formattedConversations.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    return res.json(formattedConversations);
  } catch (error) {
    console.error('Fetch conversations error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/conversations - Create a DM or a group conversation
router.post('/', authMiddleware as any, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.userId;
    const { participantIds, isGroup, name, avatarUrl } = req.body; // participantIds does NOT include current user for DM, but might for groups. Let's make it standard: includes the other users.

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ error: 'Participants are required' });
    }

    const allParticipantIds = Array.from(new Set([currentUserId, ...participantIds]));

    // If it's a DM (one-to-one), check if a DM already exists between these 2 users
    if (!isGroup && allParticipantIds.length === 2) {
      const otherUserId = participantIds[0];

      const existingDM = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          participants: { every: { userId: { in: allParticipantIds } } },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  fullName: true,
                  avatarUrl: true,
                  status: true,
                  bio: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          pinnedBy: {
            where: { userId: currentUserId },
          },
        },
      });

      if (existingDM) {
        return res.json({
          id: existingDM.id,
          name: existingDM.name,
          isGroup: existingDM.isGroup,
          avatarUrl: existingDM.avatarUrl,
          createdAt: existingDM.createdAt,
          updatedAt: existingDM.updatedAt,
          isPinned: existingDM.pinnedBy.length > 0,
          unreadCount: 0,
          lastMessage: existingDM.messages[0] || null,
          participants: existingDM.participants.map((p) => p.user),
        });
      }
    }

    // Create new conversation
    const newConv = await prisma.conversation.create({
      data: {
        isGroup: !!isGroup,
        name: isGroup ? name || 'Unnamed Group' : null,
        avatarUrl: isGroup ? avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${name || 'Group'}` : null,
      },
    });

    // Create participant entries
    const participantData = allParticipantIds.map((userId) => ({
      userId,
      conversationId: newConv.id,
    }));

    await prisma.participant.createMany({
      data: participantData,
    });

    // Fetch conversation details to return
    const conversation = await prisma.conversation.findUnique({
      where: { id: newConv.id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatarUrl: true,
                status: true,
                bio: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return res.status(500).json({ error: 'Failed to create conversation' });
    }

    // Add a system join message if it's a group
    if (isGroup) {
      const creator = await prisma.user.findUnique({ where: { id: currentUserId } });
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: currentUserId,
          content: `${creator?.fullName || 'Someone'} created the group "${name || 'Unnamed Group'}"`,
          isSystem: true,
        },
      });
    }

    return res.status(201).json({
      id: conversation.id,
      name: conversation.name,
      isGroup: conversation.isGroup,
      avatarUrl: conversation.avatarUrl,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      isPinned: false,
      unreadCount: 0,
      lastMessage: isGroup ? { content: `Group created`, isSystem: true, createdAt: new Date() } : null,
      participants: conversation.participants.map((p) => p.user),
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/conversations/:id/pin - Pin conversation
router.post('/:id/pin', authMiddleware as any, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.userId;
    const conversationId = req.params.id;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.pinnedConversation.upsert({
      where: {
        userId_conversationId: {
          userId: currentUserId,
          conversationId,
        },
      },
      create: {
        userId: currentUserId,
        conversationId,
      },
      update: {},
    });

    return res.json({ success: true, pinned: true });
  } catch (error) {
    console.error('Pin error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/conversations/:id/unpin - Unpin conversation
router.post('/:id/unpin', authMiddleware as any, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.userId;
    const conversationId = req.params.id;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.pinnedConversation.delete({
      where: {
        userId_conversationId: {
          userId: currentUserId,
          conversationId,
        },
      },
    });

    return res.json({ success: true, pinned: false });
  } catch (error) {
    console.error('Unpin error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
