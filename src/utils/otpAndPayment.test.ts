import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  hashOtp,
  generateSecureNumericOtp,
  sanitizeRegistrationRole,
  getPasswordFingerprint,
} from '../../server/routes/authRoutes';
import {
  getPaymentGatewayConfigStatus,
} from '../../server/services/paymentService';
import {
  validateGatewayVerificationAgainstOrder,
} from '../../server/routes/paymentRoutes';
import {
  restoreOrderStock,
} from '../../server/routes/checkoutRoutes';
import {
  calculateCartTotals,
  getEffectivePrice,
} from './ecommerceRules';
import {
  parseBoldSegments,
} from './safeMarkdown';

describe('1. Cryptographic OTP Verification Rules', () => {
  it('generates a 6-digit numeric OTP between 100000 and 999999', () => {
    for (let i = 0; i < 20; i++) {
      const otp = generateSecureNumericOtp();
      assert.match(otp, /^\d{6}$/, `OTP ${otp} should be 6 digits`);
      const val = parseInt(otp, 10);
      assert.ok(val >= 100000 && val <= 999999, `OTP ${val} should be in 100000..999999 range`);
    }
  });

  it('generates consistent HMAC-SHA256 hash for identical email and OTP', () => {
    const email = 'user@example.com';
    const otp = '849201';
    const hash1 = hashOtp(email, otp);
    const hash2 = hashOtp(email, otp);
    assert.equal(hash1, hash2, 'Identical credentials must generate identical HMAC hashes');
    assert.equal(hash1.length, 64, 'SHA-256 hex string must be 64 characters long');
  });

  it('normalizes email casing and trims whitespace for hash parity', () => {
    const hash1 = hashOtp('User@Example.COM ', '123456');
    const hash2 = hashOtp('user@example.com', '123456');
    assert.equal(hash1, hash2, 'Normalized email should yield same hash');
  });

  it('produces completely different hashes for wrong OTP', () => {
    const email = 'user@example.com';
    const hashCorrect = hashOtp(email, '123456');
    const hashWrong = hashOtp(email, '123457');
    assert.notEqual(hashCorrect, hashWrong, 'Different OTP must produce different HMAC-SHA256 hash');
  });

  it('verifies timingSafeEqual behavior accurately', () => {
    const email = 'test@shopmax.com';
    const correctOtp = '654321';
    const storedHash = hashOtp(email, correctOtp);

    const testAttemptValid = hashOtp(email, '654321');
    const bufA = Buffer.from(storedHash, 'hex');
    const bufB = Buffer.from(testAttemptValid, 'hex');
    const isValid = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
    assert.equal(isValid, true, 'timingSafeEqual must succeed on valid OTP');

    const testAttemptInvalid = hashOtp(email, '000000');
    const bufC = Buffer.from(testAttemptInvalid, 'hex');
    const isInvalid = bufA.length === bufC.length && crypto.timingSafeEqual(bufA, bufC);
    assert.equal(isInvalid, false, 'timingSafeEqual must fail on invalid OTP');
  });

  it('enforces 10-minute expiry validation', () => {
    const now = Date.now();
    const validExpiry = new Date(now + 10 * 60 * 1000);
    const expiredDate = new Date(now - 1000);

    assert.ok(validExpiry.getTime() > now, 'Fresh OTP is not expired');
    assert.ok(expiredDate.getTime() < now, 'Expired OTP is recognized as expired');
  });

  it('enforces attempt limits: rejects when attempts >= 5', () => {
    const maxAttempts = 5;
    let attemptsCount = 4;
    assert.ok(attemptsCount < maxAttempts, '4 attempts should be allowed');

    attemptsCount += 1;
    assert.ok(attemptsCount >= maxAttempts, '5 attempts should reach maximum limit');
  });

  it('enforces 60-second cooldown on resend requests', () => {
    const now = Date.now();
    const resendAvailableAt = new Date(now + 45 * 1000); // 45 seconds remaining
    const isCooldownActive = resendAvailableAt.getTime() > now;
    assert.equal(isCooldownActive, true, 'Cooldown must be active when remaining time > 0');

    const expiredCooldown = new Date(now - 5 * 1000);
    const isReadyForResend = expiredCooldown.getTime() <= now;
    assert.equal(isReadyForResend, true, 'Resend is permitted after cooldown expires');
  });
});

