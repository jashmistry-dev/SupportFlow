import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import authRoutes from './routes/authRoutes.ts';
import ticketRoutes from './routes/ticketRoutes.ts';
import commentRoutes from './routes/commentRoutes.ts';
import attachmentRoutes from './routes/attachmentRoutes.ts';
import dashboardRoutes from './routes/dashboardRoutes.ts';
import aiRoutes from './routes/aiRoutes.ts';
import userRoutes from './routes/userRoutes.ts';
import { config } from './config.ts';
import { seedDatabase } from '../db/seed.ts';

export const app = express();

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file uploads serving
app.use('/uploads', express.static(config.uploadDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/tickets', commentRoutes);
app.use('/api/tickets', aiRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api', attachmentRoutes); // handles /api/tickets/:id/attachments
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SupportFlow Technical Support API',
  });
});

// Centralized error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('SupportFlow Server Uncaught Error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
});

// Server initialization (no automatic demo seeding)
export async function initializeServer() {
  // Normal startup behavior - no automatic demo/mock data creation
}

