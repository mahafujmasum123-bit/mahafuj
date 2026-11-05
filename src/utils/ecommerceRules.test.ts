import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCartTotals,
  getEffectivePrice,
  isValidOrderTransition,
  mergeCartLines,
  expandSearchQuery,
  filterAndSortSliders,
  filterBannersByPlacement,
  isAdEligible,
  isSessionActiveOnline,
  formatCartBadge,
  DEFAULT_ADD_TO_CART_QUANTITY,
  validateAddToCartQuantity,
  validateQuantityChange,
  scoreSearchMatch,
  getUserInitials,
  validateCustomerRegistration,
  parseConversationalSearchQuery,
  type CartItemInput,
  type CouponRule,
} from './ecommerceRules';

test('getEffectivePrice returns salePrice if lower than basePrice', () => {
  assert.equal(getEffectivePrice(100, 80), 80);
  assert.equal(getEffectivePrice(100, 120), 100);
  assert.equal(getEffectivePrice(100, undefined), 100);
  assert.equal(getEffectivePrice(100, 0), 100);
});

test('calculateCartTotals calculates subtotal, shipping, and discount correctly', () => {
  const items: CartItemInput[] = [
    {
      productId: 'p1',
      sku: 'SKU-1',
      name: 'Wireless Earbuds',
      price: 50,
      salePrice: 40,
      quantity: 2,
      image: '/test.jpg',
      stock: 10,
    },
    {
      productId: 'p2',
      sku: 'SKU-2',
      name: 'Men T-shirt',
      price: 25,
      quantity: 1,
      image: '/test.jpg',
      stock: 5,
    },
  ];

  // subtotal: (40 * 2) + (25 * 1) = 105
  // Dhaka shipping: 60 (subtotal < 5000)
  // lineItemsCount: 2
  const result = calculateCartTotals(items, null, 'Dhaka');
  assert.equal(result.subtotal, 105);
  assert.equal(result.shippingFee, 60);
  assert.equal(result.finalTotal, 165);
  assert.equal(result.lineItemsCount, 2);
  assert.equal(result.totalQuantity, 3);
});

test('calculateCartTotals applies percentage coupon with cap', () => {
  const items: CartItemInput[] = [
    {
      productId: 'p1',
      sku: 'SKU-1',
      name: 'Smart Watch',
      price: 1000,
      quantity: 2,
      image: '/test.jpg',
      stock: 10,
    },
  ];

  const coupon: CouponRule = {
    code: 'SAVE20',
    discountType: 'percentage',
    discountValue: 20, // 20% of 2000 = 400
    minOrderAmount: 500,
    maxDiscount: 300, // capped at 300
    validFrom: '2020-01-01',
    validTo: '2030-01-01',
    isActive: true,
  };

  const result = calculateCartTotals(items, coupon, 'Dhaka');
  assert.equal(result.subtotal, 2000);
  assert.equal(result.discount, 300);
  assert.equal(result.shippingFee, 60);
  assert.equal(result.finalTotal, 1760);
});

test('isValidOrderTransition rejects invalid status jumps', () => {
  assert.equal(isValidOrderTransition('pending', 'confirmed'), true);
  assert.equal(isValidOrderTransition('confirmed', 'processing'), true);
  assert.equal(isValidOrderTransition('processing', 'shipped'), false); // must go to packed first
  assert.equal(isValidOrderTransition('cancelled', 'delivered'), false);
  assert.equal(isValidOrderTransition('delivered', 'returned'), true);
});

test('mergeCartLines combines duplicates and respects stock caps', () => {
  const existing: CartItemInput[] = [
    {
      productId: 'p1',
      variantId: 'v1',
      sku: 'SKU-A',
      name: 'Shoes',
      price: 100,
      quantity: 2,
      image: '',
      stock: 5,
    },
  ];

  const incoming: CartItemInput[] = [
    {
      productId: 'p1',
      variantId: 'v1',
      sku: 'SKU-A',
      name: 'Shoes',
      price: 100,
      quantity: 4,
      image: '',
      stock: 5,
    },
    {
      productId: 'p2',
      sku: 'SKU-B',
      name: 'Hat',
      price: 20,
      quantity: 1,
      image: '',
      stock: 10,
    },
  ];

  const merged = mergeCartLines(existing, incoming);
  assert.equal(merged.length, 2);
  // capped at stock 5
  assert.equal(merged[0].quantity, 5);
  assert.equal(merged[1].quantity, 1);
});

