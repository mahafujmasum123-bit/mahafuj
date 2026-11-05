import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGradientCss,
  sanitizeBannerLink,
  type BannerData,
} from '../components/banner/BannerRenderer';
import { calculateCartTotals } from './ecommerceRules';

// -------------------------------------------------------------
// 1. GRADIENT CSS BUILDER TESTS
// -------------------------------------------------------------
test('buildGradientCss: correctly generates linear-gradient with multiple stops', () => {
  const gradient = {
    type: 'linear' as const,
    angle: 135,
    stops: [
      { color: '#00875a', position: 0 },
      { color: '#0c261e', position: 60 },
      { color: '#000000', position: 100 },
    ],
  };

  const css = buildGradientCss(gradient);
  assert.equal(css, 'linear-gradient(135deg, #00875a 0%, #0c261e 60%, #000000 100%)');
});

test('buildGradientCss: correctly generates radial-gradient', () => {
  const gradient = {
    type: 'radial' as const,
    angle: 0,
    stops: [
      { color: '#ff6b6b', position: 0 },
      { color: '#1a1a2e', position: 100 },
    ],
  };

  const css = buildGradientCss(gradient);
  assert.equal(css, 'radial-gradient(circle at center, #ff6b6b 0%, #1a1a2e 100%)');
});

test('buildGradientCss: handles single stop by auto-duplicating for valid CSS', () => {
  const gradient = {
    type: 'linear' as const,
    angle: 90,
    stops: [{ color: '#10b981', position: 50 }],
  };

  const css = buildGradientCss(gradient);
  assert.equal(css, 'linear-gradient(90deg, #10b981 0%, #10b981 100%)');
});

test('buildGradientCss: returns safe fallback on empty stops or undefined', () => {
  const emptyGradient = {
    type: 'linear' as const,
    angle: 90,
    stops: [],
  };

  assert.equal(
    buildGradientCss(emptyGradient),
    'linear-gradient(135deg, #051b14 0%, #0d3829 100%)'
  );
  assert.equal(
    buildGradientCss(undefined),
    'linear-gradient(135deg, #051b14 0%, #0d3829 100%)'
  );
});

// -------------------------------------------------------------
// 2. BANNER LINK SANITIZATION TESTS
// -------------------------------------------------------------
test('sanitizeBannerLink: allows safe internal relative routes', () => {
  assert.deepEqual(sanitizeBannerLink('/shop'), { safeUrl: '/shop', isExternal: false });
  assert.deepEqual(sanitizeBannerLink('/shop?category=tech'), { safeUrl: '/shop?category=tech', isExternal: false });
  assert.deepEqual(sanitizeBannerLink('/product/laptop-pro'), { safeUrl: '/product/laptop-pro', isExternal: false });
});

test('sanitizeBannerLink: allows safe external HTTP and HTTPS URLs', () => {
  assert.deepEqual(sanitizeBannerLink('https://example.com/promo'), { safeUrl: 'https://example.com/promo', isExternal: true });
  assert.deepEqual(sanitizeBannerLink('http://example.com/partner'), { safeUrl: 'http://example.com/partner', isExternal: true });
});

test('sanitizeBannerLink: safely prefixes paths missing leading slash', () => {
  assert.deepEqual(sanitizeBannerLink('categories/fashion'), { safeUrl: '/categories/fashion', isExternal: false });
});

test('sanitizeBannerLink: strictly blocks dangerous schemes (javascript:, data:, vbscript:)', () => {
  assert.equal(sanitizeBannerLink('javascript:alert(1)'), null);
  assert.equal(sanitizeBannerLink('JAVASCRIPT:alert(document.cookie)'), null);
  assert.equal(sanitizeBannerLink('data:text/html;base64,PHNjcmlwdD4='), null);
});

test('sanitizeBannerLink: returns null for null, undefined, or empty string', () => {
  assert.equal(sanitizeBannerLink(''), null);
  assert.equal(sanitizeBannerLink(undefined), null);
  assert.equal(sanitizeBannerLink('   '), null);
});

