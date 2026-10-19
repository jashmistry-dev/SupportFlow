import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

function getOrGenerateAdminSetupKey(): string {
  if (process.env.ADMIN_SETUP_KEY && process.env.ADMIN_SETUP_KEY.trim()) {
    return process.env.ADMIN_SETUP_KEY.trim();
  }
  const keyFilePath = path.resolve(process.cwd(), '.admin-setup-key');
  try {
    if (fs.existsSync(keyFilePath)) {
      const existing = fs.readFileSync(keyFilePath, 'utf-8').trim();
      if (existing) return existing;
    }
  } catch {
    // ignore read error
  }

  // Generate a cryptographically secure 32-character hexadecimal setup token
  const generatedKey = crypto.randomBytes(16).toString('hex');
  try {
    fs.writeFileSync(keyFilePath, generatedKey, { encoding: 'utf-8', mode: 0o600 });
  } catch {
    // fallback if write fails
  }
  return generatedKey;
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'supportflow-jwt-super-secret-key-38482048',
  get adminSetupKey(): string {
    return getOrGenerateAdminSetupKey();
  },
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  uploadDir: path.resolve(process.cwd(), 'uploads'),
  maxImageSize: 5 * 1024 * 1024, // 5MB
  maxVideoSize: 25 * 1024 * 1024, // 25MB
  allowedImageMimes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedVideoMimes: ['video/mp4', 'video/webm', 'video/quicktime'],
};
