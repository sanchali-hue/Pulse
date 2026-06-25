import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.pinnedConversation.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.messageRead.deleteMany();
  await prisma.message.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.user.deleteMany();

  // Create demo users
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    {
      email: 'alice@pulse.app',
      username: 'alice',
      fullName: 'Alice Vance',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      bio: 'Lead Interface Designer at Pulse. Obsessed with micro-interactions, clean grids, and custom typography.',
      status: 'Active',
      isOnboarded: true,
    },
    {
      email: 'bob@pulse.app',
      username: 'bob',
      fullName: 'Bob Chen',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      bio: 'Systems Architect & Audio Engineer. Building fast, scalable, real-time message backends.',
      status: 'Active',
      isOnboarded: true,
    },
    {
      email: 'charlie@pulse.app',
      username: 'charlie',
      fullName: 'Charlie Davis',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      bio: 'Product Strategist. Finding beauty in simplicity and elegance.',
      status: 'Away',
      isOnboarded: true,
    },
    {
      email: 'diana@pulse.app',
      username: 'diana',
      fullName: 'Diana Prince',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      bio: 'Visual Creator & Photographer. Capturing moments, light, and pixels.',
      status: 'Do Not Disturb',
      isOnboarded: true,
    },
  ];

  const dbUsers = [];
  for (const u of users) {
    const user = await prisma.user.create({ data: u });
    dbUsers.push(user);
    console.log(`Created user: ${user.fullName}`);
  }

  const [alice, bob, charlie, diana] = dbUsers;

  // Create One-to-One DMs
  // DM between Alice and Bob
  const conversationAB = await prisma.conversation.create({
    data: {
      isGroup: false,
    },
  });

  await prisma.participant.createMany({
    data: [
      { userId: alice.id, conversationId: conversationAB.id },
      { userId: bob.id, conversationId: conversationAB.id },
    ],
  });

  // Add messages for Alice & Bob
  const messagesAB = [
    { senderId: alice.id, content: 'Hey Bob, did you review the new designs for the Pulse floating layout?' },
    { senderId: bob.id, content: 'Hey! Yes, just saw them. The glassmorphism and the left dock feel incredibly premium. Love the spring physics on the sidebar expansion.' },
    { senderId: alice.id, content: 'Awesome! Did you run the performance audit on the message list rendering?' },
    { senderId: bob.id, content: 'Working on it. Socket events are processing under 5ms, and the list component is fully memoized now, so it feels like butter.' },
  ];

  for (const m of messagesAB) {
    await prisma.message.create({
      data: {
        conversationId: conversationAB.id,
        senderId: m.senderId,
        content: m.content,
      },
    });
  }

  // DM between Alice and Charlie
  const conversationAC = await prisma.conversation.create({
    data: {
      isGroup: false,
    },
  });

  await prisma.participant.createMany({
    data: [
      { userId: alice.id, conversationId: conversationAC.id },
      { userId: charlie.id, conversationId: conversationAC.id },
    ],
  });

  await prisma.message.create({
    data: {
      conversationId: conversationAC.id,
      senderId: charlie.id,
      content: 'Morning Alice! Are we still presenting the prototype to the product team at 2 PM?',
    },
  });

  // Create a Group Chat (Pulse Design Studio)
  const groupChat = await prisma.conversation.create({
    data: {
      name: 'Pulse Design Studio',
      isGroup: true,
      avatarUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=150&q=80',
    },
  });

  await prisma.participant.createMany({
    data: [
      { userId: alice.id, conversationId: groupChat.id },
      { userId: bob.id, conversationId: groupChat.id },
      { userId: charlie.id, conversationId: groupChat.id },
      { userId: diana.id, conversationId: groupChat.id },
    ],
  });

  const messagesGroup = [
    { senderId: alice.id, content: 'Welcome everyone to the #Pulse-Design-Studio channel! Let\'s use this channel to discuss layout feedback, spacing ratios, and animations.' },
    { senderId: diana.id, content: 'Thanks Alice! Excited to be here. I just uploaded some new color palette options. Check them out!' },
    { senderId: charlie.id, content: 'The dark slate and violet highlights look great. Let\'s make sure we stick to minimal layout cards. No excessive gradients.' },
  ];

  for (const m of messagesGroup) {
    await prisma.message.create({
      data: {
        conversationId: groupChat.id,
        senderId: m.senderId,
        content: m.content,
      },
    });
  }

  // Pin Alice & Bob conversation for Alice
  await prisma.pinnedConversation.create({
    data: {
      userId: alice.id,
      conversationId: conversationAB.id,
    },
  });

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
