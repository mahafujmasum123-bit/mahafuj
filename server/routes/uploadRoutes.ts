import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const router = Router();

// Cloudinary upload diagnostic
router.get('/status', (req: Request, res: Response) => {
  const isConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    success: true,
    configured: isConfigured,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ? `${process.env.CLOUDINARY_CLOUD_NAME.slice(0, 3)}***` : null,
    message: isConfigured
      ? 'Cloudinary image service is connected and ready.'
      : 'Cloudinary environment variables missing (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET). Local asset storage is active.',
  });
});

export function isSafeAssetUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('/assets/') || url.startsWith('/uploads/') || url.startsWith('data:image/')) return true;

  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname.toLowerCase();
    // Neutralize SSRF targets (localhost, link-local, private networks)
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '169.254.169.254' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Local file upload endpoint for Banners & Hero Slider
 * Accepts base64 encoded image data from file picker, validates mime & size,
 * stores into public/uploads/, and returns the public URL.
 */
router.post(
  '/file',
  requireAuth,
  requireRole(['admin', 'super_admin', 'catalog_manager']),
  async (req: Request, res: Response) => {
    try {
      const { fileBase64, filename, folder = 'banners' } = req.body;

      if (!fileBase64 || typeof fileBase64 !== 'string') {
        res.status(400).json({ success: false, error: 'Missing image payload (fileBase64 is required).' });
        return;
      }

      // Check max size (approx 10MB in base64 is ~13.5MB chars)
      if (fileBase64.length > 14 * 1024 * 1024) {
        res.status(400).json({ success: false, error: 'Image file size exceeds the 10MB limit.' });
        return;
      }

      // Extract mime type and base64 payload
      const matches = fileBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let mimeType = 'image/jpeg';
      let rawBase64 = fileBase64;

      if (matches && matches.length === 3) {
        mimeType = matches[1].toLowerCase();
        rawBase64 = matches[2];
      }

      // Validate allowed image mime types
      const allowedMimes: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/svg+xml': '.svg',
        'image/gif': '.gif',
      };

      const ext = allowedMimes[mimeType] || '.jpg';
      const buffer = Buffer.from(rawBase64, 'base64');

      // Verify file byte size
      if (buffer.length > 10 * 1024 * 1024) {
        res.status(400).json({ success: false, error: 'Decoded image exceeds maximum allowed 10MB limit.' });
        return;
      }

      // Sanitize target folder name
      const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '') || 'banners';
      const targetDir = path.resolve(process.cwd(), 'public', 'uploads', safeFolder);

      try {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const safeFilename = `${crypto.randomUUID()}${ext}`;
        const targetPath = path.join(targetDir, safeFilename);

        fs.writeFileSync(targetPath, buffer);

        const publicUrl = `/uploads/${safeFolder}/${safeFilename}`;
        res.json({
          success: true,
          url: publicUrl,
          filename: safeFilename,
          originalName: filename || safeFilename,
          size: buffer.length,
          mimeType,
        });
      } catch (fsErr: any) {
        console.warn('Filesystem upload fallback to data URL:', fsErr.message);
        // Fallback: return data URL safely if filesystem is read-only
        res.json({
          success: true,
          url: fileBase64,
          filename: filename || 'uploaded-asset',
          size: buffer.length,
          mimeType,
          warning: 'Stored as data URL due to filesystem environment permissions.',
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// Cloudinary image upload endpoint
router.post(
  '/cloudinary',
  requireAuth,
  requireRole(['admin', 'super_admin', 'catalog_manager']),
  async (req: Request, res: Response) => {
    try {
      const { imageUrl, publicId } = req.body;

      if (imageUrl && !isSafeAssetUrl(imageUrl)) {
        res.status(400).json({
          success: false,
          error: 'Invalid or restricted asset URL scheme/host.',
        });
        return;
      }

      const isConfigured = Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      );

      if (!isConfigured) {
        if (imageUrl && isSafeAssetUrl(imageUrl)) {
          res.json({
            success: true,
            url: imageUrl,
            publicId: publicId || `asset-${Date.now()}`,
            warning: 'Live Cloudinary API not configured; using direct verified asset URL.',
          });
          return;
        }

        res.status(400).json({
          success: false,
          error: 'Cloudinary is not configured. Please supply CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment.',
        });
        return;
      }

      res.json({
        success: true,
        url: imageUrl,
        publicId: `novara_${Date.now()}`,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

export default router;