test('expandSearchQuery handles Bangla to English mapping', () => {
  const tokens = expandSearchQuery('বই');
  assert.ok(tokens.includes('বই'));
  assert.ok(tokens.includes('book'));
  assert.ok(tokens.includes('literature'));
});

test('filterAndSortSliders filters inactive sliders and orders by displayOrder', () => {
  const sampleSliders = [
    { id: 's1', displayOrder: 3, isActive: true, headline: 'Slide 3' },
    { id: 's2', displayOrder: 1, isActive: true, headline: 'Slide 1' },
    { id: 's3', displayOrder: 2, isActive: false, headline: 'Slide 2 Hidden' },
  ];

  const activeOrdered = filterAndSortSliders(sampleSliders, true);
  assert.equal(activeOrdered.length, 2);
  assert.equal(activeOrdered[0].id, 's2');
  assert.equal(activeOrdered[1].id, 's1');

  const allOrdered = filterAndSortSliders(sampleSliders, false);
  assert.equal(allOrdered.length, 3);
  assert.equal(allOrdered[0].id, 's2');
  assert.equal(allOrdered[1].id, 's3');
  assert.equal(allOrdered[2].id, 's1');
});

test('filterBannersByPlacement filters correctly by placement identifier', () => {
  const sampleBanners = [
    { id: 'b1', placement: 'homepage-main', displayOrder: 1, isActive: true },
    { id: 'b2', placement: 'homepage-secondary', displayOrder: 2, isActive: true },
    { id: 'b3', placement: 'homepage-secondary', displayOrder: 1, isActive: true },
    { id: 'b4', placement: 'homepage-promotion', displayOrder: 1, isActive: false },
  ];

  const secondary = filterBannersByPlacement(sampleBanners, 'homepage-secondary', true);
  assert.equal(secondary.length, 2);
  assert.equal(secondary[0].id, 'b3'); // order 1
  assert.equal(secondary[1].id, 'b2'); // order 2

  const activePromos = filterBannersByPlacement(sampleBanners, 'homepage-promotion', true);
  assert.equal(activePromos.length, 0); // b4 is inactive
});

test('isAdEligible respects active flag and scheduled date windows', () => {
  const now = new Date('2025-06-15T12:00:00Z');

  // Active with valid dates
  assert.equal(
    isAdEligible(
      {
        id: 'ad1',
        priority: 1,
        isActive: true,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        frequency: 'once_per_session',
      },
      now
    ),
    true
  );

  // Inactive ad
  assert.equal(
    isAdEligible(
      {
        id: 'ad2',
        priority: 1,
        isActive: false,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        frequency: 'once_per_session',
      },
      now
    ),
    false
  );

  // Expired ad
  assert.equal(
    isAdEligible(
      {
        id: 'ad3',
        priority: 1,
        isActive: true,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        frequency: 'once_per_session',
      },
      now
    ),
    false
  );
});

test('isSessionActiveOnline correctly detects presence within 5 minutes', () => {
  const now = 1750000000000;
  const recent = now - 2 * 60 * 1000; // 2 minutes ago
  const stale = now - 6 * 60 * 1000; // 6 minutes ago

  assert.equal(isSessionActiveOnline(recent, now, 5 * 60 * 1000), true);
  assert.equal(isSessionActiveOnline(stale, now, 5 * 60 * 1000), false);
});

