import mongoose, { Schema, Document } from 'mongoose';
import { SeedProduct } from '../data/initialData';
import { inMemoryProducts } from '../routes/productRoutes';

export type InteractionEventType =
  | 'product_view'
  | 'search'
  | 'search_click'
  | 'category_view'
  | 'order_complete';

export interface IUserInteraction {
  id?: string;
  userId?: string;
  sessionId?: string;
  eventType: InteractionEventType;
  productId?: string;
  category?: string;
  searchQuery?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface UserInteractionDocument extends IUserInteraction, Document {}

const UserInteractionSchema = new Schema<UserInteractionDocument>(
  {
    userId: { type: String, index: true },
    sessionId: { type: String, index: true },
    eventType: {
      type: String,
      required: true,
      enum: ['product_view', 'search', 'search_click', 'category_view', 'order_complete'],
      index: true,
    },
    productId: { type: String, index: true },
    category: { type: String, index: true },
    searchQuery: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index for fast user activity retrieval with time decay
UserInteractionSchema.index({ userId: 1, createdAt: -1 });
UserInteractionSchema.index({ sessionId: 1, createdAt: -1 });

export const UserInteractionModel =
  mongoose.models.UserInteraction ||
  mongoose.model<UserInteractionDocument>('UserInteraction', UserInteractionSchema);

// In-Memory Storage for resilient fallback
export const inMemoryInteractions: IUserInteraction[] = [];

/**
 * Deduplicated interaction recorder
 */
export async function recordUserInteraction(params: {
  userId?: string;
  sessionId?: string;
  eventType: InteractionEventType;
  productId?: string;
  category?: string;
  searchQuery?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const { userId, sessionId, eventType, productId, category, searchQuery, metadata } = params;
  if (!userId && !sessionId) return;

  const now = new Date();
  const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

  // Deduplication check: prevent duplicate views/events within 30s window
  const isDuplicate = inMemoryInteractions.some(
    (i) =>
      (userId ? i.userId === userId : i.sessionId === sessionId) &&
      i.eventType === eventType &&
      i.productId === productId &&
      i.createdAt > thirtySecondsAgo
  );

  if (isDuplicate) return;

  const record: IUserInteraction = {
    id: `ui-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: userId || undefined,
    sessionId: sessionId || undefined,
    eventType,
    productId: productId || undefined,
    category: category || undefined,
    searchQuery: searchQuery?.trim() || undefined,
    metadata,
    createdAt: now,
  };

  inMemoryInteractions.push(record);
  if (inMemoryInteractions.length > 5000) {
    inMemoryInteractions.splice(0, 1000); // Maintain bounded memory footprint
  }

  // Persist to MongoDB if connected
  if (mongoose.connection.readyState === 1) {
    try {
      await UserInteractionModel.create(record);
    } catch {
      // Graceful fallback to memory without failing request
    }
  }
}

/**
 * Computes personalized product recommendations with cold-start fallbacks
 */
export async function getPersonalizedRecommendations(options: {
  userId?: string;
  sessionId?: string;
  currentProductId?: string;
  currentCategory?: string;
  limit?: number;
}): Promise<SeedProduct[]> {
  const { userId, sessionId, currentProductId, currentCategory, limit = 10 } = options;

  let interactions: IUserInteraction[] = [];

  // Query database or fallback to in-memory store
  if (mongoose.connection.readyState === 1 && (userId || sessionId)) {
    try {
      const filter: Record<string, any> = {};
      if (userId) filter.userId = userId;
      else if (sessionId) filter.sessionId = sessionId;

      interactions = await UserInteractionModel.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    } catch {
      interactions = inMemoryInteractions.filter(
        (i) => (userId && i.userId === userId) || (sessionId && i.sessionId === sessionId)
      );
    }
  } else {
    interactions = inMemoryInteractions.filter(
      (i) => (userId && i.userId === userId) || (sessionId && i.sessionId === sessionId)
    );
  }

  // Calculate Category and Keyword Affinity Scores
  const categoryScores: Record<string, number> = {};
  const searchKeywords: string[] = [];

  if (currentCategory) {
    categoryScores[currentCategory.toLowerCase()] = 4;
  }

  const now = Date.now();
  for (const item of interactions) {
    const ageHours = (now - new Date(item.createdAt).getTime()) / (1000 * 60 * 60);
    // Time decay factor: recent interactions have higher weight
    const recencyMultiplier = Math.max(0.2, 1 - ageHours / (24 * 7));

    let baseWeight = 1;
    if (item.eventType === 'order_complete') baseWeight = 6;
    else if (item.eventType === 'search') baseWeight = 3;
    else if (item.eventType === 'search_click') baseWeight = 2.5;
    else if (item.eventType === 'category_view') baseWeight = 2;
    else if (item.eventType === 'product_view') baseWeight = 1;

    const weightedScore = baseWeight * recencyMultiplier;

    if (item.category) {
      const catKey = item.category.toLowerCase();
      categoryScores[catKey] = (categoryScores[catKey] || 0) + weightedScore;
    }

    if (item.searchQuery) {
      searchKeywords.push(item.searchQuery.toLowerCase());
    }
  }

  // Filter eligible active catalog products
  const eligibleProducts = inMemoryProducts.filter((p: SeedProduct) => {
    if (currentProductId && (p.id === currentProductId || p.slug === currentProductId)) {
      return false; // Exclude currently viewed product
    }
    return p.stock > 0; // Exclude out of stock
  });

  // Score each eligible product
  const scoredProducts: Array<{ product: SeedProduct; score: number }> = eligibleProducts.map((product: SeedProduct) => {
    let score = 0;
    const catLower = product.category.toLowerCase();

    // Category affinity
    if (categoryScores[catLower]) {
      score += categoryScores[catLower] * 3;
    }

    // Search query relevance
    for (const kw of searchKeywords) {
      if (
        product.name.toLowerCase().includes(kw) ||
        product.description?.toLowerCase().includes(kw)
      ) {
        score += 2;
      }
    }

    // Popularity / Rating baseline
    score += (product.ratingAverage || 4.5) * 0.5;
    if (product.badge === 'Hot' || product.badge === 'Best Seller') {
      score += 1.5;
    }

    return { product, score };
  });

  // Sort descending by relevance score
  scoredProducts.sort((a: { product: SeedProduct; score: number }, b: { product: SeedProduct; score: number }) => b.score - a.score);

  const recommended: SeedProduct[] = scoredProducts.slice(0, limit).map((sp: { product: SeedProduct; score: number }) => sp.product);

  // Cold-Start Fallback: If no history exists, return top-rated / trending items
  if (recommended.length < limit) {
    const fallbackItems = eligibleProducts
      .filter((p: SeedProduct) => !recommended.some((r: SeedProduct) => r.id === p.id))
      .sort((a: SeedProduct, b: SeedProduct) => (b.ratingAverage || 4.5) - (a.ratingAverage || 4.5))
      .slice(0, limit - recommended.length);

    recommended.push(...fallbackItems);
  }

  return recommended.slice(0, limit);
}
