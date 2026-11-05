import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { inMemoryOrders, restoreOrderStock } from './checkoutRoutes';
import { OrderModel } from '../models/Order';
import { isValidOrderTransition, OrderStatus } from '../../src/utils/ecommerceRules';
import { isDbConnected, isProduction, requirePersistentStorage } from '../db';
import { UserRole } from '../models/User';

const router = Router();

const ORDER_STAFF_ROLES: UserRole[] = [
  'admin',
  'super_admin',
  'order_manager',
  'inventory_manager',
  'customer_support',
  'finance',
];

function matchOrderNumber(candidate: string, target: string): boolean {
  const a = (candidate || '').trim().replace(/^#/, '');
  const b = (target || '').trim().replace(/^#/, '');
  return Boolean(a && b && a === b);
}

// Customer: Get my orders
router.get('/my-orders', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userEmail = (req.user!.email || '').toLowerCase();

    if (isDbConnected()) {
      const orders = await OrderModel.find({
        $or: [{ customerId: userId }, ...(userEmail ? [{ customerEmail: userEmail }] : [])],
      }).sort({ createdAt: -1 });
      res.json({ success: true, data: orders });
      return;
    }

    const myOrders = inMemoryOrders.filter(
      (o) => o.customerId === userId || (userEmail && (o.customerEmail || '').toLowerCase() === userEmail)
    );
    res.json({ success: true, data: myOrders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single order details
router.get('/:orderNumber', requireAuth, async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const user = req.user!;

    let order: any = null;
    if (isDbConnected()) {
      const clean = orderNumber.trim().replace(/^#/, '');
      order = await OrderModel.findOne({
        $or: [{ orderNumber }, { orderNumber: clean }, { orderNumber: `#${clean}` }],
      });
    }
    if (!order) {
      order = inMemoryOrders.find((o) => matchOrderNumber(o.orderNumber, orderNumber) || o.id === orderNumber);
    }

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const isStaff = ORDER_STAFF_ROLES.includes(user.role);
    const isOwner =
      order.customerId === user.userId ||
      (user.email && (order.customerEmail || '').toLowerCase() === user.email.toLowerCase());

    if (!isOwner && !isStaff) {
      res.status(403).json({ success: false, error: 'Access denied to this order' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Customer: Cancel pending or confirmed order
router.post('/:orderNumber/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const { reason } = req.body;
    const user = req.user!;

    const clean = orderNumber.trim().replace(/^#/, '');
    const memOrder = inMemoryOrders.find((o) => matchOrderNumber(o.orderNumber, orderNumber) || o.id === orderNumber);
    let dbOrder: any = null;

    if (isDbConnected()) {
      dbOrder = await OrderModel.findOne({
        $or: [{ orderNumber }, { orderNumber: clean }, { orderNumber: `#${clean}` }],
      });
    }

    const targetOrder = dbOrder || memOrder;
    if (!targetOrder) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const isStaff = ['admin', 'super_admin', 'order_manager', 'customer_support'].includes(user.role);
    const isOwner =
      targetOrder.customerId === user.userId ||
      (user.email && (targetOrder.customerEmail || '').toLowerCase() === user.email.toLowerCase());

    if (!isOwner && !isStaff) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    if (targetOrder.status !== 'pending' && targetOrder.status !== 'confirmed') {
      res.status(400).json({
        success: false,
        error: `Cannot cancel order in "${targetOrder.status}" status. Only pending or confirmed orders can be cancelled.`,
      });
      return;
    }

    const cancelReason = reason || 'Customer requested cancellation';
    const timelineEntry = {
      status: 'cancelled' as OrderStatus,
      timestamp: new Date(),
      actor: user.name,
      note: `Cancelled: ${cancelReason}`,
    };

    // Idempotent stock restoration across DB & memory
    await restoreOrderStock(targetOrder);

    if (memOrder) {
      memOrder.status = 'cancelled';
      memOrder.cancellationReason = cancelReason;
      memOrder.stockRestored = true;
      if (!memOrder.statusTimeline) memOrder.statusTimeline = [];
      memOrder.statusTimeline.push(timelineEntry);
      memOrder.updatedAt = new Date();
    }

    if (dbOrder) {
      dbOrder.status = 'cancelled';
      dbOrder.cancellationReason = cancelReason;
      dbOrder.stockRestored = true;
      dbOrder.statusTimeline.push(timelineEntry);
      await dbOrder.save();
    }

    res.json({
      success: true,
      message: 'Order cancelled and stock restored',
      order: dbOrder || memOrder,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: List all orders
router.get('/admin/list', requireAuth, requireRole(ORDER_STAFF_ROLES), async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;

    let orders: any[] = [];

    if (isDbConnected()) {
      try {
        const query: any = {};
        if (status && status !== 'all') query.status = status;
        const dbOrders = await OrderModel.find(query).sort({ createdAt: -1 });
        if (dbOrders.length > 0) {
          orders = dbOrders.map((o) => ({
            id: o._id.toString(),
            orderNumber: o.orderNumber,
            customerId: o.customerId,
            customerName: o.customerName,
            customerEmail: o.customerEmail,
            customerPhone: o.customerPhone,
            items: o.items,
            subtotal: o.subtotal,
            discount: o.discount,
            couponCode: o.couponCode,
            shippingFee: o.shippingFee,
            tax: o.tax,
            finalTotal: o.finalTotal,
            shippingAddress: o.shippingAddress,
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            paymentTransactionId: o.paymentTransactionId,
            status: o.status,
            statusTimeline: o.statusTimeline,
            stockRestored: o.stockRestored,
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
          }));
        }
      } catch (dbErr) {
        console.warn('DB order list failed, falling back to in-memory orders:', dbErr);
      }
    }

    if (orders.length === 0) {
      orders = [...inMemoryOrders];
      if (status && status !== 'all') {
        orders = orders.filter((o) => o.status === status);
      }
    }

    if (search) {
      const q = (search as string).toLowerCase();
      orders = orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, data: orders, total: orders.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Update order status with state machine verification & automatic stock restoration on cancel/return
router.put(
  '/admin/:orderNumber/status',
  requireAuth,
  requireRole(['admin', 'super_admin', 'order_manager', 'customer_support', 'finance']),
  async (req: Request, res: Response) => {
    try {
      if (!requirePersistentStorage(res, 'Order status update')) {
        return;
      }
      const { orderNumber } = req.params;
      const { status: nextStatus, note } = req.body;
      const user = req.user!;

      const clean = orderNumber.trim().replace(/^#/, '');
      const memOrder = inMemoryOrders.find(
        (o) => matchOrderNumber(o.orderNumber, orderNumber) || o.id === orderNumber.trim()
      );

      let dbOrder: any = null;
      if (isDbConnected()) {
        dbOrder = await OrderModel.findOne({
          $or: [
            { orderNumber: orderNumber.trim() },
            { orderNumber: clean },
            { orderNumber: `#${clean}` },
          ],
        });
      }

      const targetOrder = dbOrder || memOrder;
      if (!targetOrder) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      const currentStatus = targetOrder.status as OrderStatus;
      if (!isValidOrderTransition(currentStatus, nextStatus as OrderStatus)) {
        res.status(400).json({
          success: false,
          error: `Invalid transition from "${currentStatus}" to "${nextStatus}". Please follow the fulfillment lifecycle.`,
        });
        return;
      }

      const timelineEntry = {
        status: nextStatus as OrderStatus,
        timestamp: new Date(),
        actor: `${user.name} (${user.role})`,
        note: note || `Updated to ${nextStatus}`,
      };

      // Restore stock idempotently when transitioning to cancelled or returned
      if (nextStatus === 'cancelled' || nextStatus === 'returned') {
        await restoreOrderStock(targetOrder);
      }

      let updatedPaymentStatus = targetOrder.paymentStatus;
      if (nextStatus === 'delivered' && targetOrder.paymentMethod === 'cod') {
        updatedPaymentStatus = 'paid';
      } else if (nextStatus === 'refunded') {
        updatedPaymentStatus = 'refunded';
      }

      if (memOrder) {
        memOrder.status = nextStatus;
        memOrder.paymentStatus = updatedPaymentStatus;
        if (targetOrder.stockRestored) memOrder.stockRestored = true;
        if (!memOrder.statusTimeline) memOrder.statusTimeline = [];
        memOrder.statusTimeline.push(timelineEntry);
        memOrder.updatedAt = new Date();
      }

      if (dbOrder) {
        dbOrder.status = nextStatus;
        dbOrder.paymentStatus = updatedPaymentStatus;
        if (targetOrder.stockRestored) dbOrder.stockRestored = true;
        dbOrder.statusTimeline.push(timelineEntry);
        await dbOrder.save();
      }

      res.json({
        success: true,
        order: dbOrder || memOrder,
        message: `Status updated to ${nextStatus}`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

export default router;
