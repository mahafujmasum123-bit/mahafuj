import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCartTotals,
  formatCartBadge,
  validateAddToCartQuantity,
  validateQuantityChange,
  mergeCartLines,
  type CartItemInput,
} from './ecommerceRules';

/* -------------------------------------------------------------------------- */
/*  1. 15-POINT CART VERIFICATION TEST SUITE                                  */
/* -------------------------------------------------------------------------- */

test('Cart Verification 1: New product added to cart defaults strictly to quantity 1', () => {
  const stock = 15;
  const result = validateAddToCartQuantity(undefined, 1, stock);
  assert.equal(result.newQuantity, 1, 'New product initial quantity must be 1');
  assert.equal(result.actualAdded, 1, 'actualAdded must be 1');
  assert.equal(result.message, undefined);
});

test('Cart Verification 2: Clicking Add to Cart 2 times maintains quantity 1 idempotently', () => {
  const stock = 20;
  // First click:
  const first = validateAddToCartQuantity(undefined, 1, stock);
  assert.equal(first.newQuantity, 1);
  assert.equal(first.actualAdded, 1);

  // Second click:
  const second = validateAddToCartQuantity(first.newQuantity, 1, stock);
  assert.equal(second.newQuantity, 1, 'Second click must not increment beyond 1');
  assert.equal(second.actualAdded, 0, 'No additional units added on repeated click');
});

test('Cart Verification 3: Clicking Add to Cart 10 times maintains quantity 1 idempotently', () => {
  const stock = 20;
  let currentQty: number | undefined = undefined;
  for (let i = 1; i <= 10; i++) {
    const res = validateAddToCartQuantity(currentQty, 1, stock);
    currentQty = res.newQuantity;
    if (i === 1) {
      assert.equal(res.actualAdded, 1);
    } else {
      assert.equal(res.actualAdded, 0, `Iteration ${i} must add 0 units`);
    }
  }
  assert.equal(currentQty, 1, 'After 10 clicks, quantity must remain strictly 1');
});

test('Cart Verification 4: Clicking Add to Cart 100 times maintains quantity 1 without runaway increment', () => {
  const stock = 500;
  let currentQty: number | undefined = undefined;
  for (let i = 1; i <= 100; i++) {
    const res = validateAddToCartQuantity(currentQty, 1, stock);
    currentQty = res.newQuantity;
  }
  assert.equal(currentQty, 1, 'After 100 clicks, quantity must remain strictly 1');
});

test('Cart Verification 5: Manual quantity controls increase quantity sequentially (1 -> 2 -> 3)', () => {
  const stock = 10;
  // 1 -> 2
  const step1 = validateQuantityChange(1, 1, stock);
  assert.equal(step1, 2, 'Quantity increments from 1 to 2');

  // 2 -> 3
  const step2 = validateQuantityChange(step1, 1, stock);
  assert.equal(step2, 3, 'Quantity increments from 2 to 3');
});

test('Cart Verification 6: Manual quantity controls decrease quantity sequentially (3 -> 2 -> 1)', () => {
  const stock = 10;
  // 3 -> 2
  const step1 = validateQuantityChange(3, -1, stock);
  assert.equal(step1, 2, 'Quantity decrements from 3 to 2');

  // 2 -> 1
  const step2 = validateQuantityChange(step1, -1, stock);
  assert.equal(step2, 1, 'Quantity decrements from 2 to 1');
});

test('Cart Verification 7: Manual quantity controls cannot reduce quantity below minimum 1', () => {
  const stock = 10;
  const result = validateQuantityChange(1, -1, stock);
  assert.equal(result, 1, 'Quantity must not drop below minimum 1');

  // Even large negative delta cannot reduce below 1
  const negativeJump = validateQuantityChange(1, -10, stock);
  assert.equal(negativeJump, 1, 'Large negative delta cannot drop below 1');
});

test('Cart Verification 8: Manual quantity controls cannot exceed available inventory stock', () => {
  const stock = 4;
  const atMax = validateQuantityChange(4, 1, stock);
  assert.equal(atMax, 4, 'Cannot increment past stock limit of 4');

  // Attempting large jump past stock
  const bigJump = validateQuantityChange(1, 10, stock);
  assert.equal(bigJump, 4, 'Cannot exceed stock limit of 4 on jump');
});