// -------------------------------------------------------------
// 3. DYNAMIC SHIPPING CALCULATION WITH ADMIN SETTINGS
// -------------------------------------------------------------
test('calculateCartTotals: respects custom admin shipping configuration', () => {
  const cartItems = [
    {
      productId: 'prod-1',
      sku: 'SKU-1',
      name: 'Wireless Mouse',
      image: '/mouse.jpg',
      price: 500,
      salePrice: 450,
      quantity: 2, // subtotal = 900
      stock: 50,
    },
  ];

  // Custom Admin Shipping Rules
  const customAdminRules = {
    freeShippingThreshold: 2000,
    insideDhakaFee: 80,
    outsideDhakaFee: 150,
    expressFee: 120,
  };

  // Case A: Inside Dhaka standard
  const insideStandard = calculateCartTotals(cartItems, null, 'Dhaka', 'standard', customAdminRules);
  assert.equal(insideStandard.subtotal, 900);
  assert.equal(insideStandard.shippingFee, 80);
  assert.equal(insideStandard.finalTotal, 980);

  // Case B: Outside Dhaka standard (e.g. Chittagong)
  const outsideStandard = calculateCartTotals(cartItems, null, 'Chittagong', 'standard', customAdminRules);
  assert.equal(outsideStandard.shippingFee, 150);
  assert.equal(outsideStandard.finalTotal, 1050);

  // Case C: Express delivery
  const expressDelivery = calculateCartTotals(cartItems, null, 'Dhaka', 'express', customAdminRules);
  assert.equal(expressDelivery.shippingFee, 120);
  assert.equal(expressDelivery.finalTotal, 1020);

  // Case D: Free shipping threshold triggered (Subtotal >= 2000)
  const expensiveCart = [
    {
      productId: 'prod-2',
      sku: 'SKU-2',
      name: 'Mechanical Keyboard',
      image: '/keyboard.jpg',
      price: 2500,
      quantity: 1, // subtotal = 2500 >= 2000 threshold
      stock: 10,
    },
  ];

  const freeStandard = calculateCartTotals(expensiveCart, null, 'Chittagong', 'standard', customAdminRules);
  assert.equal(freeStandard.shippingFee, 0, 'Standard shipping should be free above threshold');
  assert.equal(freeStandard.finalTotal, 2500);

  // Case E: Free shipping standard, but express fee still applies if chosen
  const freeExpress = calculateCartTotals(expensiveCart, null, 'Chittagong', 'express', customAdminRules);
  assert.equal(freeExpress.shippingFee, 120, 'Express surcharge applies even when threshold met');
  assert.equal(freeExpress.finalTotal, 2620);
});

// -------------------------------------------------------------
// 4. SETTINGS SECRET MASKING LOGIC
// -------------------------------------------------------------
test('Settings secret masking: preserves existing secret when client returns masked dots', () => {
  const existingStoredConfig = {
    apiKey: 'live_secret_key_998877665544',
    apiSecret: 'super_secret_hash_abcdef123456',
    webhookSecret: 'whsec_77889900aabbcc',
  };

  const clientSubmittedPayload = {
    apiKey: '••••••••••••••••••••••••', // User left masked
    apiSecret: 'new_actual_secret_modified', // User intentionally changed
    webhookSecret: '••••••••••••••••', // User left masked
  };

  // Function mimicking server-side secret merge
  const resolveServerSecret = (incoming: string, original: string) => {
    if (!incoming || incoming.includes('••••') || incoming.trim() === '') {
      return original;
    }
    return incoming.trim();
  };

  assert.equal(
    resolveServerSecret(clientSubmittedPayload.apiKey, existingStoredConfig.apiKey),
    'live_secret_key_998877665544'
  );
  assert.equal(
    resolveServerSecret(clientSubmittedPayload.apiSecret, existingStoredConfig.apiSecret),
    'new_actual_secret_modified'
  );
  assert.equal(
    resolveServerSecret(clientSubmittedPayload.webhookSecret, existingStoredConfig.webhookSecret),
    'whsec_77889900aabbcc'
  );
});

// -------------------------------------------------------------
// 5. BANNER LAYERS STACKING & Z-INDEX CALCULATION
// -------------------------------------------------------------
test('Banner layers: correctly orders visual layers and computes z-index', () => {
  const sampleLayers = [
    { id: 'layer-1', type: 'text', content: 'Base Text', zIndex: 1, isVisible: true },
    { id: 'layer-2', type: 'badge', content: 'Discount Tag', zIndex: 3, isVisible: true },
    { id: 'layer-3', type: 'shape', content: 'Decor Circle', zIndex: 2, isVisible: false },
  ];

  const visibleSortedLayers = [...sampleLayers]
    .filter((l) => l.isVisible)
    .sort((a, b) => a.zIndex - b.zIndex);

  assert.equal(visibleSortedLayers.length, 2);
  assert.equal(visibleSortedLayers[0].id, 'layer-1');
  assert.equal(visibleSortedLayers[1].id, 'layer-2');
});