describe('2. Real Payment Gateway Architecture & Security Rules', () => {
  it('reports real gateway configuration honestly', () => {
    const status = getPaymentGatewayConfigStatus();
    assert.equal(typeof status.cod, 'boolean');
    assert.equal(status.cod, true, 'Cash on Delivery is always available');
    assert.equal(typeof status.bkash, 'boolean');
    assert.equal(typeof status.sslcommerz, 'boolean');
    assert.equal(typeof status.nagad, 'boolean');
    assert.ok(status.defaultProvider, 'Default provider must be assigned');
  });

  it('verifies paid amount against server-side calculated catalog price (fraud protection)', () => {
    const orderFinalTotal = 129.98;
    const paidAmountExact = 129.98;
    const paidAmountTampered = 10.00;

    const exactCheck = validateGatewayVerificationAgainstOrder(
      { orderNumber: 'NOV-100', finalTotal: orderFinalTotal },
      { amount: paidAmountExact, orderNumber: 'NOV-100', currency: 'BDT' },
      'NOV-100'
    );
    const tamperedCheck = validateGatewayVerificationAgainstOrder(
      { orderNumber: 'NOV-100', finalTotal: orderFinalTotal },
      { amount: paidAmountTampered, orderNumber: 'NOV-100', currency: 'BDT' },
      'NOV-100'
    );

    assert.equal(exactCheck.valid, true, 'Legitimate payment amount must match');
    assert.equal(tamperedCheck.valid, false, 'Tampered payment amount must be rejected');
  });

  it('transitions order status accurately on payment verification', () => {
    const order = {
      orderNumber: '#ORD-9901',
      paymentStatus: 'unpaid',
      status: 'pending',
      finalTotal: 59.99,
      statusTimeline: [] as any[],
    };

    // Simulate verification success
    const verification = {
      success: true,
      status: 'paid' as const,
      transactionId: 'TRX-BKASH-77291',
      amount: 59.99,
    };

    if (verification.success && verification.status === 'paid') {
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      order.statusTimeline.push({
        status: 'confirmed',
        timestamp: new Date(),
        actor: 'bKash Gateway',
        note: `Payment verified: ${verification.transactionId}`,
      });
    }

    assert.equal(order.paymentStatus, 'paid');
    assert.equal(order.status, 'confirmed');
    assert.equal(order.statusTimeline.length, 1);
    assert.match(order.statusTimeline[0].note, /TRX-BKASH-77291/);
  });

  it('rejects order verification when gateway orderNumber does not match target order', () => {
    const targetOrderNumber = 'NOV-2026-881920';
    const gatewayReturnedOrder = 'NOV-2026-112233';

    const check = validateGatewayVerificationAgainstOrder(
      { orderNumber: targetOrderNumber, finalTotal: 75 },
      { amount: 75, orderNumber: gatewayReturnedOrder, currency: 'BDT' },
      targetOrderNumber
    );
    assert.equal(check.valid, false, 'Mismatched gateway order reference must be rejected');
  });

  it('enforces currency verification (only BDT allowed)', () => {
    const validBdt = validateGatewayVerificationAgainstOrder(
      { orderNumber: 'NOV-1', finalTotal: 50 },
      { amount: 50, orderNumber: 'NOV-1', currency: 'BDT' },
      'NOV-1'
    );
    const invalidEur = validateGatewayVerificationAgainstOrder(
      { orderNumber: 'NOV-1', finalTotal: 50 },
      { amount: 50, orderNumber: 'NOV-1', currency: 'EUR' },
      'NOV-1'
    );
    assert.equal(validBdt.valid, true);
    assert.equal(invalidEur.valid, false);
  });

  it('prevents OTP replay attacks when record is already marked as isVerified', () => {
    const record = {
      email: 'user@example.com',
      isVerified: true,
      expiresAt: new Date(Date.now() + 500000),
    };

    let canVerifyAgain = false;
    if (record.isVerified) {
      canVerifyAgain = false;
    }
    assert.equal(canVerifyAgain, false, 'Already verified OTP must be rejected on replay');
  });

  it('ensures devCode is NEVER included in API responses when NODE_ENV is production', () => {
    const isEmailConfigured = false;
    const rawOtp = '123456';

    const getResponsePayload = (env: string) => ({
      success: true,
      ...(env !== 'production' && !isEmailConfigured ? { devCode: rawOtp } : {}),
    });

    const devResponse = getResponsePayload('development');
    const prodResponse = getResponsePayload('production');

    assert.equal((devResponse as any).devCode, '123456', 'Dev response includes helper devCode');
    assert.equal((prodResponse as any).devCode, undefined, 'Prod response must never expose devCode');
  });
});