test('calculateCartTotals matches Bangladesh BDT cart pricing and discount calculation', () => {
  const referenceItems: CartItemInput[] = [
    { productId: 'p1', sku: 'SKU-1', name: 'Soundcore Life Q30', price: 11999, salePrice: 8999, quantity: 1, image: '', stock: 25, selected: true },
    { productId: 'p2', sku: 'SKU-2', name: 'Smart Watch', price: 11999, salePrice: 8279, quantity: 1, image: '', stock: 32, selected: true },
    { productId: 'p3', sku: 'SKU-3', name: 'Wireless Earbuds', price: 8399, salePrice: 4799, quantity: 1, image: '', stock: 80, selected: true },
    { productId: 'p4', sku: 'SKU-4', name: 'Laptop Backpack', price: 9599, salePrice: 5999, quantity: 1, image: '', stock: 60, selected: true },
    { productId: 'p5', sku: 'SKU-5', name: 'Running Shoes', price: 10799, salePrice: 8399, quantity: 1, image: '', stock: 28, selected: true },
  ];

  const shopmaxCoupon: CouponRule = {
    code: 'SHOPMAX',
    discountType: 'fixed',
    discountValue: 5000,
    minOrderAmount: 10000,
    validFrom: '2024-01-01',
    validTo: '2030-12-31',
    isActive: true,
  };

  const totals = calculateCartTotals(referenceItems, shopmaxCoupon, 'Dhaka');
  assert.equal(totals.subtotal, 36475);
  assert.equal(totals.shippingFee, 0); // >= 2500 BDT is free shipping
  assert.equal(totals.discount, 5000);
  assert.equal(totals.finalTotal, 31475);
  assert.equal(totals.lineItemsCount, 5);
  assert.equal(totals.selectedItemsCount, 5);
  assert.equal(totals.isFreeShipping, true);
});

test('calculateCartTotals dynamically updates when an item is unselected', () => {
  const referenceItems: CartItemInput[] = [
    { productId: 'p1', sku: 'SKU-1', name: 'Item 1', price: 1000, salePrice: 750, quantity: 1, image: '', stock: 25, selected: true },
    { productId: 'p2', sku: 'SKU-2', name: 'Item 2', price: 500, salePrice: 250, quantity: 1, image: '', stock: 30, selected: false },
  ];

  const totals = calculateCartTotals(referenceItems, null, 'Dhaka');
  assert.equal(totals.subtotal, 750);
  assert.equal(totals.lineItemsCount, 2);
  assert.equal(totals.selectedItemsCount, 1);
  assert.equal(totals.shippingFee, 60); // Dhaka standard shipping fee
  assert.equal(totals.finalTotal, 810);
});

test('calculateCartTotals matches Bangladesh checkout delivery rules: standard, express, next_day', () => {
  const checkoutItems: CartItemInput[] = [
    {
      productId: 'prod-1',
      variantId: 'var-1a',
      variantName: 'Black, 2.6kg',
      sku: 'NOV-AUD-001',
      name: 'Soundcore Life Q30 Wireless Noise Cancelling Headphones',
      price: 11999,
      salePrice: 8999,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b',
      stock: 25,
      selected: true,
    },
    {
      productId: 'prod-2',
      variantId: 'var-2a',
      variantName: 'Black, 1.2kg',
      sku: 'NOV-WCH-002',
      name: 'Smart Watch',
      price: 11999,
      salePrice: 8279,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1',
      stock: 32,
      selected: true,
    },
  ];

  const save1000Coupon: CouponRule = {
    code: 'SAVE1000',
    discountType: 'fixed',
    discountValue: 1000,
    minOrderAmount: 5000,
    validFrom: '2024-01-01',
    validTo: '2030-12-31',
    isActive: true,
  };

  // Standard shipping (Free over 2500 BDT)
  const standardTotals = calculateCartTotals(checkoutItems, save1000Coupon, 'Dhaka', 'standard');
  assert.equal(standardTotals.subtotal, 17278);
  assert.equal(standardTotals.discount, 1000);
  assert.equal(standardTotals.shippingFee, 0);
  assert.equal(standardTotals.finalTotal, 16278);
  assert.equal(standardTotals.lineItemsCount, 2);

  // Express shipping (150 BDT)
  const expressTotals = calculateCartTotals(checkoutItems, save1000Coupon, 'Dhaka', 'express');
  assert.equal(expressTotals.subtotal, 17278);
  assert.equal(expressTotals.shippingFee, 150);
  assert.equal(expressTotals.finalTotal, 16428);

  // Next Day Delivery (250 BDT)
  const nextDayTotals = calculateCartTotals(checkoutItems, save1000Coupon, 'Dhaka', 'next_day');
  assert.equal(nextDayTotals.subtotal, 17278);
  assert.equal(nextDayTotals.shippingFee, 250);
  assert.equal(nextDayTotals.finalTotal, 16528);
});