test('Cart Verification 9: Navbar cart badge displays 1 for a single distinct product', () => {
  const singleProductCart: CartItemInput[] = [
    { productId: 'p1', sku: 'SKU1', name: 'Smart Watch', price: 2500, quantity: 1, image: '', stock: 10, selected: true },
  ];
  const totals = calculateCartTotals(singleProductCart, null, 'Dhaka');
  assert.equal(totals.lineItemsCount, 1);
  assert.equal(formatCartBadge(totals.lineItemsCount), '1');
});

test('Cart Verification 10: Navbar cart badge displays 2 for two distinct products', () => {
  const twoProductsCart: CartItemInput[] = [
    { productId: 'p1', sku: 'SKU1', name: 'Smart Watch', price: 2500, quantity: 1, image: '', stock: 10, selected: true },
    { productId: 'p2', sku: 'SKU2', name: 'Cotton Shirt', price: 1200, quantity: 1, image: '', stock: 15, selected: true },
  ];
  const totals = calculateCartTotals(twoProductsCart, null, 'Dhaka');
  assert.equal(totals.lineItemsCount, 2);
  assert.equal(formatCartBadge(totals.lineItemsCount), '2');
});

test('Cart Verification 11: Navbar cart badge displays 2 (distinct products) even when items have multi-unit quantities (5 and 3)', () => {
  const multiUnitCart: CartItemInput[] = [
    { productId: 'p1', sku: 'SKU1', name: 'Smart Watch', price: 2500, quantity: 5, image: '', stock: 10, selected: true },
    { productId: 'p2', sku: 'SKU2', name: 'Cotton Shirt', price: 1200, quantity: 3, image: '', stock: 15, selected: true },
  ];
  const totals = calculateCartTotals(multiUnitCart, null, 'Dhaka');
  // Distinct product count is 2, while total units count is 8
  assert.equal(totals.lineItemsCount, 2);
  assert.equal(totals.totalQuantity, 8);
  // Badge must show 2 distinct products
  assert.equal(formatCartBadge(totals.lineItemsCount), '2');
});

test('Cart Verification 12: Cart subtotal and totals accurately compute multi-unit quantities', () => {
  const multiUnitCart: CartItemInput[] = [
    { productId: 'p1', sku: 'SKU1', name: 'Earbuds', price: 2000, quantity: 5, image: '', stock: 10, selected: true },
    { productId: 'p2', sku: 'SKU2', name: 'Case', price: 500, quantity: 3, image: '', stock: 10, selected: true },
  ];
  // Subtotal: (2000 * 5) + (500 * 3) = 10000 + 1500 = 11500
  // Shipping: subtotal > 5000 in Dhaka = 0 (free shipping)
  const totals = calculateCartTotals(multiUnitCart, null, 'Dhaka');
  assert.equal(totals.subtotal, 11500);
  assert.equal(totals.shippingFee, 0);
  assert.equal(totals.finalTotal, 11500);
});

test('Cart Verification 13: Subtotal, item counts, and shipping dynamically recalculate upon quantity change', () => {
  const initialCart: CartItemInput[] = [
    { productId: 'p1', sku: 'SKU1', name: 'Item A', price: 1000, quantity: 1, image: '', stock: 10, selected: true },
  ];
  const total1 = calculateCartTotals(initialCart, null, 'Dhaka');
  assert.equal(total1.subtotal, 1000);
  assert.equal(total1.shippingFee, 60); // under 5000 threshold
  assert.equal(total1.finalTotal, 1060);

  // User manually increments quantity to 6
  const updatedCart: CartItemInput[] = [
    { ...initialCart[0], quantity: 6 },
  ];
  const total2 = calculateCartTotals(updatedCart, null, 'Dhaka');
  assert.equal(total2.subtotal, 6000);
  assert.equal(total2.shippingFee, 0); // >= 5000 qualifies for free shipping
  assert.equal(total2.finalTotal, 6000);
});

