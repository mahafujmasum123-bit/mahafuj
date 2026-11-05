import { Router, Request, Response } from 'express';
import { OrderModel } from '../models/Order';
import { inMemoryOrders } from './checkoutRoutes';
import { isDbConnected, isProduction, requirePersistentStorage } from '../db';
import {
  initiateBkashPayment,
  verifyBkashPayment,
  initiateSslcommerzPayment,
  verifySslcommerzPayment,
  initiateNagadPayment,
  verifyNagadPayment,
  getPaymentGatewayConfigStatus,
} from '../services/paymentService';

const router = Router();

// Concurrency lock preventing duplicate simultaneous verification / IPN race conditions per orderNumber
export const inMemoryVerifyingOrders = new Set<string>();

/**
 * Distributed lease lock on order record to ensure strict idempotency across multiple Node.js/Cloud Run instances.
 */
export async function acquirePaymentLock(orderNumber: string): Promise<boolean> {
  const leaseExpiry = new Date(Date.now() - 60000); // 60s lease window

  if (isDbConnected()) {
    try {
      const locked = await OrderModel.findOneAndUpdate(
        {
          orderNumber,
          $or: [
            { paymentLock: { $ne: true } },
            { paymentLockAt: { $lt: leaseExpiry } },
          ],
        },
        {
          $set: {
            paymentLock: true,
            paymentLockAt: new Date(),
          },
        },
        { new: true }
      );
      if (!locked) return false;
    } catch (err: any) {
      console.warn('DB payment lock query fallback:', err.message);
    }
  }

  if (inMemoryVerifyingOrders.has(orderNumber)) {
    return false;
  }
  inMemoryVerifyingOrders.add(orderNumber);
  return true;
}

/**
 * Release distributed lock on order record
 */
export async function releasePaymentLock(orderNumber: string): Promise<void> {
  inMemoryVerifyingOrders.delete(orderNumber);
  if (isDbConnected()) {
    try {
      await OrderModel.updateOne(
        { orderNumber },
        { $set: { paymentLock: false } }
      );
    } catch {
      // ignore
    }
  }
}

/**
 * Pure validation helper ensuring a gateway's verified transaction genuinely matches the target order.
 */
export function validateGatewayVerificationAgainstOrder(
  order: { orderNumber: string; finalTotal: number },
  verificationResult: {
    orderNumber?: string;
    amount?: number;
    currency?: string;
  },
  targetOrderNumber: string
): { valid: boolean; error?: string } {
  if (verificationResult.orderNumber && verificationResult.orderNumber !== targetOrderNumber) {
    return {
      valid: false,
      error: 'Order reference mismatch between payment gateway and target order record.',
    };
  }

  const tolerance = 0.05;
  if (
    typeof verificationResult.amount !== 'number' ||
    Number.isNaN(verificationResult.amount) ||
    Math.abs(verificationResult.amount - order.finalTotal) > tolerance
  ) {
    return {
      valid: false,
      error: 'Payment amount mismatch between gateway and order record.',
    };
  }

  // Bangladesh E-Commerce Migration: BDT is the sole authorized currency
  if (verificationResult.currency && verificationResult.currency.toUpperCase() !== 'BDT') {
    return {
      valid: false,
      error: `Unexpected transaction currency: ${verificationResult.currency}. Only BDT is supported in Bangladesh commerce.`,
    };
  }

  return { valid: true };
}

/**
 * 1. GET /api/payment/config-status
 * Returns real configuration state of payment gateways
 */