test('formatCartBadge strictly caps at 99+ and hides on zero or negative', () => {
  assert.equal(formatCartBadge(0), null);
  assert.equal(formatCartBadge(-5), null);
  assert.equal(formatCartBadge(1), '1');
  assert.equal(formatCartBadge(10), '10');
  assert.equal(formatCartBadge(25), '25');
  assert.equal(formatCartBadge(50), '50');
  assert.equal(formatCartBadge(98), '98');
  assert.equal(formatCartBadge(99), '99');
  assert.equal(formatCartBadge(100), '99+');
  assert.equal(formatCartBadge(150), '99+');
  assert.equal(formatCartBadge(200), '99+');
  assert.equal(formatCartBadge(500), '99+');
  assert.equal(formatCartBadge(1000), '99+');
  assert.equal(formatCartBadge(99999), '99+');
});

test('validateAddToCartQuantity enforces DEFAULT_ADD_TO_CART_QUANTITY = 1 and repeated click idempotency', () => {
  assert.equal(DEFAULT_ADD_TO_CART_QUANTITY, 1);

  // 1. Initial click with abundant stock: adds exactly 1
  const initial = validateAddToCartQuantity(0, undefined, 50);
  assert.equal(initial.valid, true);
  assert.equal(initial.actualAdded, 1);
  assert.equal(initial.newQuantity, 1);
  assert.equal(initial.isCapped, false);

  // 2. Second click on same item: keeps quantity 1 (idempotent, actualAdded = 0)
  const secondClick = validateAddToCartQuantity(1, DEFAULT_ADD_TO_CART_QUANTITY, 50);
  assert.equal(secondClick.valid, true);
  assert.equal(secondClick.actualAdded, 0);
  assert.equal(secondClick.newQuantity, 1);

  // 3. 10th and 100th clicks: strictly remains 1
  const tenthClick = validateAddToCartQuantity(1, DEFAULT_ADD_TO_CART_QUANTITY, 50);
  assert.equal(tenthClick.newQuantity, 1);
  assert.equal(tenthClick.actualAdded, 0);

  const hundredthClick = validateAddToCartQuantity(1, DEFAULT_ADD_TO_CART_QUANTITY, 50);
  assert.equal(hundredthClick.newQuantity, 1);
  assert.equal(hundredthClick.actualAdded, 0);

  // 4. Manual quantity controls (+ / -) via validateQuantityChange
  assert.equal(validateQuantityChange(1, 1, 50), 2, 'Increasing from 1 to 2 works');
  assert.equal(validateQuantityChange(2, 1, 50), 3, 'Increasing from 2 to 3 works');
  assert.equal(validateQuantityChange(3, -1, 50), 2, 'Decreasing from 3 to 2 works');
  assert.equal(validateQuantityChange(1, -1, 50), 1, 'Quantity cannot fall below 1');
  assert.equal(validateQuantityChange(5, 1, 5), 5, 'Quantity cannot exceed available stock');

  // 5. Completely out of stock
  const outOfStock = validateAddToCartQuantity(0, 1, 0);
  assert.equal(outOfStock.valid, false);
  assert.equal(outOfStock.actualAdded, 0);
  assert.equal(outOfStock.newQuantity, 0);
});

