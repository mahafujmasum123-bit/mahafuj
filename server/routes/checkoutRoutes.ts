import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { inMemoryProducts } from './productRoutes';
import { ProductModel } from '../models/Product';
import { OrderModel, IOrder } from '../models/Order';
import { CouponModel } from '../models/Coupon';
import { INITIAL_COUPONS } from '../data/initialData';
import { calculateCartTotals, getEffectivePrice } from '../../src/utils/ecommerceRules';
import { validateBdLocation } from '../data/bangladeshLocations';
import { isDbConnected, isProduction, requirePersistentStorage } from '../db';
import { getActiveSettings } from '../models/Settings';

const router = Router();
let inMemoryOrders: any[] = [
  {
    id: 'ord-1256',
    orderNumber: '#ORD-1256',
    customerId: 'cust-1256',
    customerName: 'Rahim Khan',
    customerEmail: 'rahim.khan@example.com',
    customerPhone: '+880 1711 234567',
    currency: 'BDT',
    items: [
      {
        productId: 'prod-1',
        sku: 'NOV-AUD-001',
        name: 'Soundcore Life Q30 Wireless Noise Cancelling Headphones',
        price: 11999,
        salePrice: 8999,
        effectivePrice: 8999,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80',
      },
    ],
    subtotal: 8999,
    discount: 0,
    shippingFee: 0,
    tax: 0,
    finalTotal: 8999,
    shippingAddress: {
      name: 'Rahim Khan',
      phone: '+880 1711 234567',
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Gulshan',
      unionWard: 'Gulshan 2',
      street: 'Road 11, House 24',
    },
    paymentMethod: 'bkash',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: new Date('2025-03-16T14:20:00Z'),
    updatedAt: new Date('2025-03-16T15:00:00Z'),
  },
  {
    id: 'ord-1255',
    orderNumber: '#ORD-1255',
    customerId: 'cust-1255',
    customerName: 'Ayesha Akter',
    customerEmail: 'ayesha.akter@example.com',
    customerPhone: '+880 1812 345678',
    currency: 'BDT',
    items: [
      {
        productId: 'prod-2',
        sku: 'NOV-WCH-002',
        name: 'Smart Watch Pro',
        price: 10999,
        salePrice: 8279,
        effectivePrice: 8279,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
      },
    ],
    subtotal: 8279,
    discount: 0,
    shippingFee: 0,
    tax: 0,
    finalTotal: 8279,
    shippingAddress: {
      name: 'Ayesha Akter',
      phone: '+880 1812 345678',
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Banani',
      unionWard: 'Block A-F',
      street: 'Block E, Road 4',
    },
    paymentMethod: 'sslcommerz',
    paymentStatus: 'paid',
    status: 'processing',
    createdAt: new Date('2025-03-16T11:45:00Z'),
    updatedAt: new Date('2025-03-16T12:00:00Z'),
  },
  {
    id: 'ord-1254',
    orderNumber: '#ORD-1254',
    customerId: 'cust-1254',
    customerName: 'Tanvir Hasan',
    customerEmail: 'tanvir.hasan@example.com',
    customerPhone: '+880 1913 456789',
    currency: 'BDT',
    items: [
      {
        productId: 'prod-3',
        sku: 'NOV-BAG-003',
        name: 'Urban Explorer Backpack',
        price: 5999,
        salePrice: 5999,
        effectivePrice: 5999,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
      },
    ],
    subtotal: 5999,
    discount: 0,
    shippingFee: 0,
    tax: 0,
    finalTotal: 5999,
    shippingAddress: {
      name: 'Tanvir Hasan',
      phone: '+880 1913 456789',
      division: 'Chattogram',
      district: 'Chattogram',
      upazila: 'Double Mooring',
      unionWard: 'Ward 24 (Agrabad)',
      street: 'Commercial Area 12',
    },
    paymentMethod: 'cod',
    paymentStatus: 'unpaid',
    status: 'pending',
    createdAt: new Date('2025-03-15T16:30:00Z'),
    updatedAt: new Date('2025-03-15T16:30:00Z'),
  },
  {
    id: 'ord-1253',
    orderNumber: '#ORD-1253',
    customerId: 'cust-1253',
    customerName: 'Shanta Islam',
    customerEmail: 'shanta.islam@example.com',
    customerPhone: '+880 1614 567890',
    currency: 'BDT',
    items: [
      {
        productId: 'prod-4',
        sku: 'NOV-SHOE-004',
        name: 'Air Flow Running Shoes',
        price: 8399,
        salePrice: 8399,
        effectivePrice: 8399,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
      },
    ],
    subtotal: 8399,
    discount: 0,
    shippingFee: 0,
    tax: 0,
    finalTotal: 8399,
    shippingAddress: {
      name: 'Shanta Islam',
      phone: '+880 1614 567890',
      division: 'Sylhet',
      district: 'Sylhet',
      upazila: 'Sylhet Sadar',
      unionWard: 'Ward 1-5',
      street: 'Main Road, Zindabazar',
    },
    paymentMethod: 'bkash',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: new Date('2025-03-15T09:15:00Z'),
    updatedAt: new Date('2025-03-15T10:00:00Z'),
  },
  {
    id: 'ord-1252',
    orderNumber: '#ORD-1252',
    customerId: 'cust-1252',
    customerName: 'Nusrat Jahan',
    customerEmail: 'nusrat.jahan@example.com',
    customerPhone: '+880 1515 678901',
    currency: 'BDT',
    items: [
      {
        productId: 'prod-5',
        sku: 'NOV-GLS-005',
        name: 'Aviator Sunglasses',
        price: 3599,
        salePrice: 3599,
        effectivePrice: 3599,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',
      },
    ],
    subtotal: 3599,
    discount: 0,
    shippingFee: 0,
    tax: 0,
    finalTotal: 3599,
    shippingAddress: {
      name: 'Nusrat Jahan',
      phone: '+880 1515 678901',
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Uttara',
      unionWard: 'Sector 1-4 (Ward 1)',
      street: 'Sector 3, Road 7',
    },
    paymentMethod: 'cod',
    paymentStatus: 'unpaid',
    status: 'cancelled',
    createdAt: new Date('2025-03-14T18:00:00Z'),
    updatedAt: new Date('2025-03-14T18:30:00Z'),
  },
  {
    id: 'ord-seed-1',
    orderNumber: 'NOV-2025-108249',
    customerId: 'user-customer',
    customerName: 'Sarah Khan',
    customerEmail: 'customer@example.com',
    customerPhone: '+880 1812 345678',
    currency: 'BDT',
    items: [
      {
        productId: 'prod-1',
        sku: 'NOV-AUD-001',
        name: 'Wireless Headphones',
        price: 11999,
        salePrice: 8999,
        effectivePrice: 8999,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80',
      },
      {
        productId: 'prod-2',
        sku: 'NOV-WCH-002',
        name: 'Smart Watch',
        price: 10999,
        salePrice: 8279,
        effectivePrice: 8279,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
      },
    ],
    subtotal: 17278,
    discount: 1728,
    couponCode: 'SAVE10',
    shippingFee: 0,
    tax: 0,
    finalTotal: 15550,
    shippingAddress: {
      name: 'Sarah Khan',
      phone: '+880 1812 345678',
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Dhanmondi',
      unionWard: 'Ward 15',
      street: 'House 42, Road 9/A',
      landmark: 'Opposite Dhanmondi Lake',
    },
    paymentMethod: 'cod',
    paymentStatus: 'unpaid',
    status: 'pending',
    statusTimeline: [
      {
        status: 'pending',
        timestamp: new Date(Date.now() - 3600000 * 4),
        actor: 'Sarah Khan',
        note: 'Order placed via Cash on Delivery',
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 4),
    updatedAt: new Date(Date.now() - 3600000 * 4),
  },
  {
    id: 'ord-seed-2',
    orderNumber: 'NOV-2025-104921',
    customerId: 'user-guest-sample',
    customerName: 'Rafiul Islam',
    customerEmail: 'rafiul@example.com',
    customerPhone: '+880 1712 998877',
    currency: 'BDT',
    items: [
      {
        productId: 'prod-4',
        sku: 'NOV-SHOE-004',
        name: 'Running Shoes',
        price: 8399,
        salePrice: 8399,
        effectivePrice: 8399,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
      },
    ],
    subtotal: 8399,
    discount: 0,
    shippingFee: 60,
    tax: 0,
    finalTotal: 8459,
    shippingAddress: {
      name: 'Rafiul Islam',
      phone: '+880 1712 998877',
      division: 'Chattogram',
      district: 'Chattogram',
      upazila: 'Double Mooring',
      unionWard: 'Ward 24 (Agrabad)',
      street: 'Commercial Area, Block C',
      landmark: 'Near Standard Chartered Bank',
    },
    paymentMethod: 'bkash',
    paymentStatus: 'paid',
    status: 'delivered',
    statusTimeline: [
      {
        status: 'pending',
        timestamp: new Date(Date.now() - 86400000 * 3),
        actor: 'Rafiul Islam',
        note: 'Order placed via bKash',
      },
      {
        status: 'confirmed',
        timestamp: new Date(Date.now() - 86400000 * 3 + 1800000),
        actor: 'Novara Admin',
        note: 'Payment verified with bKash TXN-99824',
      },
      {
        status: 'shipped',
        timestamp: new Date(Date.now() - 86400000 * 2),
        actor: 'Tariq Rahman',
        note: 'Dispatched with Paperfly Express',
      },
      {
        status: 'delivered',
        timestamp: new Date(Date.now() - 86400000 * 1),
        actor: 'Paperfly Courier Rider',
        note: 'Customer signed delivery acknowledgment',
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 3),
    updatedAt: new Date(Date.now() - 86400000 * 1),
  },
];
let inMemoryCoupons = JSON.parse(JSON.stringify(INITIAL_COUPONS));

// Price quote & validation (available to guests or authenticated users)
router.post('/quote', async (req: Request, res: Response) => {
  try {
    const { items, couponCode, division = 'Dhaka', shippingMethod = 'standard' } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'Cart has no items' });
      return;
    }

    // Verify each item against real product catalog (MongoDB primary + in-memory fallback)
    const validatedItems: any[] = [];
    for (const item of items) {
      let prod: any = null;
      if (isDbConnected()) {
        try {
          const dbProd = await ProductModel.findOne({ $or: [{ id: item.productId }, { slug: item.productId }] });
          if (dbProd) prod = dbProd.toObject();
        } catch {
          // fallback to memory
        }
      }
      if (!prod) {
        prod = inMemoryProducts.find((p) => p.id === item.productId || p.slug === item.productId);
      }
      if (!prod) {
        res.status(400).json({ success: false, error: `Product not found: ${item.name || item.productId}` });
        return;
      }

      const unitPrice = getEffectivePrice(prod.price, prod.salePrice);
      validatedItems.push({
        productId: prod.id,
        variantId: item.variantId,
        variantName: item.variantName,
        sku: prod.sku,
        name: prod.name,
        price: prod.price,
        salePrice: prod.salePrice,
        effectivePrice: unitPrice,
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
        image: prod.images[0]?.url || item.image,
        stock: prod.stock,
      });
    }

    // Lookup coupon
    let couponRule: any = null;
    if (couponCode) {
      const clean = couponCode.trim().toUpperCase();
      if (isDbConnected()) {
        try {
          const dbCoupon = await CouponModel.findOne({ code: clean, isActive: true });
          if (dbCoupon) {
            couponRule = {
              code: dbCoupon.code,
              discountType: dbCoupon.discountType,
              discountValue: dbCoupon.discountValue,
              minOrderAmount: dbCoupon.minOrderAmount || 0,
              maxDiscount: dbCoupon.maxDiscount,
              validFrom: dbCoupon.validFrom ? dbCoupon.validFrom.toISOString() : '2024-01-01',
              validTo: dbCoupon.validTo ? dbCoupon.validTo.toISOString() : '2028-12-31',
              isActive: dbCoupon.isActive,
            };
          }
        } catch (e) {
          console.warn('Coupon DB lookup failed, falling back to memory:', e);
        }
      }
      if (!couponRule) {
        const mem = inMemoryCoupons.find((c: any) => c.code.toUpperCase() === clean);
        if (mem) {
          couponRule = {
            code: mem.code,
            discountType: mem.discountType,
            discountValue: mem.discountValue,
            minOrderAmount: mem.minOrderAmount || mem.minOrderValue || 0,
            maxDiscount: mem.maxDiscount,
            validFrom: mem.validFrom || '2024-01-01',
            validTo: mem.validTo || mem.expiresAt || '2028-12-31',
            isActive: mem.isActive !== false,
          };
        }
      }
    }

    const storeSettings = await getActiveSettings();
    const totals = calculateCartTotals(validatedItems, couponRule, division, shippingMethod, {
      freeShippingThreshold: storeSettings.shipping.freeShippingThreshold,
      insideDhakaFee: storeSettings.shipping.insideDhakaFee,
      outsideDhakaFee: storeSettings.shipping.outsideDhakaFee,
      expressFee: storeSettings.shipping.expressFee,
    });

    res.json({
      success: true,
      items: validatedItems,
      ...totals,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated dynamic coupon validation for client CartDrawer & Checkout
router.get('/validate-coupon/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    if (!code) {
      res.status(400).json({ success: false, error: 'Coupon code is required' });
      return;
    }
    const clean = code.trim().toUpperCase();

    let couponRule: any = null;
    if (isDbConnected()) {
      try {
        const dbCoupon = await CouponModel.findOne({ code: clean, isActive: true });
        if (dbCoupon) {
          couponRule = {
            code: dbCoupon.code,
            discountType: dbCoupon.discountType,
            discountValue: dbCoupon.discountValue,
            minOrderAmount: dbCoupon.minOrderAmount || 0,
            maxDiscount: dbCoupon.maxDiscount,
            validFrom: dbCoupon.validFrom ? dbCoupon.validFrom.toISOString() : '2024-01-01',
            validTo: dbCoupon.validTo ? dbCoupon.validTo.toISOString() : '2028-12-31',
            isActive: dbCoupon.isActive,
          };
        }
      } catch (e) {
        console.warn('DB coupon check failed:', e);
      }
    }

    if (!couponRule) {
      const memCoupon = inMemoryCoupons.find((c: any) => c.code.toUpperCase() === clean);
      if (memCoupon) {
        couponRule = {
          code: memCoupon.code,
          discountType: memCoupon.discountType,
          discountValue: memCoupon.discountValue,
          minOrderAmount: memCoupon.minOrderAmount || memCoupon.minOrderValue || 0,
          maxDiscount: memCoupon.maxDiscount,
          validFrom: memCoupon.validFrom || '2024-01-01',
          validTo: memCoupon.validTo || memCoupon.expiresAt || '2028-12-31',
          isActive: memCoupon.isActive !== false,
        };
      }
    }

    if (!couponRule) {
      res.status(404).json({ success: false, error: `Coupon "${clean}" is invalid or does not exist.` });
      return;
    }

    if (!couponRule.isActive) {
      res.status(400).json({ success: false, error: `Coupon "${clean}" is currently inactive.` });
      return;
    }

    const now = new Date().toISOString();
    if (now < couponRule.validFrom || now > couponRule.validTo) {
      res.status(400).json({ success: false, error: `Coupon "${clean}" has expired.` });
      return;
    }

    res.json({
      success: true,
      coupon: couponRule,
      message: `Coupon "${clean}" applied successfully!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Place Order (Supports Authenticated Customers & Guest Checkout)
router.post('/place-order', async (req: Request, res: Response) => {
  try {
    if (!requirePersistentStorage(res, 'Order placement')) {
      return;
    }
    const authUser = req.user;
    const {
      items,
      contactInfo,
      shippingAddress,
      shippingMethod = 'standard',
      paymentMethod: rawPaymentMethod = 'cod',
      couponCode,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'Cannot place an order with an empty cart' });
      return;
    }

    // Determine customer email and name
    const customerEmail = (authUser?.email || contactInfo?.email || shippingAddress?.email || '').trim().toLowerCase();
    const customerPhone = (shippingAddress?.phone || contactInfo?.phone || authUser?.phone || '').trim();
    const recipientName = (shippingAddress?.name || authUser?.name || 'Valued Customer').trim();

    if (!customerEmail || !customerEmail.includes('@')) {
      res.status(400).json({
        success: false,
        error: 'A valid email address is required for order confirmation and tracking.',
      });
      return;
    }

    if (!customerPhone) {
      res.status(400).json({
        success: false,
        error: 'A contact phone number is required for delivery logistics.',
      });
      return;
    }

    // Validate Bangladesh mobile phone format (+8801... or 01...)
    const cleanPhone = customerPhone.replace(/[\s-]/g, '');
    const bdPhoneRegex = /^(?:\+?8801|01)[3-9]\d{8}$/;
    if (!bdPhoneRegex.test(cleanPhone)) {
      res.status(400).json({
        success: false,
        error: 'Please provide a valid Bangladesh mobile number (e.g. 01712345678 or +8801712345678).',
      });
      return;
    }

    const division = (shippingAddress?.division || shippingAddress?.state || 'Dhaka').trim();
    const district = (shippingAddress?.district || shippingAddress?.city || 'Dhaka').trim();
    const upazila = (shippingAddress?.upazila || shippingAddress?.thana || '').trim();
    const unionWard = (shippingAddress?.unionWard || shippingAddress?.ward || '').trim();

    // Validate 4-tier location hierarchy
    const locationValidation = validateBdLocation(division, district, upazila, unionWard);
    if (!locationValidation.valid) {
      res.status(400).json({
        success: false,
        error: locationValidation.error || 'Invalid Bangladesh delivery location selected.',
      });
      return;
    }

    const streetAddress = (shippingAddress?.address || shippingAddress?.street || '').trim();
    if (!streetAddress) {
      res.status(400).json({
        success: false,
        error: 'Street address is required.',
      });
      return;
    }

    // Validate inventory and calculate server-side prices against authoritative catalog
    const orderItemsSnapshot: any[] = [];
    const stockUpdates: { prodId: string; sku: string; memProduct?: any; qty: number }[] = [];

    for (const line of items) {
      let prod: any = null;
      const memProd = inMemoryProducts.find((p) => p.id === line.productId || p.slug === line.productId);

      if (isDbConnected()) {
        try {
          const dbProd = await ProductModel.findOne({ $or: [{ id: line.productId }, { slug: line.productId }] });
          if (dbProd) prod = dbProd.toObject();
        } catch {
          // fallback to memory
        }
      }
      if (!prod) prod = memProd;

      if (!prod) {
        res.status(400).json({ success: false, error: `Product "${line.name || line.productId}" not found` });
        return;
      }

      const requestedQty = Math.max(1, parseInt(line.quantity, 10) || 1);
      if (prod.stock < requestedQty) {
        res.status(400).json({
          success: false,
          error: `Insufficient stock for "${prod.name}". Only ${prod.stock} units available.`,
        });
        return;
      }

      const unitPrice = getEffectivePrice(prod.price, prod.salePrice);
      orderItemsSnapshot.push({
        productId: prod.id,
        variantId: line.variantId,
        variantName: line.variantName,
        sku: prod.sku,
        name: prod.name,
        unitPrice,
        quantity: requestedQty,
        total: Math.round(unitPrice * requestedQty * 100) / 100,
        image: prod.images?.[0]?.url || line.image,
      });

      stockUpdates.push({ prodId: prod.id, sku: prod.sku, memProduct: memProd, qty: requestedQty });
    }

    // Coupon lookup & validation
    let couponRule: any = null;
    if (couponCode) {
      const clean = couponCode.trim().toUpperCase();
      if (isDbConnected()) {
        try {
          const dbCoupon = await CouponModel.findOne({ code: clean, isActive: true });
          if (dbCoupon) {
            couponRule = {
              code: dbCoupon.code,
              discountType: dbCoupon.discountType,
              discountValue: dbCoupon.discountValue,
              minOrderAmount: dbCoupon.minOrderAmount || 0,
              maxDiscount: dbCoupon.maxDiscount,
              validFrom: dbCoupon.validFrom ? dbCoupon.validFrom.toISOString() : '2024-01-01',
              validTo: dbCoupon.validTo ? dbCoupon.validTo.toISOString() : '2028-12-31',
              isActive: dbCoupon.isActive,
            };
          }
        } catch (e) {
          console.warn('Coupon DB lookup failed, falling back to memory:', e);
        }
      }
      if (!couponRule) {
        const mem = inMemoryCoupons.find((c: any) => c.code.toUpperCase() === clean);
        if (mem) {
          couponRule = {
            code: mem.code,
            discountType: mem.discountType,
            discountValue: mem.discountValue,
            minOrderAmount: mem.minOrderAmount || mem.minOrderValue || 0,
            maxDiscount: mem.maxDiscount,
            validFrom: mem.validFrom || '2024-01-01',
            validTo: mem.validTo || mem.expiresAt || '2028-12-31',
            isActive: mem.isActive !== false,
          };
        }
      }
    }

    const divisionName = shippingAddress.division || shippingAddress.state || 'Dhaka';
    const storeSettings = await getActiveSettings();
    const totals = calculateCartTotals(
      orderItemsSnapshot.map((i) => ({ ...i, price: i.unitPrice, stock: 999 })),
      couponRule,
      divisionName,
      shippingMethod,
      {
        freeShippingThreshold: storeSettings.shipping.freeShippingThreshold,
        insideDhakaFee: storeSettings.shipping.insideDhakaFee,
        outsideDhakaFee: storeSettings.shipping.outsideDhakaFee,
        expressFee: storeSettings.shipping.expressFee,
      }
    );

    // Honest Payment Method Normalization & Security:
    // NEVER mark any online payment as "paid" before server-to-server gateway verification!
    const normalizedMethod = String(rawPaymentMethod || 'cod').toLowerCase().trim();
    const paymentMethod: 'cod' | 'sslcommerz' | 'bkash' | 'nagad' =
      normalizedMethod === 'bkash'
        ? 'bkash'
        : normalizedMethod === 'nagad'
        ? 'nagad'
        : normalizedMethod === 'sslcommerz' || normalizedMethod === 'card' || normalizedMethod === 'credit_card' || normalizedMethod === 'paypal'
        ? 'sslcommerz'
        : 'cod';

    const paymentStatus: 'unpaid' = 'unpaid';
    const transactionId: string | undefined = undefined;

    // Atomically decrement stock in MongoDB (if connected) with rollback on concurrent contention
    if (isDbConnected()) {
      const appliedDbDecrements: Array<{ prodId: string; qty: number }> = [];
      for (const update of stockUpdates) {
        const updatedDoc = await ProductModel.findOneAndUpdate(
          { id: update.prodId, stock: { $gte: update.qty } },
          { $inc: { stock: -update.qty, salesCount: update.qty } },
          { new: true }
        );
        if (!updatedDoc) {
          // Rollback prior decrements
          for (const prev of appliedDbDecrements) {
            await ProductModel.updateOne(
              { id: prev.prodId },
              { $inc: { stock: prev.qty, salesCount: -prev.qty } }
            );
          }
          res.status(409).json({
            success: false,
            error: 'Inventory changed while placing your order. Please review available stock and try again.',
          });
          return;
        }
        appliedDbDecrements.push({ prodId: update.prodId, qty: update.qty });
      }
    }

    // Keep in-memory catalog synchronized
    for (const update of stockUpdates) {
      if (update.memProduct) {
        update.memProduct.stock = Math.max(0, update.memProduct.stock - update.qty);
        update.memProduct.salesCount = (update.memProduct.salesCount || 0) + update.qty;
      }
    }

    // Generate unique order number
    const orderNumber = `NOV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const shippingMethodNames: Record<string, string> = {
      standard: 'Standard Shipping (3-5 business days)',
      express: 'Express Shipping (1-2 business days)',
      next_day: 'Next Day Delivery',
    };

    const newOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerId: authUser ? authUser.userId : `guest-${Date.now()}`,
      customerName: recipientName,
      customerEmail,
      customerPhone,
      items: orderItemsSnapshot,
      subtotal: totals.subtotal,
      discount: totals.discount,
      couponCode: couponRule ? couponRule.code : undefined,
      shippingFee: totals.shippingFee,
      shippingMethod,
      shippingMethodName: shippingMethodNames[shippingMethod] || 'Standard Shipping',
      tax: 0,
      finalTotal: totals.finalTotal,
      shippingAddress: {
        name: recipientName,
        phone: customerPhone,
        country: 'Bangladesh',
        city: district,
        state: division,
        postalCode: shippingAddress.postalCode || '1209',
        division,
        district,
        upazila: upazila || undefined,
        unionWard: unionWard || undefined,
        street: streetAddress,
        landmark: shippingAddress.landmark?.trim(),
      },
      paymentMethod,
      paymentStatus,
      paymentTransactionId: transactionId,
      stockRestored: false,
      status: 'pending',
      statusTimeline: [
        {
          status: 'pending',
          timestamp: new Date(),
          actor: recipientName,
          note:
            paymentMethod === 'cod'
              ? 'Order placed via Cash on Delivery'
              : `Order placed via ${paymentMethod.toUpperCase()} — awaiting gateway verification`,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isDbConnected()) {
      try {
        await OrderModel.create(newOrder);
      } catch (err: any) {
        console.error('Failed to persist order to MongoDB Atlas:', err.message);
        if (isProduction()) {
          // In production, roll back stock decrements and fail safely!
          for (const update of stockUpdates) {
            await ProductModel.updateOne(
              { id: update.prodId },
              { $inc: { stock: update.qty, salesCount: -update.qty } }
            ).catch(() => {});
          }
          res.status(503).json({
            success: false,
            error: 'Database error: Could not persist order to storage. Inventory has been safely restored.',
            code: 'DATABASE_PERSISTENCE_ERROR',
          });
          return;
        }
      }
    } else {
      inMemoryOrders.unshift(newOrder);
    }

    res.status(201).json({
      success: true,
      order: newOrder,
      requiresPaymentRedirect: paymentMethod !== 'cod',
      message: `Order #${orderNumber} successfully placed!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Idempotent stock restoration helper used by customer cancellation and admin cancelled/returned status transitions.
 * Guarantees stock is restored at most once per order across both MongoDB and in-memory catalog stores.
 */
export async function restoreOrderStock(
  order: any,
  customProductCatalog?: Array<{ id: string; sku: string; stock: number; salesCount?: number }>
): Promise<boolean> {
  if (!order || order.stockRestored) {
    return false;
  }

  order.stockRestored = true;
  const catalog = customProductCatalog || inMemoryProducts;

  for (const item of order.items || []) {
    const qty = Math.max(0, Number(item.quantity) || 0);
    if (qty <= 0) continue;

    const memProd = catalog.find((p) => p.id === item.productId || p.sku === item.sku);
    if (memProd) {
      memProd.stock += qty;
      if (typeof memProd.salesCount === 'number') {
        memProd.salesCount = Math.max(0, memProd.salesCount - qty);
      }
    }

    if (!customProductCatalog && isDbConnected()) {
      try {
        await ProductModel.updateOne(
          { $or: [{ id: item.productId }, { sku: item.sku }] },
          { $inc: { stock: qty, salesCount: -qty } }
        );
      } catch (err: any) {
        console.warn('DB stock restore warning:', err.message);
      }
    }
  }

  return true;
}

export { inMemoryOrders, inMemoryCoupons };
export default router;
