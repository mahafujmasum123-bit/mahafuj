import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  removePurchasedItems,
  setDivision,
  setShippingMethod,
  updateQuantity,
  removeFromCart,
  applyCoupon,
  removeCoupon,
} from '../features/cart/cartSlice';
import { openAuthModal, updateUserAddresses } from '../features/auth/authSlice';
import { addToast } from '../features/toast/toastSlice';
import { calculateCartTotals } from '../utils/ecommerceRules';
import { handleImageFallback } from '../utils/safeMarkdown';
import { formatBDT } from '../utils/currency';
import { trackUserInteraction } from '../utils/interactionTracker';
import {
  getDivisions,
  getDistricts,
  getUpazilas,
  getUnionsOrWards,
  validateBdLocation,
} from '../data/bangladeshLocations';
import { Modal } from '../components/modal/Modal';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  MapPin,
  Lock,
  Package,
  Headphones,
  RotateCcw,
  Tag,
  Check,
  X,
  Plus,
  Minus,
  ChevronDown,
  ShoppingBag,
  Sparkles,
  ShieldAlert,
  Banknote,
  Smartphone,
  RefreshCw,
} from 'lucide-react';

interface CheckoutPageProps {
  onOrderSuccess: (order: any) => void;
  onNavigateToShop: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  onOrderSuccess,
  onNavigateToShop,
}) => {
  const dispatch = useAppDispatch();
  const {
    items,
    coupon,
    shippingMethodId = 'standard',
  } = useAppSelector((state) => state.cart);
  const { user, isAuthenticated, token } = useAppSelector((state) => state.auth);

  // Only check out items currently selected by the customer
  const checkoutItems = items.filter((i) => i.selected !== false);

  // Contact & Shipping State — pre-filled ONLY from authenticated user, never stranger PII
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [marketingConsent, setMarketingConsent] = useState(true);

  const [fullName, setFullName] = useState(user?.name || '');
  const [streetAddress, setStreetAddress] = useState(user?.addresses?.[0]?.street || '');

  // 4-Tier Bangladesh Location State: Division (8) -> District (64) -> Upazila/Thana -> Union/Ward
  const defaultAddr = user?.addresses?.[0];
  const initialDivision = defaultAddr?.division || 'Dhaka';
  const initialDistrict = defaultAddr?.district || 'Dhaka';
  const initialUpazila = defaultAddr?.upazila || (getUpazilas(initialDivision, initialDistrict)[0] || 'Dhanmondi');
  const initialUnion = defaultAddr?.unionWard || (getUnionsOrWards(initialDivision, initialDistrict, initialUpazila)[0] || 'Ward 15');

  const [division, setDivisionState] = useState<string>(initialDivision);
  const [district, setDistrictState] = useState<string>(initialDistrict);
  const [upazila, setUpazilaState] = useState<string>(initialUpazila);
  const [unionWard, setUnionWardState] = useState<string>(initialUnion);
  const [postalCode, setPostalCode] = useState(defaultAddr?.postalCode || '1205');
  const [saveAddressForNextTime, setSaveAddressForNextTime] = useState(true);

  // Cascading location change handlers
  const handleDivisionChange = (newDiv: string) => {
    setDivisionState(newDiv);
    dispatch(setDivision(newDiv));
    const districts = getDistricts(newDiv);
    const newDist = districts[0] || '';
    setDistrictState(newDist);
    const upazilas = getUpazilas(newDiv, newDist);
    const newUpz = upazilas[0] || '';
    setUpazilaState(newUpz);
    const unions = getUnionsOrWards(newDiv, newDist, newUpz);
    setUnionWardState(unions[0] || '');
  };

  const handleDistrictChange = (newDist: string) => {
    setDistrictState(newDist);
    const upazilas = getUpazilas(division, newDist);
    const newUpz = upazilas[0] || '';
    setUpazilaState(newUpz);
    const unions = getUnionsOrWards(division, newDist, newUpz);
    setUnionWardState(unions[0] || '');
  };

  const handleUpazilaChange = (newUpz: string) => {
    setUpazilaState(newUpz);
    const unions = getUnionsOrWards(division, district, newUpz);
    setUnionWardState(unions[0] || '');
  };

  const [shippingConfig, setShippingConfig] = useState<import('../utils/ecommerceRules').ShippingConfigInput | null>(null);

  // Compute authoritative checkout totals strictly from selected checkoutItems
  const checkoutTotals = calculateCartTotals(
    checkoutItems,
    coupon,
    division,
    shippingMethodId,
    shippingConfig || undefined
  );
  const {
    subtotal,
    discount,
    shippingFee,
    finalTotal,
    lineItemsCount,
  } = checkoutTotals;


  // Honest Payment State (COD, SSLCOMMERZ Gateway, bKash Tokenized Checkout, Nagad DFS — zero raw card/CVV storage)
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'sslcommerz' | 'bkash' | 'nagad'>('cod');
  const [gatewayConfig, setGatewayConfig] = useState<any>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [gatewayNoticeModal, setGatewayNoticeModal] = useState<{
    open: boolean;
    gateway: string;
    message: string;
    orderNumber?: string;
  } | null>(null);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  // Coupon state
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState<any | null>(null);

  // Reactive Stepper completion states
  const bdPhoneRegex = /^(?:\+?8801|01)[3-9]\d{8}$/;
  const isPhoneValid = bdPhoneRegex.test(phone.replace(/[\s-]/g, ''));
  const step1Complete = Boolean(email.trim().includes('@') && isPhoneValid);
  const step2Complete = Boolean(
    fullName.trim() &&
    streetAddress.trim() &&
    division.trim() &&
    district.trim() &&
    upazila.trim()
  );
  const step3Complete = Boolean(paymentMethod);

  // Fetch real payment gateway configuration & store shipping settings
  useEffect(() => {
    fetch('/api/payment/config-status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGatewayConfig(data.gateways);
        }
      })
      .catch(() => {});

    fetch('/api/admin/store-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setShippingConfig({
            freeShippingThreshold: data.data.freeShippingThreshold,
            insideDhakaFee: data.data.dhakaShippingFee,
            outsideDhakaFee: data.data.outsideDhakaShippingFee,
          });
        }
      })
      .catch(() => {});
  }, []);


  // Handle gateway return callback verification (e.g. bKash or SSLCOMMERZ return)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pStatus = params.get('paymentStatus');
    const gateway = params.get('gateway');
    const paymentId = params.get('paymentId');
    const orderNumber = params.get('orderNumber');
    const valId = params.get('valId');

    if (pStatus === 'verifying' && orderNumber) {
      setVerifyingPayment(true);
      fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, gateway, paymentId, valId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            dispatch(
              addToast({
                type: 'success',
                title: 'Payment Confirmed',
                message: `Transaction ${data.transactionId || ''} verified successfully!`,
              })
            );
            setOrderCompleted({
              orderNumber,
              paymentStatus: 'paid',
              paymentMethod: gateway || 'online',
              shippingAddress: { street: 'Delivery Address', city: 'Dhaka' },
              finalTotal: data.amount || 0,
            });
          } else {
            dispatch(
              addToast({
                type: 'error',
                title: 'Payment Verification Error',
                message: data.error || 'Gateway validation failed',
              })
            );
          }
        })
        .catch((err) => {
          dispatch(
            addToast({
              type: 'error',
              title: 'Verification Error',
              message: err.message,
            })
          );
        })
        .finally(() => {
          setVerifyingPayment(false);
        });
    } else if (pStatus === 'failed') {
      dispatch(
        addToast({
          type: 'error',
          title: 'Payment Not Completed',
          message: 'The transaction was cancelled or failed by the payment provider.',
        })
      );
    }
  }, []);

  // Sync with authenticated customer profile if logged in
  useEffect(() => {
    if (user) {
      if (user.email) setEmail(user.email);
      if (user.phone) setPhone(user.phone);
      if (user.name) setFullName(user.name);

      if (user.addresses && user.addresses.length > 0) {
        const defaultAddr = user.addresses.find((a) => a.isDefault) || user.addresses[0];
        setFullName(defaultAddr.name || user.name);
        setPhone(defaultAddr.phone || user.phone || '');
        setStreetAddress(defaultAddr.street || '');
        const div = defaultAddr.division || 'Dhaka';
        const dist = defaultAddr.district || 'Dhaka';
        const upz = defaultAddr.upazila || (getUpazilas(div, dist)[0] || 'Dhanmondi');
        const union = defaultAddr.unionWard || (getUnionsOrWards(div, dist, upz)[0] || 'Ward 15');
        setDivisionState(div);
        setDistrictState(dist);
        setUpazilaState(upz);
        setUnionWardState(union);
        setPostalCode(defaultAddr.postalCode || '1205');
        dispatch(setDivision(div));
      }
    }
  }, [user]);

  // Handle shipping method selection
  const handleSelectShippingMethod = (methodId: 'standard' | 'express' | 'next_day') => {
    dispatch(setShippingMethod(methodId));
  };

  // Apply promo code via backend validation API
  const handleApplyPromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = (promoCodeInput || '').trim().toUpperCase();
    if (!cleanCode) {
      dispatch(addToast({ type: 'warning', message: 'Please enter a promo code.' }));
      return;
    }

    setValidatingCoupon(true);
    try {
      const res = await fetch(`/api/checkout/validate-coupon/${encodeURIComponent(cleanCode)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid promo code');
      }

      dispatch(applyCoupon(data.coupon));
      dispatch(
        addToast({
          type: 'success',
          title: 'Coupon Applied',
          message: data.message || `Coupon "${cleanCode}" successfully applied!`,
        })
      );
      setPromoCodeInput('');
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Coupon Error', message: err.message }));
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    dispatch(removeCoupon());
    dispatch(addToast({ type: 'info', message: 'Coupon removed.' }));
  };

  // Retry online gateway initiation if unpaid
  const handleRetryOnlinePayment = async (orderNum: string, method: 'sslcommerz' | 'bkash') => {
    setRetryingPayment(true);
    try {
      const res = await fetch('/api/payment/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNum, gateway: method }),
      });
      const data = await res.json();
      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      dispatch(
        addToast({
          type: 'warning',
          title: 'Gateway Credentials Required',
          message:
            data.error ||
            `Live ${method.toUpperCase()} credentials are not configured in this environment. Your order remains saved as Pending.`,
        })
      );
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message || 'Retry failed' }));
    } finally {
      setRetryingPayment(false);
    }
  };

  // Order Placement Handler
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (checkoutItems.length === 0) {
      dispatch(addToast({ type: 'warning', message: 'No selected items to purchase.' }));
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      dispatch(addToast({ type: 'warning', message: 'Please enter a valid email address.' }));
      return;
    }

    if (!phone.trim()) {
      dispatch(addToast({ type: 'warning', message: 'Please provide a valid contact phone number.' }));
      return;
    }

    if (!fullName.trim() || !streetAddress.trim() || !postalCode.trim()) {
      dispatch(addToast({ type: 'warning', message: 'Please complete your recipient name, street address, and postal code.' }));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        items: checkoutItems.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          variantName: i.variantName,
          name: i.name,
          quantity: i.quantity,
          image: i.image,
        })),
        contactInfo: {
          email: email.trim(),
          phone: phone.trim(),
          marketingConsent,
        },
        shippingAddress: {
          name: fullName.trim(),
          phone: phone.trim(),
          address: streetAddress.trim(),
          street: streetAddress.trim(),
          division: division.trim(),
          district: district.trim(),
          upazila: upazila.trim(),
          unionWard: unionWard.trim(),
          postalCode: postalCode.trim(),
          country: 'Bangladesh',
        },
        shippingMethod: shippingMethodId,
        paymentMethod,
        couponCode: coupon?.code,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/checkout/place-order', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to place order');
      }

      const purchasedRefs = checkoutItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
      }));

      // Save address if authenticated and requested
      if (saveAddressForNextTime && token) {
        try {
          const addrRes = await fetch('/api/auth/address', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: fullName.trim(),
              phone: phone.trim(),
              division: division.trim(),
              district: district.trim(),
              upazila: upazila.trim(),
              unionWard: unionWard.trim(),
              postalCode: postalCode.trim(),
              street: streetAddress.trim(),
              isDefault: true,
            }),
          });
          const addrData = await addrRes.json();
          if (addrData.success && addrData.addresses) {
            dispatch(updateUserAddresses(addrData.addresses));
          }
        } catch {
          // address save non-critical failure
        }
      }

      // If online payment gateway selected (bKash, Nagad, or SSLCOMMERZ), initiate payment session
      if (paymentMethod === 'bkash' || paymentMethod === 'sslcommerz' || paymentMethod === 'nagad') {
        try {
          const initRes = await fetch('/api/payment/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderNumber: data.order.orderNumber,
              gateway: paymentMethod,
            }),
          });
          const initData = await initRes.json();

          dispatch(removePurchasedItems(purchasedRefs));

          if (initData.success && initData.redirectUrl) {
            window.location.href = initData.redirectUrl;
            return;
          } else {
            setGatewayNoticeModal({
              open: true,
              gateway: paymentMethod,
              orderNumber: data.order.orderNumber,
              message:
                initData.error ||
                `Live ${paymentMethod.toUpperCase()} merchant credentials are not configured in this environment. Order #${data.order.orderNumber} is saved as Unpaid (Pending Verification).`,
            });
            setOrderCompleted(data.order);
            if (typeof window !== 'undefined') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
          }
        } catch (gateErr: any) {
          console.error('Payment gateway initiation error:', gateErr);
        }
      }

      dispatch(removePurchasedItems(purchasedRefs));
      setOrderCompleted(data.order);

      // Track order_complete for personalized recommendations
      if (checkoutItems.length > 0) {
        checkoutItems.forEach((item) => {
          trackUserInteraction({
            eventType: 'order_complete',
            productId: item.productId,
            metadata: { orderNumber: data.order?.orderNumber, price: item.price },
          });
        });
      }

      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      dispatch(
        addToast({
          type: 'success',
          title: 'Order Placed!',
          message: `Order #${data.order.orderNumber} has been recorded.`,
        })
      );
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Order Failed', message: err.message }));
    } finally {
      setSubmitting(false);
    }
  };

  // If order is completed, show truthful Order Confirmation
  if (orderCompleted) {
    const isPaid = orderCompleted.paymentStatus === 'paid';
    const isCod = orderCompleted.paymentMethod === 'cod';
    const isUnpaidOnline = !isPaid && (orderCompleted.paymentMethod === 'sslcommerz' || orderCompleted.paymentMethod === 'bkash');

    return (
      <div className="max-w-3xl mx-auto px-4 py-14 text-center space-y-6">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner ${
            isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {isPaid ? <Check className="w-10 h-10 stroke-[3]" /> : <Package className="w-10 h-10" />}
        </div>
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {isPaid ? 'Payment Verified & Confirmed' : 'Order Recorded'}
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Thank you for your order!
          </h1>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Order reference <strong className="text-gray-900">{orderCompleted.orderNumber}</strong> is linked to{' '}
            <strong className="text-gray-900">{orderCompleted.customerEmail || email}</strong>.
          </p>
        </div>

        {gatewayNoticeModal?.open && (
          <div className="max-w-lg mx-auto p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <div className="font-bold">
                {gatewayNoticeModal.gateway.toUpperCase()} Payment Not Yet Completed
              </div>
              <p className="text-amber-800 leading-relaxed">{gatewayNoticeModal.message}</p>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs text-left max-w-lg mx-auto space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-gray-100">
            <span className="text-xs text-gray-500">Order Number</span>
            <span className="text-sm font-bold font-mono text-gray-900">{orderCompleted.orderNumber}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-gray-100 gap-2">
            <span className="text-xs text-gray-500">Payment Status</span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-md uppercase ${
                isPaid
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {isPaid
                ? `Paid (${orderCompleted.paymentMethod})`
                : isCod
                ? 'Unpaid • Cash on Delivery'
                : `Unpaid • Awaiting ${orderCompleted.paymentMethod} Verification`}
            </span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-gray-100">
            <span className="text-xs text-gray-500">Delivery Address</span>
            <span className="text-xs font-medium text-gray-800 text-right">
              {orderCompleted.shippingAddress?.street}, {orderCompleted.shippingAddress?.unionWard ? `${orderCompleted.shippingAddress.unionWard}, ` : ''}{orderCompleted.shippingAddress?.upazila ? `${orderCompleted.shippingAddress.upazila}, ` : ''}{orderCompleted.shippingAddress?.district || orderCompleted.shippingAddress?.city || ''}{orderCompleted.shippingAddress?.division ? `, ${orderCompleted.shippingAddress.division}` : ''}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1 text-base font-bold text-gray-900 tabular-nums">
            <span>{isPaid ? 'Total Paid' : isCod ? 'Amount Due on Delivery' : 'Order Total (Unpaid)'}</span>
            <span className="text-emerald-800">{formatBDT(Number(orderCompleted.finalTotal || 0))}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          {isUnpaidOnline && (
            <button
              type="button"
              disabled={retryingPayment}
              onClick={() =>
                handleRetryOnlinePayment(
                  orderCompleted.orderNumber,
                  orderCompleted.paymentMethod as 'sslcommerz' | 'bkash'
                )
              }
              className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${retryingPayment ? 'animate-spin' : ''}`} />
              <span>Retry {orderCompleted.paymentMethod.toUpperCase()} Payment</span>
            </button>
          )}
          <button
            onClick={() => onOrderSuccess(orderCompleted)}
            className="w-full sm:w-auto px-7 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md cursor-pointer"
          >
            View Order Status
          </button>
          <button
            onClick={onNavigateToShop}
            className="w-full sm:w-auto px-7 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs sm:text-sm rounded-xl transition cursor-pointer"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  // If no selected checkout items exist, show clean empty state
  if (checkoutItems.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto mb-2">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">No Items Selected for Checkout</h2>
        <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
          Select at least one product in your cart or browse the catalog to start your order.
        </p>
        <button
          onClick={onNavigateToShop}
          className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-sm cursor-pointer"
        >
          Explore Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#f9fafb] pb-20 pt-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* 1. Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-4 select-none">
          <button
            onClick={onNavigateToShop}
            className="hover:text-emerald-700 transition cursor-pointer text-gray-500 font-medium"
          >
            Home
          </button>
          <span>&gt;</span>
          <span className="text-gray-800 font-medium">Checkout</span>
        </nav>

        {/* 2. Top Hero Header Banner (Faithful to Reference Image) */}
        <div className="relative rounded-2xl bg-gradient-to-r from-emerald-50/90 via-[#f0fdf4] to-emerald-100/50 border border-emerald-100 p-6 sm:p-8 mb-8 overflow-hidden shadow-2xs">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pr-0 lg:pr-32">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0c261e] tracking-tight">
                Secure Checkout
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 font-normal">
                Complete your purchase with confidence
              </p>
            </div>

            {/* 4 Trust Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 shrink-0">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-1.5 shadow-2xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <span className="text-[11px] font-semibold text-gray-800 leading-tight">
                  100% Secure
                </span>
                <span className="text-[10px] text-gray-500">Payment</span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-1.5 shadow-2xs">
                  <Truck className="w-5 h-5 text-emerald-700" />
                </div>
                <span className="text-[11px] font-semibold text-gray-800 leading-tight">
                  Fast &amp; Free
                </span>
                <span className="text-[10px] text-gray-500">Shipping</span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-1.5 shadow-2xs">
                  <Headphones className="w-5 h-5 text-emerald-700" />
                </div>
                <span className="text-[11px] font-semibold text-gray-800 leading-tight">
                  24/7 Customer
                </span>
                <span className="text-[10px] text-gray-500">Support</span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-1.5 shadow-2xs">
                  <RotateCcw className="w-5 h-5 text-emerald-700" />
                </div>
                <span className="text-[11px] font-semibold text-gray-800 leading-tight">
                  30 Days
                </span>
                <span className="text-[10px] text-gray-500">Return Policy</span>
              </div>
            </div>
          </div>

          {/* Decorative ShopMax Shopping Bag & Parcel Gift Art on Far Right */}
          <div className="absolute -right-2 -bottom-2 hidden lg:flex items-end gap-2 pointer-events-none select-none z-0">
            {/* Delivery parcel box */}
            <div className="w-16 h-12 rounded-lg bg-[#c49a6c] shadow-lg border border-[#a87a4a] relative overflow-hidden flex flex-col justify-end p-1">
              <div className="h-2 w-full bg-[#a87a4a]/40 rounded-sm mb-1" />
              <div className="flex justify-between items-center px-1">
                <div className="w-3 h-1.5 bg-[#8b6138] rounded-xs" />
                <div className="w-4 h-1 bg-[#8b6138] rounded-xs" />
              </div>
            </div>

            {/* Premium ShopMax Shopping Bag */}
            <div className="w-24 h-32 rounded-t-2xl bg-gradient-to-b from-[#0b533b] to-[#063b29] shadow-2xl border-2 border-emerald-500/30 flex flex-col items-center justify-between p-2.5 relative">
              {/* Bag Handles */}
              <div className="w-12 h-6 border-2 border-white/60 rounded-t-full -mt-6" />
              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center mb-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-300" />
                </div>
                <span className="text-white font-extrabold text-[11px] tracking-tight">ShopMax</span>
                <span className="text-emerald-200/60 text-[8px] uppercase tracking-wider">Premium</span>
              </div>
              <div className="w-full h-1 bg-emerald-400/30 rounded-full mb-1" />
            </div>
          </div>
        </div>

        {/* 3. Reactive Checkout Stepper Bar */}
        <div className="max-w-4xl mx-auto mb-10 px-2 sm:px-6">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            {/* Step 1: Contact Information */}
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 transition ${
                  step1Complete
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-800 text-white ring-2 ring-emerald-200'
                }`}
              >
                {step1Complete ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
              </span>
              <span className="text-gray-900 font-bold text-xs sm:text-sm">
                Contact Information
              </span>
            </div>

            <div className={`flex-1 h-[2px] mx-3 hidden sm:block ${step1Complete ? 'bg-emerald-600' : 'bg-gray-200'}`} />

            {/* Step 2: Shipping Address */}
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 transition ${
                  step2Complete
                    ? 'bg-emerald-700 text-white'
                    : step1Complete
                    ? 'bg-emerald-800 text-white ring-2 ring-emerald-200'
                    : 'border border-gray-300 text-gray-500'
                }`}
              >
                {step2Complete ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '2'}
              </span>
              <span className={`${step1Complete || step2Complete ? 'text-gray-900 font-bold' : 'text-gray-500'} text-xs sm:text-sm hidden sm:inline`}>
                Shipping Address
              </span>
            </div>

            <div className={`flex-1 h-[2px] mx-3 hidden sm:block ${step2Complete ? 'bg-emerald-600' : 'bg-gray-200'}`} />

            {/* Step 3: Payment Method */}
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 transition ${
                  step1Complete && step2Complete && step3Complete
                    ? 'bg-emerald-700 text-white'
                    : 'border border-gray-300 text-gray-500'
                }`}
              >
                {step1Complete && step2Complete && step3Complete ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '3'}
              </span>
              <span className={`${step2Complete ? 'text-gray-900 font-bold' : 'text-gray-500'} text-xs sm:text-sm hidden sm:inline`}>
                Payment Method
              </span>
            </div>

            <div className={`flex-1 h-[2px] mx-3 hidden sm:block ${step1Complete && step2Complete ? 'bg-emerald-600' : 'bg-gray-200'}`} />

            {/* Step 4: Review & Confirm */}
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 ${
                  step1Complete && step2Complete
                    ? 'bg-emerald-800 text-white ring-2 ring-emerald-200'
                    : 'border border-gray-300 text-gray-500'
                }`}
              >
                4
              </span>
              <span className={`${step1Complete && step2Complete ? 'text-gray-900 font-bold' : 'text-gray-500'} text-xs sm:text-sm hidden sm:inline`}>
                Review &amp; Confirm
              </span>
            </div>
          </div>
        </div>

        {/* 4. Main Two-Column Layout */}
        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Cards 1 to 4 (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: Contact Information */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-7 shadow-2xs space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-full bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="text-sm font-bold">1</span>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">
                    1. Contact Information
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    We'll use this email to send you order updates.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Email Address <span className="text-emerald-700">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Phone Number <span className="text-emerald-700">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 17XX XXXXXX"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 bg-white transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700 font-medium">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-800 accent-emerald-800 cursor-pointer"
                  />
                  <span>Keep me updated on news and exclusive offers</span>
                </label>

                {!isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => dispatch(openAuthModal({ mode: 'login', returnUrl: '/checkout' }))}
                    className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold underline cursor-pointer"
                  >
                    Already have an account? Sign in
                  </button>
                )}
              </div>
            </div>

            {/* Card 2: Shipping Address */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-7 shadow-2xs space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-full bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">
                    2. Shipping Address
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Enter your shipping address to get your order delivered.
                  </p>
                </div>
              </div>

              {/* Saved Address Quick Selector if Authenticated */}
              {user?.addresses && user.addresses.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                  <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
                    Saved Addresses
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {user.addresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => {
                          setFullName(addr.name);
                          setPhone(addr.phone);
                          setStreetAddress(addr.street);
                          const div = addr.division || 'Dhaka';
                          const dist = addr.district || 'Dhaka';
                          const upz = addr.upazila || (getUpazilas(div, dist)[0] || 'Dhanmondi');
                          const union = addr.unionWard || (getUnionsOrWards(div, dist, upz)[0] || 'Ward 15');
                          setDivisionState(div);
                          setDistrictState(dist);
                          setUpazilaState(upz);
                          setUnionWardState(union);
                          setPostalCode(addr.postalCode || '1205');
                          dispatch(setDivision(div));
                        }}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition font-medium cursor-pointer ${
                          streetAddress === addr.street
                            ? 'border-emerald-700 bg-emerald-50 text-emerald-900 font-bold'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {addr.name} ({addr.district})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Full Name <span className="text-emerald-700">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Recipient full name"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Address <span className="text-emerald-700">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="House, Road, Block, Area"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 bg-white transition"
                  />
                </div>

                {/* 4-Tier Cascading Administrative Bangladesh Locations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Division <span className="text-emerald-700">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={division}
                        onChange={(e) => handleDivisionChange(e.target.value)}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 bg-white cursor-pointer appearance-none pr-8"
                      >
                        {getDivisions().map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      District <span className="text-emerald-700">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={district}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        disabled={!division}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 bg-white cursor-pointer appearance-none pr-8 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        {getDistricts(division).map((dist) => (
                          <option key={dist} value={dist}>
                            {dist}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Upazila / Thana <span className="text-emerald-700">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={upazila}
                        onChange={(e) => handleUpazilaChange(e.target.value)}
                        disabled={!district}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 bg-white cursor-pointer appearance-none pr-8 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        {getUpazilas(division, district).map((upz) => (
                          <option key={upz} value={upz}>
                            {upz}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Union / Ward <span className="text-emerald-700">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={unionWard}
                        onChange={(e) => setUnionWardState(e.target.value)}
                        disabled={!upazila}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 bg-white cursor-pointer appearance-none pr-8 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        {getUnionsOrWards(division, district, upazila).map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Postal Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 1205"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 bg-white transition"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 select-none">
                <input
                  type="checkbox"
                  id="saveAddressCheckbox"
                  checked={saveAddressForNextTime}
                  onChange={(e) => setSaveAddressForNextTime(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-800 accent-emerald-800 cursor-pointer"
                />
                <label
                  htmlFor="saveAddressCheckbox"
                  className="text-xs text-gray-700 font-medium cursor-pointer"
                >
                  Save this address for next time
                </label>
              </div>
            </div>

            {/* Card 3: Shipping Method */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-7 shadow-2xs space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-full bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">
                    3. Shipping Method
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Choose your preferred shipping option.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {/* Option 1: Standard Shipping (FREE or Standard BDT Rate) */}
                <div
                  onClick={() => handleSelectShippingMethod('standard')}
                  className={`flex items-center justify-between p-4 rounded-xl border transition cursor-pointer ${
                    shippingMethodId === 'standard'
                      ? 'border-emerald-600 bg-emerald-50/20 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                        shippingMethodId === 'standard'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {shippingMethodId === 'standard' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                      <Truck className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="text-xs sm:text-sm font-bold text-gray-900">
                        Standard Shipping
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">3-5 business days</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-emerald-800">
                      {subtotal >= 2500 ? formatBDT(0) : formatBDT(division === 'Dhaka' ? 60 : 120)}
                    </span>
                    {subtotal >= 2500 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider">
                        FREE
                      </span>
                    )}
                  </div>
                </div>

                {/* Option 2: Express Shipping (৳150) */}
                <div
                  onClick={() => handleSelectShippingMethod('express')}
                  className={`flex items-center justify-between p-4 rounded-xl border transition cursor-pointer ${
                    shippingMethodId === 'express'
                      ? 'border-emerald-600 bg-emerald-50/20 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                        shippingMethodId === 'express'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {shippingMethodId === 'express' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                      <Truck className="w-4 h-4 text-emerald-700" />
                    </div>

                    <div>
                      <div className="text-xs sm:text-sm font-bold text-gray-900">
                        Express Shipping
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">1-2 business days</div>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs sm:text-sm font-bold text-gray-900">{formatBDT(150)}</span>
                  </div>
                </div>

                {/* Option 3: Next Day Delivery (৳250) */}
                <div
                  onClick={() => handleSelectShippingMethod('next_day')}
                  className={`flex items-center justify-between p-4 rounded-xl border transition cursor-pointer ${
                    shippingMethodId === 'next_day'
                      ? 'border-emerald-600 bg-emerald-50/20 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                        shippingMethodId === 'next_day'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {shippingMethodId === 'next_day' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                      <Truck className="w-4 h-4 text-purple-700" />
                    </div>

                    <div>
                      <div className="text-xs sm:text-sm font-bold text-gray-900">
                        Next Day Delivery
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Next day (order before 2 PM)
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs sm:text-sm font-bold text-gray-900">{formatBDT(250)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Payment Method */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-7 shadow-2xs space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-full bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">
                    4. Payment Method
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Select your payment method.
                  </p>
                </div>
              </div>

              {/* 4 Honest Payment Method Cards (Cash on Delivery, SSLCOMMERZ Gateway, bKash Tokenized, Nagad DFS) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {/* Method 1: Cash on Delivery */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition relative flex flex-col items-center text-center justify-center gap-1.5 ${
                    paymentMethod === 'cod'
                      ? 'border-emerald-600 bg-emerald-50/30 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {paymentMethod === 'cod' && (
                    <div className="absolute top-2.5 left-2.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                  <Banknote className="w-5 h-5 text-emerald-800" />
                  <span className="text-xs font-bold text-gray-900">Cash on Delivery</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Pay at doorstep</span>
                </button>

                {/* Method 2: SSLCOMMERZ (Cards & Net Banking) */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('sslcommerz')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition relative flex flex-col items-center text-center justify-center gap-1.5 ${
                    paymentMethod === 'sslcommerz'
                      ? 'border-emerald-600 bg-emerald-50/30 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {paymentMethod === 'sslcommerz' && (
                    <div className="absolute top-2.5 left-2.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                  <CreditCard className="w-5 h-5 text-[#1E3A8A]" />
                  <span className="text-xs font-bold text-gray-900">SSLCOMMERZ</span>
                  <span className="text-[10px] text-blue-700 font-semibold">
                    {gatewayConfig?.sslcommerz ? 'Cards & Banking' : 'Card / Bank'}
                  </span>
                </button>

                {/* Method 3: bKash */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bkash')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition relative flex flex-col items-center text-center justify-center gap-1.5 ${
                    paymentMethod === 'bkash'
                      ? 'border-emerald-600 bg-emerald-50/30 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {paymentMethod === 'bkash' && (
                    <div className="absolute top-2.5 left-2.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                  <Smartphone className="w-5 h-5 text-[#E2136E]" />
                  <span className="text-xs font-bold text-gray-900">bKash</span>
                  <span className="text-[10px] text-[#E2136E] font-semibold">
                    {gatewayConfig?.bkash ? 'Live Tokenized' : 'Tokenized Wallet'}
                  </span>
                </button>

                {/* Method 4: Nagad */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('nagad')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition relative flex flex-col items-center text-center justify-center gap-1.5 ${
                    paymentMethod === 'nagad'
                      ? 'border-emerald-600 bg-emerald-50/30 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {paymentMethod === 'nagad' && (
                    <div className="absolute top-2.5 left-2.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                  <div className="w-5 h-5 rounded-full bg-[#F7941D] text-white flex items-center justify-center text-[10px] font-black">
                    ন
                  </div>
                  <span className="text-xs font-bold text-gray-900">Nagad</span>
                  <span className="text-[10px] text-[#D97706] font-semibold">
                    {gatewayConfig?.nagad ? 'Live DFS' : 'Postal DFS'}
                  </span>
                </button>
              </div>

              {/* Cash on Delivery note */}
              {paymentMethod === 'cod' && (
                <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs text-emerald-950 space-y-1">
                  <span className="font-bold block">Cash on Delivery (Doorstep Verification)</span>
                  <p className="text-[11px] text-emerald-800">
                    No upfront card entry required. Pay the courier rider upon inspecting your sealed parcel.
                  </p>
                </div>
              )}

              {/* bKash note */}
              {paymentMethod === 'bkash' && (
                <div className="p-4 bg-[#fdeaf2] border border-[#f7c2d9] rounded-xl text-xs text-[#80073c] space-y-1">
                  <span className="font-bold block">bKash Tokenized Checkout</span>
                  <p className="text-[11px] text-[#9c1350]">
                    {gatewayConfig?.bkash
                      ? 'You will be redirected to bKash to authorize payment via OTP & PIN. Order marks Paid only after server verification.'
                      : 'Live bKash merchant keys are not configured in this environment. Placing the order records it as Unpaid (Pending) so you can retry once configured.'}
                  </p>
                </div>
              )}

              {/* Nagad note */}
              {paymentMethod === 'nagad' && (
                <div className="p-4 bg-[#fffbeb] border border-[#fde68a] rounded-xl text-xs text-[#92400e] space-y-1">
                  <span className="font-bold block">Nagad Direct Payment (Bangladesh Post Office DFS)</span>
                  <p className="text-[11px] text-[#b45309]">
                    {gatewayConfig?.nagad
                      ? 'You will be redirected to the official Nagad gateway portal to authorize payment. Payment is verified server-to-server.'
                      : 'Live Nagad merchant credentials (NAGAD_MERCHANT_ID) are not configured in this environment. Placing the order records it as Unpaid (Pending) safely.'}
                  </p>
                </div>
              )}

              {/* SSLCOMMERZ note */}
              {paymentMethod === 'sslcommerz' && (
                <div className="p-4 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl text-xs text-[#1e3a8a] space-y-1">
                  <span className="font-bold block">SSLCOMMERZ Hosted Gateway (Visa, Mastercard, AMEX, Net Banking)</span>
                  <p className="text-[11px] text-[#2563eb]">
                    {gatewayConfig?.sslcommerz
                      ? 'Card details are entered exclusively on the PCI-DSS hosted SSLCOMMERZ page and verified server-to-server.'
                      : 'Live SSLCOMMERZ store credentials are not configured in this environment. Placing the order records it as Unpaid (Pending) without collecting raw card details.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sticky Order Summary & Shop with Confidence (5 cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            {/* Order Summary Card */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-7 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Order Summary</h3>
                <span className="text-xs font-medium text-gray-500 tabular-nums">
                  {lineItemsCount} selected {lineItemsCount === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Line Items List with Exact Stepper & Delete */}
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {checkoutItems.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId || 'default'}`}
                    className="flex items-start gap-3.5 pb-4 border-b border-gray-50 last:border-b-0 last:pb-0"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      onError={handleImageFallback}
                      className="w-16 h-16 rounded-xl object-cover bg-gray-50 border border-gray-100 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">
                          {item.name}
                        </h4>
                        <button
                          type="button"
                          onClick={() =>
                            dispatch(
                              removeFromCart({
                                productId: item.productId,
                                variantId: item.variantId,
                              })
                            )
                          }
                          className="text-gray-400 hover:text-rose-500 transition cursor-pointer p-0.5 shrink-0"
                          title="Remove item"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {item.variantName || 'Standard Edition'}
                      </div>

                      <div className="flex items-center justify-between mt-2.5">
                        {/* Quantity Stepper */}
                        <div className="inline-flex items-center border border-gray-200 rounded-lg bg-gray-50/50">
                          <button
                            type="button"
                            onClick={() =>
                              dispatch(
                                updateQuantity({
                                  productId: item.productId,
                                  variantId: item.variantId,
                                  quantity: Math.max(1, item.quantity - 1),
                                })
                              )
                            }
                            className="p-1 px-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-l-lg transition cursor-pointer disabled:opacity-40"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-semibold text-gray-900 min-w-5 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              dispatch(
                                updateQuantity({
                                  productId: item.productId,
                                  variantId: item.variantId,
                                  quantity: item.quantity + 1,
                                })
                              )
                            }
                            className="p-1 px-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-r-lg transition cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Line Total */}
                        <span className="text-xs sm:text-sm font-bold text-gray-900">
                          {formatBDT((item.salePrice || item.price) * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code Box */}
              <div className="pt-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value)}
                      placeholder="Enter promo code"
                      className="w-full text-xs pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-700 bg-white"
                    />
                    <Tag className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyPromoCode}
                    disabled={validatingCoupon}
                    className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {validatingCoupon ? '...' : 'Apply'}
                  </button>
                </div>

                {/* Applied Coupon Pill */}
                {coupon && (
                  <div className="flex items-center justify-between mt-2.5 p-2 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="font-bold">{coupon.code}</span>
                      <span className="text-emerald-700 font-medium">
                        ({coupon.discountType === 'percentage' ? `${coupon.discountValue}% off` : `${formatBDT(coupon.discountValue)} off`})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-emerald-800 hover:text-rose-600 font-bold text-[11px] cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Financial Calculation Breakdown matching reference */}
              <div className="pt-3 border-t border-gray-100 space-y-2.5 text-xs text-gray-600">
                <div className="flex justify-between items-center">
                  <span>Subtotal ({lineItemsCount} items)</span>
                  <span className="font-semibold text-gray-900">{formatBDT(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Shipping</span>
                  <span className="font-semibold text-gray-900">
                    {shippingFee === 0 ? 'FREE' : formatBDT(shippingFee)}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between items-center text-emerald-700 font-medium">
                    <span>Discount</span>
                    <span className="font-bold">-{formatBDT(discount)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-100 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-gray-900">Total (BDT)</span>
                  <span className="text-2xl font-extrabold text-emerald-700">
                    {formatBDT(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Primary Place Order Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-md shadow-emerald-950/15 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Place Order</span>
                  </>
                )}
              </button>

              {/* Legal disclaimer */}
              <p className="text-[11px] text-gray-500 text-center leading-normal">
                By placing your order, you agree to our{' '}
                <button
                  type="button"
                  onClick={() => setLegalModal('terms')}
                  className="text-gray-800 font-semibold hover:underline cursor-pointer"
                >
                  Terms &amp; Conditions
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => setLegalModal('privacy')}
                  className="text-gray-800 font-semibold hover:underline cursor-pointer"
                >
                  Privacy Policy
                </button>
                .
              </p>
            </div>

            {/* Shop with Confidence Card */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                    Shop with Confidence
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-gray-500">
                    Your information is safe and secure with us.
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-100 shrink-0">
                    <Lock className="w-3.5 h-3.5 text-emerald-700" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 block leading-tight">
                      Verified Checkout
                    </span>
                    <span className="text-[11px] text-gray-500">Server-validated pricing &amp; stock</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-100 shrink-0">
                    <Truck className="w-3.5 h-3.5 text-emerald-700" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 block leading-tight">
                      Free Shipping
                    </span>
                    <span className="text-[11px] text-gray-500">On orders over ৳2,500</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-100 shrink-0">
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 block leading-tight">
                      30 Days Money Back
                    </span>
                    <span className="text-[11px] text-gray-500">Hassle-free returns</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-100 shrink-0">
                    <Headphones className="w-3.5 h-3.5 text-emerald-700" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 block leading-tight">
                      24/7 Support
                    </span>
                    <span className="text-[11px] text-gray-500">We're here to help</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Terms & Privacy Modal */}
      <Modal
        isOpen={legalModal !== null}
        onClose={() => setLegalModal(null)}
        title={legalModal === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
        description="ShopMax Checkout Governance"
        maxWidth="lg"
      >
        {legalModal === 'terms' ? (
          <div className="space-y-3 text-xs sm:text-sm text-gray-600 leading-relaxed">
            <p>
              <strong className="text-gray-900">1. Server-Authoritative Pricing:</strong> Item prices, coupons, and shipping fees are recalculated on our server before order confirmation.
            </p>
            <p>
              <strong className="text-gray-900">2. Payment Verification:</strong> Cash on Delivery orders are payable upon parcel delivery. Online gateway orders (SSLCOMMERZ / bKash) transition to Paid strictly after server-side transaction verification.
            </p>
            <p>
              <strong className="text-gray-900">3. Cancellations &amp; Stock Restoration:</strong> Pending or confirmed orders cancelled prior to courier dispatch automatically restore reserved inventory.
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-xs sm:text-sm text-gray-600 leading-relaxed">
            <p>
              <strong className="text-gray-900">1. Zero Raw Card Storage:</strong> ShopMax never collects or stores raw card numbers or CVV codes on our servers.
            </p>
            <p>
              <strong className="text-gray-900">2. Delivery Privacy:</strong> Your phone number and shipping address are shared exclusively with our fulfillment team and assigned delivery courier.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
