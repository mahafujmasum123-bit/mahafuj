/**
 * NOVARA COMMERCE — User Interaction Tracker
 * Records product views, searches, search clicks, and completed orders for the personalized recommendation engine.
 */

const SESSION_KEY = 'novara_interaction_session_id';

export function getOrCreateInteractionSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return 'fallback-session';
  }
}

// In-memory set to prevent duplicate product view recordings during hot-reloads / re-renders
const recentEvents = new Map<string, number>();

export interface TrackInteractionParams {
  eventType: 'product_view' | 'search' | 'search_click' | 'category_view' | 'order_complete';
  productId?: string;
  category?: string;
  searchQuery?: string;
  metadata?: Record<string, any>;
}

export async function trackUserInteraction(params: TrackInteractionParams): Promise<void> {
  if (typeof window === 'undefined') return;

  const eventKey = `${params.eventType}:${params.productId || ''}:${params.category || ''}:${params.searchQuery || ''}`;
  const now = Date.now();
  const lastTime = recentEvents.get(eventKey);

  // 15-second deduplication window for repeated views
  if (lastTime && now - lastTime < 15000) {
    return;
  }
  recentEvents.set(eventKey, now);

  const sessionId = getOrCreateInteractionSessionId();
  const token = localStorage.getItem('novara_auth_token_v1');

  try {
    fetch('/api/recommendations/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        ...params,
      }),
    }).catch(() => {
      // Non-blocking telemetry
    });
  } catch {
    // Non-blocking
  }
}
