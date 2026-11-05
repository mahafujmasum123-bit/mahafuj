/**
 * NOVARA COMMERCE — Core E-commerce Business Logic & Rules
 * Pure functions decoupled from React & Express for fast, deterministic unit testing.
 */

export interface CartItemInput {
  productId: string;
  variantId?: string;
  variantName?: string;
  sku: string;
  name: string;
  price: number;
  salePrice?: number;
  quantity: number;
  image: string;
  stock: number;
  selected?: boolean;
}

export interface CouponRule {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded';

/**
 * Valid allowed transitions for order lifecycle
 */
export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['returned'],
  returned: ['refunded'],
  cancelled: [],
  refunded: [],
};

/**
 * Validate order state machine transition
 */
export function isValidOrderTransition(current: OrderStatus, next: OrderStatus): boolean {
  if (current === next) return true;
  const allowed = ALLOWED_ORDER_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

/**
 * Calculate effective unit price
 */
export function getEffectivePrice(basePrice: number, salePrice?: number): number {
  if (typeof salePrice === 'number' && salePrice > 0 && salePrice < basePrice) {
    return salePrice;
  }
  return basePrice;
}

export interface ShippingMethod {
  id: 'standard' | 'express' | 'next_day';
  name: string;
  estimatedDays: string;
  baseFee: number;
  isFreeEligible: boolean;
}

export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: 'standard',
    name: 'Standard Delivery (Paperfly / Pathao)',
    estimatedDays: '2-4 business days',
    baseFee: 60,
    isFreeEligible: true,
  },
  {
    id: 'express',
    name: 'Express Delivery (24-48 Hours)',
    estimatedDays: '24-48 hours',
    baseFee: 150,
    isFreeEligible: false,
  },
  {
    id: 'next_day',
    name: 'Priority Next Day Courier',
    estimatedDays: 'Next business day',
    baseFee: 250,
    isFreeEligible: false,
  },
];

export interface ShippingConfigInput {
  freeShippingThreshold?: number;
  insideDhakaFee?: number;
  outsideDhakaFee?: number;
  expressFee?: number;
}

/**
 * Calculate cart line totals in Bangladeshi Taka (BDT)
 */
export function calculateCartTotals(
  items: CartItemInput[],
  coupon?: CouponRule | null,
  division: string = 'Dhaka',
  shippingMethodId: string = 'auto',
  shippingConfig?: ShippingConfigInput
) {
  const lineItemsCount = items.length; // total unique line items
  const activeItems = items.filter((i) => i.selected !== false);
  const selectedItemsCount = activeItems.length;
  const totalQuantity = activeItems.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = activeItems.reduce((sum, item) => {
    const unitPrice = getEffectivePrice(item.price, item.salePrice);
    return sum + unitPrice * item.quantity;
  }, 0);

  // Dynamic Shipping Settings (defaults fallback to 60 / 120 / 2500 BDT)
  const threshold = shippingConfig?.freeShippingThreshold ?? 2500;
  const insideFee = shippingConfig?.insideDhakaFee ?? 60;
  const outsideFee = shippingConfig?.outsideDhakaFee ?? 120;
  const expressFee = shippingConfig?.expressFee ?? 150;

  const isDhakaDivision = /dhaka/i.test(division);
  const isFreeShipping = subtotal >= threshold;

  let shippingFee = 0;
  if (activeItems.length > 0) {
    if (shippingMethodId === 'express') {
      shippingFee = expressFee;
    } else if (shippingMethodId === 'next_day') {
      shippingFee = 250;
    } else if (shippingMethodId === 'standard') {
      shippingFee = isFreeShipping ? 0 : (isDhakaDivision ? insideFee : outsideFee);
    } else {
      // Auto-calculation based on division & threshold
      if (isFreeShipping) {
        shippingFee = 0;
      } else {
        shippingFee = isDhakaDivision ? insideFee : outsideFee;
      }
    }
  }

  let discount = 0;
  let couponError: string | null = null;

  if (coupon && activeItems.length > 0) {
    const now = new Date().toISOString();
    if (!coupon.isActive) {
      couponError = 'Coupon is not active';
    } else if (now < coupon.validFrom || now > coupon.validTo) {
      couponError = 'Coupon has expired or is not yet valid';
    } else if (subtotal < coupon.minOrderAmount) {
      couponError = `Minimum order amount of ৳${coupon.minOrderAmount} required for this coupon`;
    } else {
      if (coupon.discountType === 'percentage') {
        const rawDiscount = (subtotal * coupon.discountValue) / 100;
        discount = coupon.maxDiscount ? Math.min(rawDiscount, coupon.maxDiscount) : rawDiscount;
      } else {
        discount = Math.min(coupon.discountValue, subtotal);
      }
    }
  }

  const finalTotal = Math.max(0, subtotal - discount + shippingFee);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    shippingFee: Math.round(shippingFee * 100) / 100,
    finalTotal: Math.round(finalTotal * 100) / 100,
    lineItemsCount,
    selectedItemsCount,
    totalQuantity,
    couponError,
    isFreeShipping,
    shippingMethodId,
  };
}

