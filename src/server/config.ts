import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'supportflow-jwt-super-secret-key-38482048',
  jwtExpiresIn: '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  uploadDir: path.resolve(process.cwd(), 'uploads'),
  maxImageSize: 5 * 1024 * 1024, // 5MB
  maxVideoSize: 25 * 1024 * 1024, // 25MB
  allowedImageMimes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedVideoMimes: ['video/mp4', 'video/webm', 'video/quicktime'],
};
