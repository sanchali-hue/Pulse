import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/users - Search users by search query
router.get('/', authMiddleware as any, async (req: AuthRequest, res: Response) => {
  try {
    const search = req.query.search as string;
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const searchFilter = search
      ? {
          OR: [
            { username: { contains: search } },
            { fullName: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where: {
        ...searchFilter,
        id: { not: currentUserId }, // Exclude current user from search
        isOnboarded: true,          // Only display onboarded users
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        status: true,
      },
      take: 20,
    });

    return res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/status - Update user custom status
router.put('/status', authMiddleware as any, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!['Active', 'Away', 'Do Not Disturb', 'Offline'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status type' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: { status },
      select: {
        id: true,
        status: true,
      },
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/profile - Update full profile info
router.put('/profile', authMiddleware as any, async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, bio, avatarUrl } = req.body;
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: {
        fullName,
        bio,
        avatarUrl,
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        status: true,
        isOnboarded: true,
      },
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