/**
 * Merge guest cart into customer cart without duplicates
 */
export function mergeCartLines(
  existingItems: CartItemInput[],
  incomingItems: CartItemInput[]
): CartItemInput[] {
  const merged = [...existingItems];

  for (const inc of incomingItems) {
    const existingIndex = merged.findIndex(
      (m) => m.productId === inc.productId && (m.variantId || '') === (inc.variantId || '')
    );

    if (existingIndex >= 0) {
      // Sum quantity, capped at available stock
      const newQty = Math.min(merged[existingIndex].quantity + inc.quantity, inc.stock);
      merged[existingIndex] = {
        ...merged[existingIndex],
        quantity: Math.max(1, newQty),
        stock: inc.stock, // keep freshest stock
      };
    } else {
      merged.push({
        ...inc,
        quantity: Math.min(inc.quantity, inc.stock),
      });
    }
  }

  return merged;
}

/**
 * Centralized business constant: one Add to Cart click ensures 1 unit by default
 */
export const DEFAULT_ADD_TO_CART_QUANTITY = 1;

/**
 * Navigation Cart Badge: Strict 99+ display limit
 * Presentation-only restriction: actual database/Redux quantities remain unclipped.
 * If totalCartUnits <= 0: null (hidden)
 * If totalCartUnits <= 99: exact number as string
 * If totalCartUnits > 99: exactly "99+"
 */
export function formatCartBadge(totalCartUnits: number): string | null {
  if (!totalCartUnits || isNaN(totalCartUnits) || totalCartUnits <= 0) {
    return null;
  }
  if (totalCartUnits > 99) {
    return '99+';
  }
  return String(Math.floor(totalCartUnits));
}

/**
 * Validate Add to Cart quantity against stock and limits
 * Add to Cart rule: If item does not exist, quantity becomes 1 (or requested).
 * If item already exists, repeated Add to Cart clicks DO NOT increment its quantity.
 */
export interface AddToCartValidationResult {
  valid: boolean;
  actualAdded: number;
  newQuantity: number;
  message?: string;
  isCapped: boolean;
}

export function validateAddToCartQuantity(
  currentQuantity: number = 0,
  requestedIncrement: number = DEFAULT_ADD_TO_CART_QUANTITY,
  availableStock: number = 999,
  maxPurchaseLimit: number = 1000
): AddToCartValidationResult {
  const safeStock = Math.max(0, availableStock);
  const safeCurrent = Math.max(0, currentQuantity);
  const safeIncrement = Math.max(1, requestedIncrement);

  if (safeStock <= 0) {
    return {
      valid: false,
      actualAdded: 0,
      newQuantity: safeCurrent,
      message: 'Product is currently out of stock.',
      isCapped: true,
    };
  }

  // Idempotent Add to Cart rule: If item already exists in the cart, repeated Add to Cart clicks
  // NEVER increment its quantity. The product quantity remains unchanged at its current quantity.
  if (safeCurrent > 0) {
    return {
      valid: true,
      actualAdded: 0,
      newQuantity: safeCurrent,
      message: 'Product is already in your cart.',
      isCapped: false,
    };
  }

  // New item addition: default to 1 (or requested initial quantity), bounded by stock and purchase limits
  const targetQuantity = Math.min(safeIncrement, safeStock, maxPurchaseLimit);
  return {
    valid: targetQuantity > 0,
    actualAdded: targetQuantity,
    newQuantity: targetQuantity,
    isCapped: targetQuantity < safeIncrement,
  };
}