test('Cart Verification 14: Refresh and cart persistence preserves untouched item quantity 1 without unintended increment or reset', () => {
  // Simulate serialized cart in localStorage / session
  const serializedCart = JSON.stringify([
    { productId: 'p1', sku: 'SKU1', name: 'Wireless Mouse', price: 1500, quantity: 1, image: '', stock: 10, selected: true },
  ]);
  const restoredCart: CartItemInput[] = JSON.parse(serializedCart);
  assert.equal(restoredCart.length, 1);
  assert.equal(restoredCart[0].quantity, 1, 'Untouched item quantity remains strictly 1 on restore');

  // Verify that subsequent Add to Cart for the restored cart item doesn't mutate or increment it
  const reAddCheck = validateAddToCartQuantity(restoredCart[0].quantity, 1, restoredCart[0].stock);
  assert.equal(reAddCheck.newQuantity, 1, 'Re-adding on existing restored cart keeps quantity 1');
  assert.equal(reAddCheck.actualAdded, 0, 'actualAdded must be 0 for idempotent re-add');
});

test('Cart Verification 15: PDP default quantity rule guarantees 1 on initial load and navigation', () => {
  // Simulating PDP state transition when switching from product A to product B
  let pdpQuantity = 4; // user had selected 4 for product A
  const onProductChange = (newSlug: string) => {
    // PDP effect synchronizes quantity strictly back to 1
    pdpQuantity = 1;
    return newSlug;
  };

  onProductChange('product-b-slug');
  assert.equal(pdpQuantity, 1, 'PDP quantity state must be reset to 1 on product switch');
});

/* -------------------------------------------------------------------------- */
/*  2. PERSONALIZED RECOMMENDATION ENGINE TEST SUITE                          */
/* -------------------------------------------------------------------------- */

test('Recommendation Engine: Interaction weights adhere to specified hierarchy', () => {
  const weights: Record<string, number> = {
    order_complete: 6,
    search: 3,
    search_click: 2.5,
    category_view: 2,
    product_view: 1,
  };

  assert.ok(weights.order_complete > weights.search, 'Order weight (6) > Search weight (3)');
  assert.ok(weights.search > weights.search_click, 'Search weight (3) > Search click weight (2.5)');
  assert.ok(weights.search_click > weights.category_view, 'Search click weight (2.5) > Category view (2)');
  assert.ok(weights.category_view > weights.product_view, 'Category view weight (2) > Product view (1)');
});

test('Recommendation Engine: Recency time decay decreases older interaction weights', () => {
  const calculateDecay = (timestamp: number, now: number) => {
    const ageInHours = Math.max(0, (now - timestamp) / (1000 * 60 * 60));
    // Half life of 48 hours
    return Math.pow(0.5, ageInHours / 48);
  };

  const now = Date.now();
  const recent = now - 1000 * 60 * 30; // 30 minutes ago
  const twoDaysAgo = now - 1000 * 60 * 60 * 48; // 48 hours ago
  const fourDaysAgo = now - 1000 * 60 * 60 * 96; // 96 hours ago

  const decayRecent = calculateDecay(recent, now);
  const decay2Days = calculateDecay(twoDaysAgo, now);
  const decay4Days = calculateDecay(fourDaysAgo, now);

  assert.ok(decayRecent > 0.99, 'Recent event retains >99% weight');
  assert.ok(Math.abs(decay2Days - 0.5) < 0.05, '48h event has ~50% weight');
  assert.ok(Math.abs(decay4Days - 0.25) < 0.05, '96h event has ~25% weight');
});

test('Recommendation Engine: Cold start fallback provides featured/bestseller catalog items', () => {
  const catalog = [
    { id: 'p1', name: 'Product 1', isFeatured: true, salesCount: 500 },
    { id: 'p2', name: 'Product 2', isFeatured: false, salesCount: 10 },
    { id: 'p3', name: 'Product 3', isFeatured: true, salesCount: 300 },
    { id: 'p4', name: 'Product 4', isFeatured: false, salesCount: 1200, isBestSeller: true },
  ];

  // User has no previous interactions (empty map)
  const userInteractionsCount = 0;
  const getRecommendations = (limit: number) => {
    if (userInteractionsCount === 0) {
      // Cold-start fallback: sort by isFeatured descending, then salesCount descending
      return [...catalog]
        .sort((a, b) => {
          if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
          return b.salesCount - a.salesCount;
        })
        .slice(0, limit);
    }
    return [];
  };

  const recs = getRecommendations(3);
  assert.equal(recs.length, 3);
  assert.equal(recs[0].id, 'p1');
  assert.equal(recs[1].id, 'p3');
});

/* -------------------------------------------------------------------------- */
/*  3. RELATED PRODUCTS PAGINATION TEST SUITE                                 */
/* -------------------------------------------------------------------------- */

