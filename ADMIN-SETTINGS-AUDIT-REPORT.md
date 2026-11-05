# ADMIN SETTINGS & STORE CONFIGURATION AUDIT REPORT
**Application:** NOVARA COMMERCE / ShopMax  
**Module:** System Settings (General, Payments, Shipping, Email & SMTP, Infrastructure)  
**Status:** Completed & Production Verified  

---

## 1. Executive Summary
A comprehensive audit of the administrative configuration subsystem has been conducted. Previously, several settings panels either operated in isolation or relied on client-side state without persisting to backend databases or dynamically driving checkout calculations. 

All four core setting domains (General Store, Payment Gateways, Shipping & Delivery, Email & SMTP) are now fully wired to MongoDB via `server/models/Settings.ts` and Express endpoints (`server/routes/adminRoutes.ts`). Administrative configuration immediately dictates live checkout behavior, payment gateway availability, shipping rate calculations, order notifications, and audit tracking.

---

## 2. Setting Domains & Technical Verification

### A. General Store Settings
- **Configuration Keys:** Store Name, Legal Entity, Support Email, Support Hotline, Physical Address, Default Currency (BDT ৳), Timezone (`Asia/Dhaka`), Social Media links.
- **Storefront Propagation:** Propagated to customer navbar, footer, copyright text, order confirmation headers, and meta tags.
- **Endpoint:** `GET /api/admin/settings`, `PUT /api/admin/settings` (with atomic audit log recording).

### B. Payment Gateways Architecture
- **Supported Providers:**
  1. **Cash on Delivery (COD):** Standalone, resilient offline payment method. Fully functional without requiring any third-party API credentials.
  2. **bKash (Direct Merchant & Checkout API):** Supports App Key, App Secret, Username, Password, Sandbox vs Production toggle.
  3. **Nagad (Direct DFS API):** Supports Merchant ID, Public Key, Private Key, Base URL.
  4. **SSLCommerz (Hosted Session Gateway):** Supports Store ID, Store Password, Sandbox vs Live toggle.
- **Security & Secret Masking:**
  - Client GET requests receive masked secret representations (`••••••••`) to prevent browser credential leaks.
  - Form edits retain existing secret keys if the field is not modified or left as masked dots.
  - Live checkout gateway status query (`paymentService.getPaymentGatewayConfigStatus()`) queries active settings dynamically, enabling or disabling gateway options on checkout accordingly.

### C. Shipping & Delivery Engine
- **Live Pricing Matrix:**
  - `freeShippingThreshold`: Minimum subtotal in BDT to qualify for 100% free standard shipping (e.g. ৳2,500).
  - `insideDhakaFee`: Courier delivery charge within Dhaka division (e.g. ৳60 or ৳80).
  - `outsideDhakaFee`: National courier delivery charge across all 7 non-Dhaka divisions (e.g. ৳120 or ৳150).
  - `expressFee`: Express next-day delivery flat surcharge (e.g. ৳150).
- **Checkout Total Calculation:**
  - Server route `/api/checkout/quote` reads `getActiveSettings()` and passes live administrative rates into `calculateCartTotals()`.
  - Frontend cart and checkout views recalculate subtotal, discount, shipping fee, and grand total in real-time as customer switches shipping destination or method.

### D. Email & SMTP Architecture
- **Configuration:** Host, Port (587 / 465), Secure (TLS / SSL), Auth Username, Auth Password (masked), Sender Name, Sender Email.
- **Live Verification Tool:**
  - Dedicated "Send Live Verification Test Email" button in the admin interface.
  - Calls `POST /api/admin/settings/email/test` with recipient address.
  - Dispatches test message and returns precise SMTP handshake logs or diagnostics.
  - Automatically handles mock fallback mode when SMTP credentials are unset or invalid, preventing server crashes.

---

## 3. Configuration Security Matrix

| Security Control | Implementation Detail | Audit Outcome |
| :--- | :--- | :--- |
| **Masked Secret Distribution** | Credentials returned as masked dots to non-superadmin views | **PASSED** |
| **Tamper-Proof Retention** | Submitting unchanged masked fields preserves stored secrets | **PASSED** |
| **RBAC Enforcement** | Settings update endpoints require `role: 'admin'` or `'superadmin'` | **PASSED** |
| **Audit Logging** | Every setting modification appends an immutable AuditLog entry | **PASSED** |
| **Fail-Safe Fallbacks** | Default settings fallback ensures store runs even if DB starts empty | **PASSED** |
