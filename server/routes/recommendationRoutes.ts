import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  recordUserInteraction,
  getPersonalizedRecommendations,
  InteractionEventType,
} from '../models/UserInteraction';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bangladesh_ecom_secret_jwt_key_2026';

function extractUserAndSession(req: Request): { userId?: string; sessionId?: string } {
  let userId: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && (decoded.id || decoded.userId)) {
        userId = decoded.id || decoded.userId;
      }
    } catch {
      // Ignored for guest tracking
    }
  }

  const sessionId =
    (req.headers['x-session-id'] as string) ||
    (req.headers['x-device-id'] as string) ||
    req.ip ||
    'anonymous-session';

  return { userId, sessionId };
}

/**
 * POST /api/recommendations/track
 * Records user interactions (product views, searches, category visits, completed orders)
 */
router.post('/track', async (req: Request, res: Response) => {
  try {
    const { eventType, productId, category, searchQuery, metadata } = req.body;

    const allowedEvents: InteractionEventType[] = [
      'product_view',
      'search',
      'search_click',
      'category_view',
      'order_complete',
    ];

    if (!eventType || !allowedEvents.includes(eventType)) {
      res.status(400).json({ success: false, error: 'Valid eventType is required' });
      return;
    }

    const { userId, sessionId } = extractUserAndSession(req);

    await recordUserInteraction({
      userId,
      sessionId,
      eventType,
      productId,
      category,
      searchQuery,
      metadata,
    });

    res.json({ success: true, message: 'Interaction tracked successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/recommendations/personalized
 * Returns scored products based on past searches, views, order history, and category affinity
 */
router.get('/personalized', async (req: Request, res: Response) => {
  try {
    const { currentProductId, currentCategory, limit } = req.query;
    const { userId, sessionId } = extractUserAndSession(req);

    const parsedLimit = Math.min(24, Math.max(1, parseInt(limit as string, 10) || 8));

    const recommendations = await getPersonalizedRecommendations({
      userId,
      sessionId,
      currentProductId: currentProductId as string,
      currentCategory: currentCategory as string,
      limit: parsedLimit,
    });

    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