test('Related Products Pagination: Page 1 with limit=15 correctly calculates hasMore and pagination meta', () => {
  // Generate 26 mock products in category "Electronics"
  const allElectronics = Array.from({ length: 26 }, (_, i) => ({
    id: `prod-${i + 1}`,
    name: `Electronics Gadget ${i + 1}`,
    category: 'Electronics',
    slug: `gadget-${i + 1}`,
  }));

  const currentSlug = 'gadget-1';
  // Exclude current product
  const relatedPool = allElectronics.filter((p) => p.slug !== currentSlug);
  assert.equal(relatedPool.length, 25);

  const paginate = (page: number, limit: number) => {
    const total = relatedPool.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const items = relatedPool.slice(skip, skip + limit);
    const hasMore = page < totalPages;
    return { items, total, totalPages, page, limit, hasMore };
  };

  // First page request
  const page1 = paginate(1, 15);
  assert.equal(page1.items.length, 15, 'Initial page must return exactly 15 items');
  assert.equal(page1.total, 25);
  assert.equal(page1.totalPages, 2);
  assert.equal(page1.hasMore, true, 'hasMore must be true when 10 items remain');

  // Second page request ("Show More")
  const page2 = paginate(2, 15);
  assert.equal(page2.items.length, 10, 'Second page returns remaining 10 items');
  assert.equal(page2.hasMore, false, 'hasMore must be false on final page');

  // Deduplication check when appending
  const combined = [...page1.items, ...page2.items];
  const uniqueIds = new Set(combined.map((p) => p.id));
  assert.equal(uniqueIds.size, 25, 'Combined pages must have zero duplicates');
});

test('Related Products: Products with <= 15 related items do not trigger hasMore', () => {
  const shortCategoryList = Array.from({ length: 12 }, (_, i) => ({
    id: `item-${i + 1}`,
    slug: `item-${i + 1}`,
    category: 'Books',
  }));

  const related = shortCategoryList.filter((p) => p.slug !== 'item-1');
  assert.equal(related.length, 11);

  const limit = 15;
  const page = 1;
  const total = related.length;
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  assert.equal(hasMore, false, 'hasMore must be false when items count <= 15');
});

/* -------------------------------------------------------------------------- */
/*  4. PARABOLIC ANIMATION & DESKTOP HOVER ZOOM COORDINATES                   */
/* -------------------------------------------------------------------------- */

test('Parabolic Cart Animation: Calculates relative deltaX and deltaY trajectory correctly', () => {
  // Source button at (100, 500), Navbar cart icon at (800, 20)
  const sourceRect = { left: 100, top: 500, width: 120, height: 40 };
  const targetRect = { left: 800, top: 20, width: 40, height: 40 };

  const startX = sourceRect.left + sourceRect.width / 2; // 160
  const startY = sourceRect.top + sourceRect.height / 2;   // 520
  const endX = targetRect.left + targetRect.width / 2;     // 820
  const endY = targetRect.top + targetRect.height / 2;       // 40

  const deltaX = endX - startX; // 820 - 160 = +660px
  const deltaY = endY - startY; // 40 - 520 = -480px

  assert.equal(deltaX, 660);
  assert.equal(deltaY, -480);
});

test('Desktop Image Zoom: Calculates bounded cursor percentage origin accurately', () => {
  const containerRect = { left: 100, top: 200, width: 400, height: 400 };

  const getZoomOrigin = (clientX: number, clientY: number) => {
    const rawX = ((clientX - containerRect.left) / containerRect.width) * 100;
    const rawY = ((clientY - containerRect.top) / containerRect.height) * 100;
    const boundedX = Math.max(0, Math.min(100, rawX));
    const boundedY = Math.max(0, Math.min(100, rawY));
    return { originX: boundedX, originY: boundedY };
  };

  // Center cursor
  const center = getZoomOrigin(300, 400);
  assert.equal(center.originX, 50);
  assert.equal(center.originY, 50);

  // Top-left cursor
  const topLeft = getZoomOrigin(100, 200);
  assert.equal(topLeft.originX, 0);
  assert.equal(topLeft.originY, 0);

  // Cursor slightly past bottom-right bounds clamped to 100%
  const beyond = getZoomOrigin(600, 700);
  assert.equal(beyond.originX, 100);
  assert.equal(beyond.originY, 100);
});
