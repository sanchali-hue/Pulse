import { Router, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pulse-jwt-secret-key-12345';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, fullName } = req.body;

    if (!email || !password || !username || !fullName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        username,
        fullName,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`, // Default avatar generator
        bio: 'Hello! I am new to Pulse.',
        status: 'Active',
        isOnboarded: false,
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        status: user.status,
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        status: user.status,
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/google (Mock Google Auth exchange)
router.post('/google', async (req, res) => {
  try {
    const { email, fullName, googleId, imageUrl } = req.body;

    if (!email || !fullName) {
      return res.status(400).json({ error: 'Email and Name are required' });
    }

    // Try finding user by email
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create user if they don't exist
      const mockUsername = email.split('@')[0] + Math.floor(Math.random() * 1000);
      user = await prisma.user.create({
        data: {
          email,
          username: mockUsername,
          fullName,
          avatarUrl: imageUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`,
          bio: 'Authenticated with Google. Welcome!',
          status: 'Active',
          isOnboarded: false, // Force them to onboarding
        },
      });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        status: user.status,
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password (Simulated)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'No user registered with this email address' });
    }

    // Simulated email dispatch
    return res.json({ message: 'A secure password reset link has been dispatched to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/onboard (Protected onboarding)
router.post('/onboard', authMiddleware as any, async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, avatarUrl, bio, status } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName,
        avatarUrl,
        bio,
        status: status || 'Active',
        isOnboarded: true,
      },
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        status: user.status,
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me (Get logged in user profile)
router.get('/me', authMiddleware as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        status: user.status,
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
