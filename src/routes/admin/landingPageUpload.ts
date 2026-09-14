import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../lib/guard.js';
import { AppError } from '../../types/api.js';
import { getStorage } from '../../lib/storage.js';
import { rateLimitRegistry } from '../../lib/rateLimit.js';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024;

const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

function sniffMime(buffer: Buffer): string | null {
  for (const [mime, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const sig of signatures) {
      if (buffer.length >= sig.length && sig.every((byte, i) => buffer[i] === byte)) {
        if (mime === 'image/webp') {
          if (buffer.length >= 12 && buffer.toString('ascii', 8, 12) === 'WEBP') return mime;
          continue;
        }
        return mime;
      }
    }
  }
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      cb(new AppError('BAD_REQUEST', 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.post(
  '/',
  rateLimitRegistry.upload,
  upload.single('file'),
  async (req, res, next) => {
    try {
      await requireAuth(req, 'admin');

      if (!req.file) {
        throw new AppError('BAD_REQUEST', 'No file uploaded');
      }

      const detectedMime = sniffMime(req.file.buffer);
      if (!detectedMime) {
        throw new AppError('BAD_REQUEST', 'File content does not match allowed image types');
      }

      if (req.file.size > MAX_SIZE) {
        throw new AppError('PAYLOAD_TOO_LARGE', 'File exceeds 2 MB limit');
      }

      const storage = getStorage();
      const ext = req.file.mimetype === 'image/jpeg' ? '.jpg' : `.${req.file.mimetype.split('/')[1]}`;
      const filename = req.file.originalname || `upload${ext}`;
      const storedPath = await storage.put(filename, req.file.buffer, detectedMime);
      const publicUrl = storage.publicUrl(storedPath);

      res.status(201).json({ url: publicUrl });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
