import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import conversationRoutes from './routes/conversations';
import messageRoutes from './routes/messages';
import uploadRoutes from './routes/uploads';

// Import socket setup
import { setupSockets } from './sockets/socketHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: '*', // Allow connection from any origin (ideal for local testing)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve uploaded files statically
const uploadsPath = path.join(__dirname, '../../../uploads');
app.use('/uploads', express.static(uploadsPath));

// Routes configuration
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/uploads', uploadRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Pulse Real-time Service' });
});

// Configure Socket.io server
const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Bind socket events
setupSockets(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Pulse Backend Server running on port ${PORT} `);
  console.log(` Uploads directory: ${uploadsPath}`);
  console.log(`=========================================`);
});
