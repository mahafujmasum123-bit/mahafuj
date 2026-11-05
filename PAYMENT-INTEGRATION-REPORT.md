# Bangladesh Payment Gateways & Lifecycle Integration Report
**Application:** NOVARA COMMERCE / ShopMax  
**Integrated Methods:** Cash on Delivery (COD), bKash MFS, Nagad DFS, Card / SSLCOMMERZ  
**Status:** Implemented with Zero Fake Captures  
**Date:** November 2026  

---

## 1. Executive Summary

The payment subsystem has been engineered to support the four primary transaction channels utilized in Bangladesh e-commerce. All payment flows enforce strict cryptographic verification, tamper-resistant order amount checks, stock reservation safeguards, and clear operational messaging. Simulated fake captures and hardcoded success bypasses have been eradicated.

---

## 2. Integrated Payment Methods

### 2.1 Cash on Delivery (COD)
- **Status:** Permanently active across all 64 districts of Bangladesh.
- **Initial Lifecycle State:** `order.status = 'pending'`, `order.paymentStatus = 'unpaid'`.
- **Settlement Rule:** Transition to `paid` occurs solely when an administrator or fulfillment staff marks the order as `delivered` upon receiving cash from the courier partner (e.g., Steadfast, Pathao, RedX, eCourier).
- **Stock Impact:** Catalog stock is decremented immediately upon checkout placement to prevent overselling.

### 2.2 bKash Mobile Financial Services (MFS)
- **Gateway Type:** bKash Checkout URL (Payment Gateway API v1.2.0-beta).
- **Security Protocols:**
  - Tokenized grants via `app_key`, `app_secret`, and `username/password`.
  - Server-to-server payment creation (`POST /tokenized/checkout/create`).
  - Strict verification of `paymentID` and server-calculated catalog amount.
  - Rejection of mismatched currencies (`currency !== 'BDT'`).
- **Missing Credentials Behavior:** Displays structured configuration prompt with required environment variables (`BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD`).

### 2.3 Nagad Digital Financial Services (DFS)
- **Gateway Type:** Nagad Direct Payment API.
- **Security Protocols:**
  - RSA-2048 / RSA-4096 signature exchange (`X-KM-IP-V4`, `X-KM-Signature`).
  - Server-to-server initialization (`check-out/initialize`).
  - Direct server callback verification with payment reference ID validation.
- **Missing Credentials Behavior:** Informs customer that Nagad gateway is unconfigured and safely redirects customer to select Cash on Delivery without creating corrupt or fake paid orders.

### 2.4 SSLCOMMERZ (Credit / Debit Card & Multi-Bank Gateway)
- **Gateway Type:** SSLCOMMERZ Hosted Payment Session (v4).
- **Security Protocols:**
  - Server session initiation with customer shipping info, phone, and IP.
  - IPN (Instant Payment Notification) listener with validation via SSLCOMMERZ Validator API.
  - Re-verification of `val_id` and total amount matching the order's `finalTotal`.
- **Supported Channels:** Visa, Mastercard, UnionPay, Amex, DBBL Nexus, City Bank, BRAC Bank, and connected internet banking portals.

---

## 3. Order Lifecycle State Machine

The order fulfillment workflow enforces a unidirectional state machine preventing invalid status transitions:

```
[ pending ] ───────────► [ confirmed ] ───────────► [ processing ]
    │                          │                           │
    ▼                          ▼                           ▼
[ cancelled ]            [ cancelled ]               [ cancelled ]
                                                           │
                                                           ▼
                                                       [ packed ]
                                                           │
                                                           ▼
                                                      [ shipped ]
                                                           │
                                                           ▼
                                                      [ delivered ] ◄── (COD marks paid)
                                                           │
                                                           ▼
                                                      [ returned ] ◄── (Restores stock)
```

### 3.1 Stock Restoration Integrity
When an order transitions to `cancelled` or `returned`:
- `restoreOrderStockIdempotent()` checks `order.stockRestored` flag.
- Stock is replenished by the exact purchased item quantities.
- `order.stockRestored` is set to `true` to prevent duplicate increments.

---

## 4. Payment Re-Attempt Mechanism (`/api/payment/retry`)
- Customers with `unpaid` online orders can re-attempt checkout without recreating their cart or re-entering their 4-tier shipping address.
- Customers can switch payment methods (e.g., from an unconfigured card gateway to Cash on Delivery) dynamically from their Customer Account order dashboard.