router.get('/config-status', (_req: Request, res: Response) => {
  const status = getPaymentGatewayConfigStatus();
  res.json({
    success: true,
    gateways: status,
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * Shared initiation logic used by both /initiate and /retry
 */
async function handlePaymentInitiation(req: Request, res: Response): Promise<void> {
  try {
    if (!requirePersistentStorage(res, 'Payment initiation')) {
      return;
    }
    const { orderNumber, gateway: rawGateway } = req.body;

    if (!orderNumber) {
      res.status(400).json({ success: false, error: 'orderNumber is required' });
      return;
    }

    let order: any = null;
    if (isDbConnected()) {
      order = await OrderModel.findOne({ orderNumber });
    }
    const memOrder = inMemoryOrders.find((o) => o.orderNumber === orderNumber);
    if (!order) {
      order = memOrder;
    }

    if (!order) {
      res.status(404).json({ success: false, error: `Order "${orderNumber}" not found` });
      return;
    }

    if (order.paymentStatus === 'paid') {
      res.status(400).json({ success: false, error: 'This order is already paid' });
      return;
    }

    if (order.status === 'cancelled' || order.status === 'refunded' || order.status === 'returned') {
      res.status(400).json({
        success: false,
        error: `Cannot initiate payment for an order in "${order.status}" status.`,
      });
      return;
    }

    const gateway = String(rawGateway || order.paymentMethod || 'sslcommerz').toLowerCase().trim();
    const resolvedGateway = gateway === 'bkash' ? 'bkash' : gateway === 'nagad' ? 'nagad' : 'sslcommerz';

    // Update paymentMethod if customer switched gateway during retry
    if (memOrder) memOrder.paymentMethod = resolvedGateway;
    if (isDbConnected() && order.save) {
      order.paymentMethod = resolvedGateway;
      await order.save();
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = process.env.APP_URL || `${protocol}://${host}`;

    if (resolvedGateway === 'bkash') {
      const callbackUrl = `${baseUrl}/api/payment/callback/bkash?orderNumber=${encodeURIComponent(orderNumber)}`;
      const result = await initiateBkashPayment({
        amount: order.finalTotal,
        orderNumber,
        callbackUrl,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
          gateway: 'bkash',
        });
        return;
      }

      if (memOrder) memOrder.paymentTransactionId = result.paymentId;
      if (isDbConnected() && order.save) {
        order.paymentTransactionId = result.paymentId;
        await order.save();
      }

      res.json({
        success: true,
        gateway: 'bkash',
        paymentId: result.paymentId,
        redirectUrl: result.redirectUrl,
      });
      return;
    }

    if (resolvedGateway === 'nagad') {
      const callbackUrl = `${baseUrl}/api/payment/callback/nagad?orderNumber=${encodeURIComponent(orderNumber)}`;
      const result = await initiateNagadPayment({
        amount: order.finalTotal,
        orderNumber,
        callbackUrl,
        customerPhone: order.customerPhone,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
          gateway: 'nagad',
        });
        return;
      }

      if (memOrder) memOrder.paymentTransactionId = result.paymentId;
      if (isDbConnected() && order.save) {
        order.paymentTransactionId = result.paymentId;
        await order.save();
      }

      res.json({
        success: true,
        gateway: 'nagad',
        paymentId: result.paymentId,
        redirectUrl: result.redirectUrl,
      });
      return;
    }

    const result = await initiateSslcommerzPayment({
      amount: order.finalTotal,
      orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      address: order.shippingAddress?.street || 'Dhaka',
      city: order.shippingAddress?.city || order.shippingAddress?.district || 'Dhaka',
      successUrl: `${baseUrl}/api/payment/callback/sslcommerz?status=success&orderNumber=${encodeURIComponent(orderNumber)}`,
      failUrl: `${baseUrl}/api/payment/callback/sslcommerz?status=fail&orderNumber=${encodeURIComponent(orderNumber)}`,
      cancelUrl: `${baseUrl}/api/payment/callback/sslcommerz?status=cancel&orderNumber=${encodeURIComponent(orderNumber)}`,
      ipnUrl: `${baseUrl}/api/payment/webhook/sslcommerz`,
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
        gateway: 'sslcommerz',
      });
      return;
    }

    res.json({
      success: true,
      gateway: 'sslcommerz',
      paymentId: result.paymentId,
      redirectUrl: result.redirectUrl,
    });
  } catch (err: any) {
    console.error('Payment initiation error:', err);
    res.status(500).json({ success: false, error: err.message || 'Payment initiation failed' });
  }
}

/**
 * 2. POST /api/payment/initiate & POST /api/payment/retry
 * Initiates or retries an online payment transaction with the selected gateway
 */
router.post('/initiate', handlePaymentInitiation);
router.post('/retry', handlePaymentInitiation);

/**
 * 3. POST /api/payment/verify
 * Server-to-server payment verification
 */
router.post('/verify', async (req: Request, res: Response) => {
  if (!requirePersistentStorage(res, 'Payment verification')) {
    return;
  }
  const orderNumber = String(req.body?.orderNumber || '').trim();
  if (!orderNumber) {
    res.status(400).json({ success: false, error: 'orderNumber is required' });
    return;
  }

  const lockAcquired = await acquirePaymentLock(orderNumber);
  if (!lockAcquired) {
    res.status(409).json({
      success: false,
      error: 'Payment verification is already in progress for this order.',
    });
    return;
  }

  try {
    const { gateway, paymentId, valId } = req.body;

    let dbOrder: any = null;
    if (isDbConnected()) {
      dbOrder = await OrderModel.findOne({ orderNumber });
    }
    const memOrder = inMemoryOrders.find((o) => o.orderNumber === orderNumber);
    const order = dbOrder || memOrder;

    if (!order) {
      res.status(404).json({ success: false, error: `Order "${orderNumber}" not found` });
      return;
    }

    if (order.paymentStatus === 'paid') {
      res.json({
        success: true,
        alreadyPaid: true,
        orderNumber,
        paymentStatus: 'paid',
        message: 'Order is already marked as paid.',
      });
      return;
    }

    let verificationResult;

    if (gateway === 'bkash') {
      if (!paymentId) {
        res.status(400).json({ success: false, error: 'paymentId is required for bKash verification' });
        return;
      }
      verificationResult = await verifyBkashPayment(paymentId);
    } else if (gateway === 'nagad') {
      const targetId = paymentId || valId;
      if (!targetId) {
        res.status(400).json({ success: false, error: 'paymentId (paymentReferenceId) is required for Nagad verification' });
        return;
      }
      verificationResult = await verifyNagadPayment(targetId);
    } else if (gateway === 'sslcommerz') {
      if (!valId) {
        res.status(400).json({ success: false, error: 'valId is required for SSLCOMMERZ verification' });
        return;
      }
      verificationResult = await verifySslcommerzPayment(valId);
    } else {
      res.status(400).json({ success: false, error: `Unsupported gateway: ${gateway}` });
      return;
    }

    if (!verificationResult.success || verificationResult.status !== 'paid') {
      const failNote = {
        status: 'pending' as const,
        timestamp: new Date(),
        actor: 'Payment Gateway',
        note: `Payment verification failed: ${verificationResult.error || 'Gateway returned non-success'}`,
      };

      if (memOrder) {
        memOrder.paymentStatus = 'failed';
        memOrder.status = 'pending';
        if (!memOrder.statusTimeline) memOrder.statusTimeline = [];
        memOrder.statusTimeline.push(failNote);
      }
      if (dbOrder) {
        dbOrder.paymentStatus = 'failed';
        dbOrder.statusTimeline.push(failNote);
        await dbOrder.save();
      }

      res.status(400).json({
        success: false,
        error: verificationResult.error || 'Payment verification failed',
        status: verificationResult.status,
      });
      return;
    }

    const fraudCheck = validateGatewayVerificationAgainstOrder(order, verificationResult, orderNumber);
    if (!fraudCheck.valid) {
      console.error(`🚨 [Payment Fraud Warning] ${fraudCheck.error}`);
      res.status(400).json({
        success: false,
        error: fraudCheck.error,
      });
      return;
    }

    const confirmedEntry = {
      status: 'confirmed' as const,
      timestamp: new Date(),
      actor: `${String(gateway).toUpperCase()} Gateway`,
      note: `Payment verified successfully. TrxID: ${verificationResult.transactionId}`,
    };

    if (memOrder) {
      memOrder.paymentStatus = 'paid';
      memOrder.status = 'confirmed';
      memOrder.paymentTransactionId = verificationResult.transactionId;
      if (!memOrder.statusTimeline) memOrder.statusTimeline = [];
      memOrder.statusTimeline.push(confirmedEntry);
    }

    if (dbOrder) {
      dbOrder.paymentStatus = 'paid';
      dbOrder.status = 'confirmed';
      dbOrder.paymentTransactionId = verificationResult.transactionId;
      dbOrder.statusTimeline.push(confirmedEntry);
      await dbOrder.save();
    }

    res.json({
      success: true,
      orderNumber,
      transactionId: verificationResult.transactionId,
      amount: verificationResult.amount,
      currency: verificationResult.currency,
      paymentStatus: 'paid',
      message: 'Payment verified and order confirmed successfully.',
    });
  } catch (err: any) {
    console.error('Payment verification error:', err);
    res.status(500).json({ success: false, error: err.message || 'Payment verification failed' });
  } finally {
    await releasePaymentLock(orderNumber);
  }
});

/**
 * 4. GET /api/payment/callback/bkash
 * bKash browser return callback
 */
router.get('/callback/bkash', async (req: Request, res: Response) => {
  const { paymentID, status, orderNumber } = req.query;

  if (status === 'cancel' || status === 'failure') {
    const cleanOrder = String(orderNumber || '').trim();
    const memOrder = inMemoryOrders.find((o) => o.orderNumber === cleanOrder);
    if (memOrder && memOrder.paymentStatus !== 'paid') {
      memOrder.paymentStatus = 'failed';
    }
    if (cleanOrder && isDbConnected()) {
      await OrderModel.updateOne(
        { orderNumber: cleanOrder, paymentStatus: { $ne: 'paid' } },
        { $set: { paymentStatus: 'failed' } }
      );
    }
    res.redirect(
      `/checkout?paymentStatus=${status === 'cancel' ? 'cancelled' : 'failed'}&gateway=bkash&orderNumber=${encodeURIComponent(
        cleanOrder
      )}&reason=${encodeURIComponent(String(status))}`
    );
    return;
  }

  if (status === 'success' && paymentID) {
    res.redirect(
      `/checkout?paymentStatus=verifying&gateway=bkash&paymentId=${encodeURIComponent(
        paymentID as string
      )}&orderNumber=${encodeURIComponent(String(orderNumber || ''))}`
    );
    return;
  }

  res.redirect('/checkout?paymentStatus=unknown');
});

/**
 * 5. ALL /api/payment/callback/sslcommerz
 * SSLCOMMERZ browser return callback (handles both POST form-urlencoded and GET redirects)
 */
router.all('/callback/sslcommerz', async (req: Request, res: Response) => {
  const statusParam = String(req.query.status || req.body?.status || '').toLowerCase();
  const orderNumber = String(req.query.orderNumber || req.body?.tran_id || '').trim();
  const valId = String(req.body?.val_id || req.query.val_id || '').trim();

  if (
    (statusParam === 'success' || statusParam === 'valid' || statusParam === 'validated') &&
    valId &&
    orderNumber
  ) {
    res.redirect(
      `/checkout?paymentStatus=verifying&gateway=sslcommerz&valId=${encodeURIComponent(
        valId
      )}&orderNumber=${encodeURIComponent(orderNumber)}`
    );
    return;
  }

  const isCancel = statusParam === 'cancel' || statusParam === 'cancelled';
  if (orderNumber) {
    const memOrder = inMemoryOrders.find((o) => o.orderNumber === orderNumber);
    if (memOrder && memOrder.paymentStatus !== 'paid') {
      memOrder.paymentStatus = 'failed';
    }
    if (isDbConnected()) {
      try {
        await OrderModel.updateOne(
          { orderNumber, paymentStatus: { $ne: 'paid' } },
          { $set: { paymentStatus: 'failed' } }
        );
      } catch {
        // ignore
      }
    }
  }

  res.redirect(
    `/checkout?paymentStatus=${isCancel ? 'cancelled' : 'failed'}&gateway=sslcommerz&orderNumber=${encodeURIComponent(
      orderNumber
    )}&reason=${encodeURIComponent(statusParam || 'failed')}`
  );
});

/**
 * 6. ALL /api/payment/callback/nagad
 * Nagad browser return callback
 */
router.all('/callback/nagad', async (req: Request, res: Response) => {
  const statusParam = String(req.query.status || req.body?.status || '').toLowerCase();
  const orderNumber = String(req.query.orderNumber || req.query.order_id || req.body?.order_id || '').split('_')[0].trim();
  const paymentRefId = String(req.query.payment_ref_id || req.body?.payment_ref_id || req.query.paymentRefId || '').trim();

  if ((statusParam === 'success' || !statusParam) && paymentRefId && orderNumber) {
    res.redirect(
      `/checkout?paymentStatus=verifying&gateway=nagad&paymentId=${encodeURIComponent(
        paymentRefId
      )}&orderNumber=${encodeURIComponent(orderNumber)}`
    );
    return;
  }

  const isCancel = statusParam === 'cancel' || statusParam === 'cancelled' || statusParam === 'aborted';
  if (orderNumber) {
    const memOrder = inMemoryOrders.find((o) => o.orderNumber === orderNumber);
    if (memOrder && memOrder.paymentStatus !== 'paid') {
      memOrder.paymentStatus = 'failed';
    }
    if (isDbConnected()) {
      try {
        await OrderModel.updateOne(
          { orderNumber, paymentStatus: { $ne: 'paid' } },
          { $set: { paymentStatus: 'failed' } }
        );
      } catch {
        // ignore
      }
    }
  }

  res.redirect(
    `/checkout?paymentStatus=${isCancel ? 'cancelled' : 'failed'}&gateway=nagad&orderNumber=${encodeURIComponent(
      orderNumber
    )}&reason=${encodeURIComponent(statusParam || 'failed')}`
  );
});

/**
 * 7. POST /api/payment/webhook/:gateway
 * IPN Webhook handler for asynchronous server-to-server notifications with full fraud validation
 */
router.post('/webhook/:gateway', async (req: Request, res: Response) => {
  if (isProduction() && !isDbConnected()) {
    res.status(503).send('PERSISTENT_DATABASE_UNAVAILABLE');
    return;
  }
  const { gateway } = req.params;
  const tranId = String(req.body?.tran_id || req.body?.order_id || '').split('_')[0].trim();

  try {
    if (gateway === 'sslcommerz') {
      const { val_id, status } = req.body;
      if ((status === 'VALID' || status === 'VALIDATED') && val_id && tranId) {
        const lockAcquired = await acquirePaymentLock(tranId);
        if (!lockAcquired) {
          res.status(200).send('IPN_ALREADY_PROCESSING');
          return;
        }
        try {
          let dbOrder: any = null;
          if (isDbConnected()) {
            dbOrder = await OrderModel.findOne({ orderNumber: tranId });
          }
          const memOrder = inMemoryOrders.find((o) => o.orderNumber === tranId);
          const targetOrder = dbOrder || memOrder;

          if (targetOrder && targetOrder.paymentStatus !== 'paid') {
            const verifyRes = await verifySslcommerzPayment(val_id);
            if (verifyRes.success && verifyRes.status === 'paid') {
              const fraudCheck = validateGatewayVerificationAgainstOrder(targetOrder, verifyRes, tranId);
              if (!fraudCheck.valid) {
                console.error(`🚨 [IPN Fraud Rejected] ${fraudCheck.error}`);
                res.status(400).send('IPN_FRAUD_MISMATCH');
                return;
              }

              const confirmedNote = {
                status: 'confirmed' as const,
                timestamp: new Date(),
                actor: 'SSLCOMMERZ IPN',
                note: `Payment verified via IPN. TrxID: ${verifyRes.transactionId}`,
              };

              if (memOrder) {
                memOrder.paymentStatus = 'paid';
                memOrder.status = 'confirmed';
                memOrder.paymentTransactionId = verifyRes.transactionId;
                if (!memOrder.statusTimeline) memOrder.statusTimeline = [];
                memOrder.statusTimeline.push(confirmedNote);
              }
              if (dbOrder) {
                dbOrder.paymentStatus = 'paid';
                dbOrder.status = 'confirmed';
                dbOrder.paymentTransactionId = verifyRes.transactionId;
                dbOrder.statusTimeline.push(confirmedNote);
                await dbOrder.save();
              }
            }
          }
        } finally {
          await releasePaymentLock(tranId);
        }
      }
      res.status(200).send('IPN_PROCESSED');
      return;
    }

    if (gateway === 'nagad') {
      const paymentRefId = String(req.body?.payment_ref_id || req.body?.paymentReferenceId || '').trim();
      if (paymentRefId && tranId) {
        const lockAcquired = await acquirePaymentLock(tranId);
        if (!lockAcquired) {
          res.status(200).send('IPN_ALREADY_PROCESSING');
          return;
        }
        try {
          let dbOrder: any = null;
          if (isDbConnected()) {
            dbOrder = await OrderModel.findOne({ orderNumber: tranId });
          }
          const memOrder = inMemoryOrders.find((o) => o.orderNumber === tranId);
          const targetOrder = dbOrder || memOrder;

          if (targetOrder && targetOrder.paymentStatus !== 'paid') {
            const verifyRes = await verifyNagadPayment(paymentRefId);
            if (verifyRes.success && verifyRes.status === 'paid') {
              const fraudCheck = validateGatewayVerificationAgainstOrder(targetOrder, verifyRes, tranId);
              if (!fraudCheck.valid) {
                console.error(`🚨 [Nagad IPN Fraud Rejected] ${fraudCheck.error}`);
                res.status(400).send('IPN_FRAUD_MISMATCH');
                return;
              }

              const confirmedNote = {
                status: 'confirmed' as const,
                timestamp: new Date(),
                actor: 'Nagad IPN',
                note: `Payment verified via Nagad IPN. TrxID: ${verifyRes.transactionId}`,
              };

              if (memOrder) {
                memOrder.paymentStatus = 'paid';
                memOrder.status = 'confirmed';
                memOrder.paymentTransactionId = verifyRes.transactionId;
                if (!memOrder.statusTimeline) memOrder.statusTimeline = [];
                memOrder.statusTimeline.push(confirmedNote);
              }
              if (dbOrder) {
                dbOrder.paymentStatus = 'paid';
                dbOrder.status = 'confirmed';
                dbOrder.paymentTransactionId = verifyRes.transactionId;
                dbOrder.statusTimeline.push(confirmedNote);
                await dbOrder.save();
              }
            }
          }
        } finally {
          await releasePaymentLock(tranId);
        }
      }
      res.status(200).send('NAGAD_IPN_PROCESSED');
      return;
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
