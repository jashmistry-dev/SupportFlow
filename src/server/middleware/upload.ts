import multer from 'multer';
import path from 'path';
import { Request } from 'express';

const ALLOWED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov']);

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const memoryStorage = multer.memoryStorage();

export const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max overall ceiling
    files: 5,
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isImageExt = ALLOWED_IMAGE_EXTS.has(ext);
    const isVideoExt = ALLOWED_VIDEO_EXTS.has(ext);

    if (!isImageExt && !isVideoExt) {
      return cb(
        new Error(
          `Unsupported file type: ${ext || 'unknown'}. Allowed images: JPG, PNG, WEBP. Allowed videos: MP4, WEBM, MOV.`
        )
      );
    }

    if (!ALLOWED_MIMES.has(file.mimetype)) {
      return cb(
        new Error(
          `Invalid file MIME type: ${file.mimetype}. Expected an authorized image or video format.`
        )
      );
    }

    cb(null, true);
  },
});