test('Cross-lingual search expansion and synonym bidirectional mapping for Bangla and English', () => {
  // জুতা <-> shoes
  const shoesTokens = expandSearchQuery('জুতা');
  assert.ok(shoesTokens.includes('shoes'));
  assert.ok(shoesTokens.includes('footwear'));

  const enShoesTokens = expandSearchQuery('shoes');
  assert.ok(enShoesTokens.includes('জুতা') || enShoesTokens.includes('জুতো'));

  // shirt <-> শার্ট
  const shirtTokens = expandSearchQuery('Shirt');
  assert.ok(shirtTokens.includes('শার্ট'));
  assert.ok(shirtTokens.includes('টিশার্ট') || shirtTokens.includes('t-shirt'));

  const banglaShirtTokens = expandSearchQuery('শার্ট');
  assert.ok(banglaShirtTokens.includes('shirt'));

  // মোবাইল <-> mobile
  const mobileTokens = expandSearchQuery('মোবাইল');
  assert.ok(mobileTokens.includes('mobile'));
  assert.ok(mobileTokens.includes('smartphone'));

  const enMobileTokens = expandSearchQuery('mobile');
  assert.ok(enMobileTokens.includes('মোবাইল'));

  // ঘড়ি / ঘড়ি <-> watch
  const watchTokens1 = expandSearchQuery('ঘড়ি');
  assert.ok(watchTokens1.includes('watch'));
  assert.ok(watchTokens1.includes('smartwatch'));

  const watchTokens2 = expandSearchQuery('ঘড়ি');
  assert.ok(watchTokens2.includes('watch'));

  const enWatchTokens = expandSearchQuery('watch');
  assert.ok(enWatchTokens.includes('ঘড়ি') || enWatchTokens.includes('ঘড়ি'));
});

test('scoreSearchMatch ranks multilingual and keyword matches accurately', () => {
  const shoeProduct = {
    name: 'Air Flow Running Shoes',
    sku: 'NOV-SHOE-001',
    banglaName: 'এয়ার ফ্লো রানিং জুতা',
    category: 'fashion',
    brand: 'Novara Sports',
    description: 'Breathable lightweight athletic footwear for daily running and training.',
    banglaKeywords: ['জুতা', 'জুতো', 'স্নিকার্স', 'shoes', 'footwear'],
  };

  const scoreBangla = scoreSearchMatch('জুতা', ['জুতা', 'জুতো', 'shoes', 'footwear'], shoeProduct);
  assert.ok(scoreBangla >= 100, `Expected score >= 100 for primary Bangla match, got ${scoreBangla}`);

  const phoneProduct = {
    name: 'Smartphone Pro Max',
    sku: 'NOV-PHN-001',
    banglaName: 'স্মার্টফোন প্রো ম্যাক্স',
    category: 'electronics',
    brand: 'Novara Tech',
    description: 'Flagship 5G smartphone with triple camera.',
    banglaKeywords: ['মোবাইল', 'স্মার্টফোন', 'ফোন'],
  };
  const scorePhone = scoreSearchMatch('জুতা', ['জুতা', 'জুতো', 'shoes', 'footwear'], phoneProduct);
  assert.equal(scorePhone, 0);
});

test('calculateCartTotals retains true totalQuantity (e.g. 60, 200, 600) while badge format limits to 99+', () => {
  // Scenario 1: 3 distinct items with 10, 20, 30 units = 60 total
  const items60: CartItemInput[] = [
    { productId: 'p1', sku: 'S1', name: 'Item 1', price: 10, quantity: 10, image: '', stock: 100, selected: true },
    { productId: 'p2', sku: 'S2', name: 'Item 2', price: 20, quantity: 20, image: '', stock: 100, selected: true },
    { productId: 'p3', sku: 'S3', name: 'Item 3', price: 30, quantity: 30, image: '', stock: 100, selected: true },
  ];
  const totals60 = calculateCartTotals(items60, null, 'Dhaka');
  assert.equal(totals60.lineItemsCount, 3);
  assert.equal(totals60.totalQuantity, 60);
  assert.equal(formatCartBadge(totals60.totalQuantity), '60');

  // Scenario 2: 3 distinct items with 100, 200, 300 units = 600 total
  const items600: CartItemInput[] = [
    { productId: 'p1', sku: 'S1', name: 'Bulk 1', price: 10, quantity: 100, image: '', stock: 500, selected: true },
    { productId: 'p2', sku: 'S2', name: 'Bulk 2', price: 20, quantity: 200, image: '', stock: 500, selected: true },
    { productId: 'p3', sku: 'S3', name: 'Bulk 3', price: 30, quantity: 300, image: '', stock: 500, selected: true },
  ];
  const totals600 = calculateCartTotals(items600, null, 'Dhaka');
  assert.equal(totals600.lineItemsCount, 3);
  assert.equal(totals600.totalQuantity, 600);
  // Presentation badge is strictly 99+
  assert.equal(formatCartBadge(totals600.totalQuantity), '99+');
});