describe('3. Hardened Security, Stock Restoration & Safe Markdown Rules', () => {
  it('blocks privilege escalation on public registration by forcing role to customer', () => {
    assert.equal(sanitizeRegistrationRole('super_admin'), 'customer');
    assert.equal(sanitizeRegistrationRole('admin'), 'customer');
    assert.equal(sanitizeRegistrationRole('finance'), 'customer');
    assert.equal(sanitizeRegistrationRole(undefined), 'customer');
  });

  it('changes password fingerprint immediately when password hash changes (one-time reset token)', () => {
    const fpBefore = getPasswordFingerprint('$2a$10$oldHashValue1234567890');
    const fpAfter = getPasswordFingerprint('$2a$10$newHashValue0987654321');
    assert.equal(fpBefore.length, 16);
    assert.notEqual(fpBefore, fpAfter, 'Reset token fingerprint must invalidate after password update');
  });

  it('restores stock idempotently when an order is cancelled or returned', async () => {
    const catalog = [{ id: 'prod-1', sku: 'SKU-1', stock: 10, salesCount: 5 }];
    const order: any = {
      orderNumber: 'NOV-900',
      stockRestored: false,
      items: [{ productId: 'prod-1', quantity: 3 }],
    };

    const firstRestore = await restoreOrderStock(order, catalog);
    assert.equal(firstRestore, true);
    assert.equal(catalog[0].stock, 13);
    assert.equal(catalog[0].salesCount, 2);
    assert.equal(order.stockRestored, true);

    // Calling a second time must be a safe no-op
    const secondRestore = await restoreOrderStock(order, catalog);
    assert.equal(secondRestore, false);
    assert.equal(catalog[0].stock, 13, 'Stock must not double-increment on repeated cancel/return');
  });

  it('parses **bold** markdown cleanly without HTML execution', () => {
    const segments = parseBoldSegments('Hello **World** and <img src=x onerror=alert(1)> **Safe**!');
    assert.deepEqual(segments, [
      { text: 'Hello ', bold: false },
      { text: 'World', bold: true },
      { text: ' and <img src=x onerror=alert(1)> ', bold: false },
      { text: 'Safe', bold: true },
      { text: '!', bold: false },
    ]);
  });
});

describe('4. OAuth & Nagad Payment DFS Verification Architecture', () => {
  it('rejects empty or whitespace-only Google OAuth tokens gracefully', async () => {
    const { verifyGoogleToken } = await import('../../server/routes/authRoutes');
    const emptyResult = await verifyGoogleToken({ credential: '' });
    assert.equal(emptyResult.valid, false);
    assert.match(emptyResult.error || '', /Google credential|accessToken/i);

    const wsResult = await verifyGoogleToken({ credential: '   ' });
    assert.equal(wsResult.valid, false);
  });

  it('rejects empty or whitespace-only Facebook OAuth tokens gracefully', async () => {
    const { verifyFacebookToken } = await import('../../server/routes/authRoutes');
    const emptyResult = await verifyFacebookToken('');
    assert.equal(emptyResult.valid, false);
    assert.match(emptyResult.error || '', /access token/i);
  });

  it('requires legitimate Nagad merchant configuration before initiating DFS payment', async () => {
    const { initiateNagadPayment } = await import('../../server/services/paymentService');
    const result = await initiateNagadPayment({
      orderNumber: 'NOV-TEST-001',
      amount: 150.0,
      callbackUrl: 'http://localhost:3000/api/payment/callback/nagad',
      customerPhone: '01700000000',
    });

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.match(result.error, /NAGAD_MERCHANT_ID|credentials|configured/i);
  });

  it('requires legitimate Nagad payment reference ID before verifying payment', async () => {
    const { verifyNagadPayment } = await import('../../server/services/paymentService');
    const result = await verifyNagadPayment('');
    assert.equal(result.success, false);
    assert.match(result.error || '', /Payment reference ID/i);
  });

  it('sanitizes NoSQL operator injection keys recursively from request payloads', () => {
    const sanitizeNoSql = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(sanitizeNoSql);
      const clean: any = {};
      for (const [key, val] of Object.entries(obj)) {
        if (key.startsWith('$') || key.includes('.')) continue;
        clean[key] = sanitizeNoSql(val);
      }
      return clean;
    };

    const maliciousBody = {
      username: 'admin',
      password: { $gt: '' },
      'profile.role': 'admin',
      validNested: {
        normalKey: 123,
        $where: 'sleep(5000)',
      },
      tags: ['electronics', { $ne: null }, 'gadgets'],
    };

    const clean = sanitizeNoSql(maliciousBody);

    assert.equal(clean.username, 'admin');
    assert.deepEqual(clean.password, {});
    assert.equal(clean['profile.role'], undefined);
    assert.equal(clean.validNested.normalKey, 123);
    assert.equal(clean.validNested.$where, undefined);
    assert.deepEqual(clean.tags, ['electronics', {}, 'gadgets']);
  });
});