/**
 * Validate manual quantity updates (+ / - controls on Cart Page / PDP)
 */
export function validateQuantityChange(
  currentQuantity: number,
  delta: number,
  availableStock: number = 999
): number {
  const safeStock = Math.max(1, availableStock);
  const target = currentQuantity + delta;
  return Math.min(Math.max(1, target), safeStock);
}

/**
 * Safe Regex escaper to prevent ReDoS (Regular Expression Denial of Service)
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Multilingual search query normalization:
 * - Unicode normalization (NFC)
 * - Removes zero-width joiners / non-joiners
 * - Normalizes Bangla punctuation and diacritics
 * - Lowercases English text
 * - Trims and collapses multiple spaces
 */
export function normalizeMultilingualQuery(rawQuery: string): string {
  if (!rawQuery) return '';
  return rawQuery
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width chars
    .replace(/[।;,!?]/g, ' ') // normalize punctuation
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Bidirectional Bangla <-> English cross-lingual synonym and keyword dictionary
 */
export const CROSS_LINGUAL_SYNONYM_MAP: Record<string, string[]> = {
  // Bangla terms to English & related Bangla variations
  'জুতা': ['জুতো', 'shoes', 'shoe', 'footwear', 'sneakers', 'running shoes', 'boots', 'কেডস'],
  'জুতো': ['জুতা', 'shoes', 'shoe', 'footwear', 'sneakers', 'running shoes', 'boots', 'কেডস'],
  'কেডস': ['জুতা', 'জুতো', 'shoes', 'sneakers', 'running shoes'],
  'শার্ট': ['shirt', 't-shirt', 'tshirt', 'tee', 'টি শার্ট', 'টি-শার্ট', 'apparel', 'fashion'],
  'টি শার্ট': ['t-shirt', 'tshirt', 'shirt', 'tee', 'শার্ট', 'mens t-shirt'],
  'টি-শার্ট': ['t-shirt', 'tshirt', 'shirt', 'tee', 'শার্ট'],
  'মোবাইল': ['mobile', 'smartphone', 'phone', 'cellphone', 'মোবাইল ফোন', 'স্মার্টফোন', 'ফোন'],
  'স্মার্টফোন': ['smartphone', 'mobile', 'phone', 'মোবাইল', 'মোবাইল ফোন'],
  'ফোন': ['phone', 'mobile', 'smartphone', 'মোবাইল'],
  'ঘড়ি': ['ঘড়ি', 'watch', 'smartwatch', 'smart watch', 'fitness tracker', 'স্মার্ট ওয়াচ'],
  'ঘড়ি': ['ঘড়ি', 'watch', 'smartwatch', 'smart watch', 'fitness tracker', 'স্মার্ট ওয়াচ'],
  'স্মার্ট ওয়াচ': ['smartwatch', 'smart watch', 'watch', 'ঘড়ি', 'ঘড়ি'],
  'বই': ['book', 'books', 'literature', 'novel'],
  'হেডফোন': ['headphone', 'headphones', 'earbuds', 'audio', 'soundcore', 'wireless', 'ইয়ারফোন'],
  'ইয়ারফোন': ['earbuds', 'earphone', 'earphones', 'headphones', 'হেডফোন', 'এয়ারবাডস'],
  'ইয়ারফোন': ['earbuds', 'earphone', 'earphones', 'headphones', 'হেডফোন'],
  'এয়ারবাডস': ['earbuds', 'tws', 'wireless earbuds', 'হেডফোন'],
  'ল্যাপটপ': ['laptop', 'computer', 'notebook', 'macbook', 'ultrabook', 'পিসি'],
  'কম্পিউটার': ['computer', 'laptop', 'pc', 'ল্যাপটপ'],
  'ব্যাগ': ['bag', 'backpack', 'leather', 'wallet', 'ব্যাকপ্যাক'],
  'ব্যাকপ্যাক': ['backpack', 'bag', 'commuter backpack', 'ব্যাগ'],
  'মানিব্যাগ': ['wallet', 'leather wallet', 'ব্যাগ', 'cardholder'],
  'সানগ্লাস': ['sunglasses', 'glasses', 'eyewear', 'shades', 'চশমা', 'রোদ চশমা'],
  'চশমা': ['glasses', 'sunglasses', 'eyewear', 'সানগ্লাস'],
  'জ্যাকেট': ['jacket', 'coat', 'winter', 'mens jacket', 'শীতের পোশাক'],
  'স্পিকার': ['speaker', 'bluetooth speaker', 'soundbox', 'অডিও'],
  'গেম': ['game', 'gaming', 'controller', 'joystick', 'console'],
  'স্কিনকেয়ার': ['skincare', 'beauty', 'cream', 'serum', 'lotion', 'সৌন্দর্য'],

  // English terms to Bangla & related English variations
  'shoes': ['জুতা', 'জুতো', 'footwear', 'sneakers', 'running shoes', 'কেডস'],
  'shoe': ['জুতা', 'জুতো', 'footwear', 'shoes', 'sneakers'],
  'footwear': ['জুতা', 'জুতো', 'shoes', 'sneakers'],
  'sneakers': ['জুতা', 'জুতো', 'shoes', 'কেডস'],
  'shirt': ['শার্ট', 'টি শার্ট', 't-shirt', 'tee', 'apparel'],
  't-shirt': ['টি শার্ট', 'টি-শার্ট', 'শার্ট', 'tshirt', 'tee'],
  'tshirt': ['টি শার্ট', 'শার্ট', 't-shirt'],
  'mobile': ['মোবাইল', 'স্মার্টফোন', 'smartphone', 'phone', 'মোবাইল ফোন'],
  'smartphone': ['স্মার্টফোন', 'মোবাইল', 'mobile', 'phone'],
  'phone': ['ফোন', 'মোবাইল', 'mobile', 'smartphone'],
  'watch': ['ঘড়ি', 'ঘড়ি', 'smartwatch', 'smart watch', 'স্মার্ট ওয়াচ'],
  'smartwatch': ['স্মার্ট ওয়াচ', 'ঘড়ি', 'ঘড়ি', 'watch'],
  'book': ['বই', 'books', 'literature'],
  'books': ['বই', 'book', 'literature'],
  'headphone': ['হেডফোন', 'headphones', 'earbuds', 'ইয়ারফোন'],
  'headphones': ['হেডফোন', 'headphone', 'earbuds', 'ইয়ারফোন', 'audio'],
  'earbuds': ['এয়ারবাডস', 'ইয়ারফোন', 'হেডফোন', 'wireless earbuds'],
  'laptop': ['ল্যাপটপ', 'computer', 'notebook'],
  'bag': ['ব্যাগ', 'backpack', 'leather'],
  'backpack': ['ব্যাকপ্যাক', 'ব্যাগ', 'bag'],
  'sunglasses': ['সানগ্লাস', 'চশমা', 'glasses', 'eyewear'],
  'jacket': ['জ্যাকেট', 'coat', 'winter'],
};

// Backward-compatible alias for existing imports
export const BANGLA_SYNONYM_MAP = CROSS_LINGUAL_SYNONYM_MAP;

/**
 * Expand search query across Bangla and English using normalized tokenization
 */
export function expandSearchQuery(rawQuery: string): string[] {
  const normalized = normalizeMultilingualQuery(rawQuery);
  if (!normalized) return [];

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const terms = new Set<string>([normalized]);

  for (const token of tokens) {
    terms.add(token);
    const synonyms = CROSS_LINGUAL_SYNONYM_MAP[token];
    if (synonyms) {
      for (const syn of synonyms) {
        terms.add(syn.toLowerCase());
      }
    }
  }

  // Also check if the whole multi-word query exists in synonym dictionary
  if (CROSS_LINGUAL_SYNONYM_MAP[normalized]) {
    for (const syn of CROSS_LINGUAL_SYNONYM_MAP[normalized]) {
      terms.add(syn.toLowerCase());
    }
  }

  return Array.from(terms);
}

/**
 * Calculate relevance score for search results
 */
export function scoreSearchMatch(
  query: string,
  tokens: string[],
  product: {
    name: string;
    sku: string;
    brand?: string;
    category?: string;
    subcategory?: string;
    banglaKeywords?: string[];
    description?: string;
  }
): number {
  const cleanQ = normalizeMultilingualQuery(query);
  const prodName = normalizeMultilingualQuery(product.name);
  const prodSku = (product.sku || '').toLowerCase();
  const prodBrand = normalizeMultilingualQuery(product.brand || '');
  const prodCategory = normalizeMultilingualQuery(product.category || '');
  const banglaList = (product.banglaKeywords || []).map((k) => normalizeMultilingualQuery(k));

  let score = 0;

  // 1. Exact Name match (Highest priority)
  if (prodName === cleanQ) {
    score += 100;
  } else if (prodName.startsWith(cleanQ)) {
    score += 80;
  } else if (prodName.includes(cleanQ)) {
    score += 60;
  }

  // 2. Exact SKU match
  if (prodSku === cleanQ || prodSku.includes(cleanQ)) {
    score += 90;
  }

  // 3. Brand or Category exact match
  if (prodBrand === cleanQ || prodCategory === cleanQ) {
    score += 50;
  }

  // 4. Token matches in Name, Brand, Category, Bangla Keywords
  for (const token of tokens) {
    if (prodName.includes(token)) score += 30;
    if (prodBrand.includes(token)) score += 20;
    if (prodCategory.includes(token)) score += 20;
    if (banglaList.some((bk) => bk.includes(token) || token.includes(bk))) score += 40;
  }

  // 5. Description partial match
  if (product.description && normalizeMultilingualQuery(product.description).includes(cleanQ)) {
    score += 10;
  }

  return score;
}

/**
 * Filter and sort hero sliders by displayOrder
 */
export interface BaseSlider {
  id: string;
  displayOrder: number;
  isActive: boolean;
  headline: string;
}

export function filterAndSortSliders<T extends BaseSlider>(sliders: T[], activeOnly: boolean = true): T[] {
  let list = [...sliders];
  if (activeOnly) {
    list = list.filter((s) => s.isActive);
  }
  return list.sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Filter banners by placement and active status
 */
export interface BaseBanner {
  id: string;
  placement: string;
  displayOrder: number;
  isActive: boolean;
}

export function filterBannersByPlacement<T extends BaseBanner>(
  banners: T[],
  placement?: string,
  activeOnly: boolean = true
): T[] {
  let list = [...banners];
  if (placement && placement !== 'all') {
    list = list.filter((b) => b.placement === placement);
  }
  if (activeOnly) {
    list = list.filter((b) => b.isActive);
  }
  return list.sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Determine advertisement campaign eligibility
 */
export interface BaseAd {
  id: string;
  priority: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  frequency: 'once_per_session' | 'always' | 'daily';
}

export function isAdEligible(ad: BaseAd, now: Date = new Date()): boolean {
  if (!ad.isActive) return false;
  if (ad.startDate && new Date(ad.startDate) > now) return false;
  if (ad.endDate && new Date(ad.endDate) < now) return false;
  return true;
}

/**
 * Check if visitor session is currently online based on heartbeat threshold
 */
export function isSessionActiveOnline(
  lastSeenMs: number,
  nowMs: number = Date.now(),
  timeoutMs: number = 5 * 60 * 1000
): boolean {
  return nowMs - lastSeenMs <= timeoutMs;
}

/**
 * Extract the first two uppercase initials from a customer name.
 * 
 * Examples per requirements:
 * - "Mahafuj Ali" -> "MA"
 * - "Rahim Uddin" -> "RA"
 * - "Sarah" -> "SA"
 * - "Sarah Khan" -> "SA"
 * - "A" -> "A"
 * - "" / null -> "CU"
 */
export function getUserInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'CU';
  const clean = name.trim();
  if (!clean) return 'CU';

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    // If the first word has at least 2 characters, check whether first 2 of first word or first + second initial.
    // Notice prompt specs: "Mahafuj Ali" -> "MA", "Rahim Uddin" -> "RA", "Sarah" -> "SA".
    // In all prompt test cases, taking the first 2 characters of the first word (or first char + second char when first word is a single initial):
    if (parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }

  // Single word name: first 2 characters
  if (clean.length === 1) {
    return clean.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/**
 * Customer registration form validation
 * Enforces: Name (>= 2 chars), valid Email, Password (>= 6 chars).
 * Phone number is intentionally NOT required for registration.
 */
export function validateCustomerRegistration(input: {
  name?: string;
  email?: string;
  password?: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input.name || input.name.trim().length < 2) {
    errors.name = 'Full name must be at least 2 characters.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.email || !emailRegex.test(input.email.trim())) {
    errors.email = 'Please provide a valid email address.';
  }

  if (!input.password || input.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Conversational Natural Language Search Intent Structure
 */
export interface ConversationalSearchIntent {
  rawQuery: string;
  cleanedQuery: string;
  isConversational: boolean;
  intent?: 'affordable' | 'premium' | 'daily_use' | 'discount' | 'popular' | 'new_arrival' | 'similar' | 'general';
  maxPrice?: number;
  minPrice?: number;
  targetCategory?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'popular';
  tokens: string[];
}

/**
 * Convert Bangla digits to standard Western digits
 */
export function convertBanglaDigitsToWestern(input: string): string {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return input.replace(/[০-৯]/g, (d) => String(banglaDigits.indexOf(d)));
}

/**
 * Advanced Conversational / Natural Language Search Parser
 * Extracts shopper intent, price bounds, category scope, and stripped keywords
 * Handles conversational queries like:
 * - "Show me affordable products"
 * - "I need a product for daily use"
 * - "Show products similar to the one I viewed"
 * - "Find products from this category"
 * - "Show me premium quality products"
 * - "Products under 2000" / "under ৳5000"
 */
export function parseConversationalSearchQuery(rawQuery: string): ConversationalSearchIntent {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return {
      rawQuery: '',
      cleanedQuery: '',
      isConversational: false,
      intent: 'general',
      tokens: [],
    };
  }

  const normalized = normalizeMultilingualQuery(rawQuery);
  const normalizedWithConvertedDigits = convertBanglaDigitsToWestern(normalized);

  let isConversational = false;
  let intent: ConversationalSearchIntent['intent'] = undefined;
  let sortBy: ConversationalSearchIntent['sortBy'] = undefined;
  let maxPrice: number | undefined = undefined;
  let minPrice: number | undefined = undefined;
  let targetCategory: string | undefined = undefined;

  let workingQuery = normalizedWithConvertedDigits;

  // 1. Detect Price Constraints: under / below / less than / upto
  const maxPriceRegex = /(?:under|below|less than|within|maximum|max|upto|up to|কমে|নিচে)\s*(?:৳|tk|bdt)?\s*(\d+(?:\.\d+)?)/i;
  const maxPriceMatch = workingQuery.match(maxPriceRegex);
  if (maxPriceMatch) {
    maxPrice = parseFloat(maxPriceMatch[1]);
    isConversational = true;
    workingQuery = workingQuery.replace(maxPriceRegex, ' ');
  }

  // Detect Price Constraints: above / over / more than / minimum
  const minPriceRegex = /(?:above|over|more than|minimum|min|বেশি|উপরে)\s*(?:৳|tk|bdt)?\s*(\d+(?:\.\d+)?)/i;
  const minPriceMatch = workingQuery.match(minPriceRegex);
  if (minPriceMatch) {
    minPrice = parseFloat(minPriceMatch[1]);
    isConversational = true;
    workingQuery = workingQuery.replace(minPriceRegex, ' ');
  }

  // 2. Detect Intent Patterns
  // Affordable / Budget
  if (
    /\b(affordable|budget|cheap|low cost|low price|inexpensive|pocket friendly)\b/i.test(workingQuery) ||
    /(?:কম দামে|সাশ্রয়ী|সস্তা)/.test(workingQuery)
  ) {
    intent = 'affordable';
    sortBy = 'price_asc';
    isConversational = true;
    workingQuery = workingQuery.replace(/\b(affordable|budget|cheap|low cost|low price|inexpensive|pocket friendly)\b/gi, ' ');
    workingQuery = workingQuery.replace(/(?:কম দামে|সাশ্রয়ী|সস্তা)/g, ' ');
  }
  // Premium / Luxury / High Quality
  else if (
    /\b(premium|luxury|high end|top quality|best quality|flagship|top tier)\b/i.test(workingQuery) ||
    /(?:হাই এন্ড|দামি|প্রিমিয়াম|উন্নত মানের)/.test(workingQuery)
  ) {
    intent = 'premium';
    sortBy = 'rating';
    isConversational = true;
    workingQuery = workingQuery.replace(/\b(premium|luxury|high end|top quality|best quality|flagship|top tier)\b/gi, ' ');
    workingQuery = workingQuery.replace(/(?:হাই এন্ড|দামি|প্রিমিয়াম|উন্নত মানের)/g, ' ');
  }
  // Daily Use / Everyday
  else if (
    /\b(daily use|daily wear|everyday use|everyday|daily life|for daily use)\b/i.test(workingQuery) ||
    /(?:প্রতিদিনের|দৈনন্দিন)/.test(workingQuery)
  ) {
    intent = 'daily_use';
    isConversational = true;
    workingQuery = workingQuery.replace(/\b(daily use|daily wear|everyday use|everyday|daily life|for daily use)\b/gi, ' ');
    workingQuery = workingQuery.replace(/(?:প্রতিদিনের|দৈনন্দিন)/g, ' ');
  }
  // Discount / Sale / Offers
  else if (
    /\b(discount|discounted|sale|deals?|offers?|promo)\b/i.test(workingQuery) ||
    /(?:ছাড়|অফার)/.test(workingQuery)
  ) {
    intent = 'discount';
    isConversational = true;
    workingQuery = workingQuery.replace(/\b(discount|discounted|sale|deals?|offers?|promo)\b/gi, ' ');
    workingQuery = workingQuery.replace(/(?:ছাড়|অফার)/g, ' ');
  }
  // Popular / Trending / Best Sellers
  else if (
    /\b(popular|trending|best sellers?|best selling|most popular)\b/i.test(workingQuery) ||
    /(?:টপ সেলিং|জনপ্রিয়)/.test(workingQuery)
  ) {
    intent = 'popular';
    sortBy = 'popular';
    isConversational = true;
    workingQuery = workingQuery.replace(/\b(popular|trending|best sellers?|best selling|most popular)\b/gi, ' ');
    workingQuery = workingQuery.replace(/(?:টপ সেলিং|জনপ্রিয়)/g, ' ');
  }
  // New Arrival / Latest
  else if (
    /\b(new arrival|latest|recently added|new)\b/i.test(workingQuery) ||
    /(?:নতুন)/.test(workingQuery)
  ) {
    intent = 'new_arrival';
    isConversational = true;
    workingQuery = workingQuery.replace(/\b(new arrival|latest|recently added|new)\b/gi, ' ');
    workingQuery = workingQuery.replace(/(?:নতুন)/g, ' ');
  }
  // Similar to viewed
  else if (
    /\b(similar(?: to(?: the one)?(?: i viewed)?)?|products like|related to my previous searches)\b/i.test(workingQuery) ||
    /(?:আগের মত|অনুরূপ)/.test(workingQuery)
  ) {
    intent = 'similar';
    isConversational = true;
    workingQuery = workingQuery.replace(/\b(similar(?: to(?: the one)?(?: i viewed)?)?|products like|related to my previous searches)\b/gi, ' ');
    workingQuery = workingQuery.replace(/(?:আগের মত|অনুরূপ)/g, ' ');
  }

  // 3. Conversational Fillers to strip (flags isConversational)
  const conversationalFillers = [
    /\b(show me|can you show me|can you show|could you show)\b/gi,
    /\b(i need|i want|looking for|i am looking for|im looking for)\b/gi,
    /\b(find me|find|search for|give me|recommend me|recommend)\b/gi,
    /\b(a product for|products for|products from|product from|from this category|from category)\b/gi,
    /\b(products|product|items|item|things|goods|stuff|collection)\b/gi,
    /\b(please|thanks|thank you|for me)\b/gi,
    /(?:দেখান|খুঁজছি|দরকার|চাই|দাও)/g,
  ];

  for (const filler of conversationalFillers) {
    if (filler.test(workingQuery)) {
      isConversational = true;
      workingQuery = workingQuery.replace(filler, ' ');
    }
  }

  // 4. Category Detection (only for explicit category searches like "from category electronics", "find electronics", etc.)
  if (/\b(electronics|electronic|tech)\b/i.test(workingQuery) && (isConversational || /\b(category|collection|section)\b/i.test(workingQuery))) {
    targetCategory = 'Electronics';
    isConversational = true;
    workingQuery = workingQuery.replace(/\b(electronics|electronic|tech)\b/gi, ' ');
  } else if (/\b(fashion|clothing|apparel)\b/i.test(workingQuery) && (isConversational || /\b(category|collection|section)\b/i.test(workingQuery))) {
    targetCategory = 'Fashion';
    isConversational = true;
    workingQuery = workingQuery.replace(/\b(fashion|clothing|apparel)\b/gi, ' ');
  } else if (/\b(footwear)\b/i.test(workingQuery)) {
    targetCategory = 'Footwear';
    isConversational = true;
    workingQuery = workingQuery.replace(/\b(footwear)\b/gi, ' ');
  } else if (/\b(lifestyle)\b/i.test(workingQuery) && (isConversational || /\b(category|collection|section)\b/i.test(workingQuery))) {
    targetCategory = 'Lifestyle';
    isConversational = true;
    workingQuery = workingQuery.replace(/\b(lifestyle)\b/gi, ' ');
  }

  // Clean remaining whitespace and punctuation
  const cleanedQuery = workingQuery.replace(/[^\w\s\u0980-\u09FF]/g, ' ').replace(/\s+/g, ' ').trim();

  // If no specific intent identified but conversational was flagged, set 'general'
  if (!intent) {
    intent = isConversational ? 'general' : undefined;
  }

  // Tokens to search
  let tokens: string[] = [];
  if (cleanedQuery) {
    tokens = expandSearchQuery(cleanedQuery);
  } else if (targetCategory) {
    tokens = expandSearchQuery(targetCategory);
  } else if (intent === 'daily_use') {
    tokens = ['backpack', 't-shirt', 'shirt', 'shoes', 'sneakers', 'lifestyle', 'casual'];
  } else if (intent === 'affordable') {
    tokens = ['t-shirt', 'earbuds', 'watch', 'backpack', 'shoes'];
  } else if (intent === 'premium') {
    tokens = ['headphones', 'smartwatch', 'leather', 'shoes', 'running'];
  }

  return {
    rawQuery,
    cleanedQuery,
    isConversational,
    intent,
    maxPrice,
    minPrice,
    targetCategory,
    sortBy,
    tokens,
  };
}