test('getUserInitials generates uppercase initials according to customer specifications', () => {
  assert.equal(getUserInitials('Mahafuj Ali'), 'MA');
  assert.equal(getUserInitials('Rahim Uddin'), 'RA');
  assert.equal(getUserInitials('Sarah'), 'SA');
  assert.equal(getUserInitials('Sarah Khan'), 'SA');
  assert.equal(getUserInitials('A'), 'A');
  assert.equal(getUserInitials(''), 'CU');
  assert.equal(getUserInitials(null), 'CU');
  assert.equal(getUserInitials(undefined), 'CU');
});

test('validateCustomerRegistration enforces name, valid email, and password length without phone requirement', () => {
  // Valid customer input (no phone supplied)
  const valid = validateCustomerRegistration({
    name: 'Mahafuj Ali',
    email: 'mahafuj@example.com',
    password: 'securePassword123',
  });
  assert.equal(valid.valid, true);
  assert.equal(Object.keys(valid.errors).length, 0);

  // Missing or invalid fields
  const invalid = validateCustomerRegistration({
    name: 'M',
    email: 'not-an-email',
    password: '123',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.password);
});

test('parseConversationalSearchQuery extracts intents, price bounds, categories, and stripped query', () => {
  // 1. "Show me affordable products"
  const affordable = parseConversationalSearchQuery('Show me affordable products');
  assert.equal(affordable.isConversational, true);
  assert.equal(affordable.intent, 'affordable');
  assert.equal(affordable.sortBy, 'price_asc');
  assert.ok(affordable.tokens.length > 0);

  // 2. "I need a product for daily use"
  const dailyUse = parseConversationalSearchQuery('I need a product for daily use');
  assert.equal(dailyUse.isConversational, true);
  assert.equal(dailyUse.intent, 'daily_use');
  assert.ok(dailyUse.tokens.length > 0);

  // 3. "Show products similar to the one I viewed"
  const similar = parseConversationalSearchQuery('Show products similar to the one I viewed');
  assert.equal(similar.isConversational, true);
  assert.equal(similar.intent, 'similar');

  // 4. "Show me premium quality products"
  const premium = parseConversationalSearchQuery('Show me premium quality products');
  assert.equal(premium.isConversational, true);
  assert.equal(premium.intent, 'premium');
  assert.equal(premium.sortBy, 'rating');

  // 5. "Products under 2000" / "under ৳5000"
  const under2000 = parseConversationalSearchQuery('Products under 2000');
  assert.equal(under2000.isConversational, true);
  assert.equal(under2000.maxPrice, 2000);

  const under5000 = parseConversationalSearchQuery('under ৳5000');
  assert.equal(under5000.isConversational, true);
  assert.equal(under5000.maxPrice, 5000);

  // 6. Category extraction: "Find products from electronics"
  const categorySearch = parseConversationalSearchQuery('Find products from electronics');
  assert.equal(categorySearch.isConversational, true);
  assert.equal(categorySearch.targetCategory, 'Electronics');

  // 7. Bangla conversational: "কম দামে জুতা দেখান"
  const banglaSearch = parseConversationalSearchQuery('কম দামে জুতা দেখান');
  assert.equal(banglaSearch.isConversational, true);
  assert.equal(banglaSearch.intent, 'affordable');
  assert.ok(banglaSearch.tokens.includes('shoes') || banglaSearch.tokens.includes('জুতা'));

  // 8. Standard non-conversational single keyword: "earbuds"
  const standardSearch = parseConversationalSearchQuery('earbuds');
  assert.equal(standardSearch.isConversational, false);
  assert.equal(standardSearch.cleanedQuery, 'earbuds');
  assert.ok(standardSearch.tokens.includes('earbuds'));
});