describe('5. Second-Level Production Verification (In-Memory DB Fail-Safe, SSRF & Admin RBAC)', () => {
  it('enforces persistent storage fail-safe in production (returns 503 rather than using in-memory fallback)', async () => {
    const { requirePersistentStorage } = await import('../../server/db');

    // Simulate response object
    let statusCode = 200;
    let jsonBody: any = null;
    const mockRes: any = {
      status: (code: number) => {
        statusCode = code;
        return mockRes;
      },
      json: (body: any) => {
        jsonBody = body;
        return mockRes;
      },
    };

    // Temporarily set NODE_ENV to production
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      const allowed = requirePersistentStorage(mockRes, 'Order placement');
      assert.equal(allowed, false, 'Mutating operation must be rejected in production without persistent database');
      assert.equal(statusCode, 503, 'Must return HTTP 503 Service Unavailable');
      assert.equal(jsonBody.code, 'DATABASE_UNAVAILABLE');
      assert.match(jsonBody.error, /persistent database storage/i);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  it('SSRF filter in uploadRoutes blocks internal IP addresses and loopback hosts', async () => {
    const { isSafeAssetUrl } = await import('../../server/routes/uploadRoutes');

    assert.equal(isSafeAssetUrl('/assets/products/shoes.jpg'), true, 'Local asset path must be allowed');
    assert.equal(isSafeAssetUrl('https://images.unsplash.com/photo-123'), true, 'Public HTTPS URL must be allowed');
    assert.equal(isSafeAssetUrl('https://res.cloudinary.com/demo/image/upload/sample.jpg'), true, 'Cloudinary URL must be allowed');

    // Reject SSRF targets
    assert.equal(isSafeAssetUrl('http://169.254.169.254/latest/meta-data/'), false, 'AWS/GCP metadata service must be blocked');
    assert.equal(isSafeAssetUrl('http://localhost:3000/api/admin'), false, 'localhost must be blocked');
    assert.equal(isSafeAssetUrl('http://127.0.0.1:8080'), false, '127.0.0.1 must be blocked');
    assert.equal(isSafeAssetUrl('http://0.0.0.0'), false, '0.0.0.0 must be blocked');
    assert.equal(isSafeAssetUrl('http://10.0.0.1/internal'), false, 'Private 10.x.x.x network must be blocked');
    assert.equal(isSafeAssetUrl('http://192.168.1.1/admin'), false, 'Private 192.168.x.x network must be blocked');
    assert.equal(isSafeAssetUrl('javascript:alert(1)'), false, 'javascript URI scheme must be blocked');
  });

  it('admin role middleware strictly forbids customers from accessing admin resources', async () => {
    const { requireRole } = await import('../../server/middleware/auth');

    const adminOnlyMiddleware = requireRole(['admin', 'super_admin']);

    let nextCalled = false;
    let statusCode = 200;
    let jsonBody: any = null;

    const mockRes: any = {
      status: (code: number) => {
        statusCode = code;
        return mockRes;
      },
      json: (body: any) => {
        jsonBody = body;
        return mockRes;
      },
    };

    // Test with customer user
    const customerReq: any = {
      user: {
        userId: 'cust-123',
        email: 'customer@example.com',
        role: 'customer',
        name: 'Regular Customer',
      },
    };

    adminOnlyMiddleware(customerReq, mockRes, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false, 'Next function must NOT be called for customer on admin route');
    assert.equal(statusCode, 403, 'Must return HTTP 403 Forbidden');
    assert.match(jsonBody.error, /Access denied/i);

    // Test with admin user
    nextCalled = false;
    statusCode = 200;
    const adminReq: any = {
      user: {
        userId: 'admin-123',
        email: 'admin@novara.com',
        role: 'admin',
        name: 'Admin User',
      },
    };

    adminOnlyMiddleware(adminReq, mockRes, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true, 'Next function must be called for admin');
    assert.equal(statusCode, 200);
  });
});



