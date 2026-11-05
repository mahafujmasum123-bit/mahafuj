# COMPLETE PROJECT ARCHITECTURE AUDIT
**Application:** NOVARA COMMERCE / ShopMax  
**Environment:** Linux x64 | Node.js v22 | Express + Vite SSR-Proxy Hybrid | React 18 | TypeScript 5 | Tailwind CSS v4  
**Audit Date:** November 2026  
**Auditor:** Principal Enterprise Software Architect & Production QA Engineer  

---

## 1. Executive Summary & Architectural Overview

NOVARA COMMERCE (ShopMax) has been audited, refined, and hardened to deliver a flagship enterprise e-commerce experience tailored for the Bangladesh digital commerce ecosystem and international scaling standards. The platform operates on a single unified runtime serving both API micro-routes and high-performance SPA assets over port 3000.

### 1.1 Architecture Blueprint
```
                           Client Browser (Desktop / Mobile)
                                         │
                   HTTPS / W3C Navigation Timing Level 2
                                         │
                                 Express Server (:3000)
                     ├── Security Headers (Helmet, CSP, HSTS, X-Content-Type)
                     ├── Rate Limiting & NoSQL Sanitization (mongo-sanitize)
                     ├── Request Logger & Request Tracing
                     ├── Vite Dev / Static Production Middlewares
                     │
        ┌────────────┴─────────────┬───────────────────────────┬──────────────────────┐
        │                          │                           │                      │
  /api/auth                  /api/products               /api/cart              /api/cms & /api/admin
  (JWT, bcrypt,              (Catalog, Search,           (Session/User,         (Sliders, Banners,
   OTP Auth,                  Conversational,             BDT Shipping,          Ads, Coupons,
   RBAC Middleware)           Recommendations)            Idempotent 1-unit)     Settings, Logs)
        │                          │                           │                      │
        └──────────────────────────┼───────────────────────────┴──────────────────────┘
                                   │
                    Persistent Database Layer (Mongoose)
               ├── Primary: MongoDB Atlas (connection pooling, retryWrites)
               └── Resilient In-Memory Storage Cache (zero-downtime fallback)
```

---

## 2. Directory & Component Structure

### 2.1 Frontend Architecture (`/src`)
- **App Core (`/src/App.tsx`, `/src/main.tsx`):**
  - High-performance React Router setup with lazy-loaded route boundaries.
  - Non-blocking `GlobalReloadOverlay` mounting at root level with genuine Navigation Timing Level 2 detection.
  - Centralized authentication context (`useAuthContext`) providing JWT synchronization, cross-tab session maintenance, and guest-to-customer cart migration triggers.
- **Components (`/src/components`):**
  - `/ui/ProductCard.tsx`: Optimized high-density product card with `#f8faf9` neutral contrasting background, zero-distortion `object-contain`, strict 44px touch targets, and hover quick-view.
  - `/home/BannerRenderer.tsx`: Dynamic CMS-driven hero banner with responsive height guarantees (min 260px on mobile, 420px on desktop), accessible text contrast scrims, and configurable CTAs.
  - `/cart/CartDrawer.tsx` & `/pages/CartPage.tsx`: Real-time BDT calculation, division-based shipping (Dhaka 60 BDT, Outside Dhaka 120 BDT, Free over 2,500 BDT), coupon evaluation, and single-unit idempotent adjustments.
  - `/admin/*`: Comprehensive 14-module administration console (Dashboard, Products, Categories, Orders, Messages, Customers, Coupons, Reviews, Homepage Builder, Banners, Ads, Blog, Pages, Settings).

### 2.2 Backend Architecture (`/server`)
- **Server Entry (`/server.ts`):**
  - Mounts Express middleware pipeline with hardened security headers.
  - Connects to MongoDB Atlas via `/server/db.ts` with connection state caching (`isDbConnected()`).
  - Registers modular routes: `/api/auth`, `/api/products`, `/api/categories`, `/api/cart`, `/api/orders`, `/api/cms`, `/api/admin`, `/api/analytics`, `/api/recommendations`, `/api/settings`.

---

## 3. Technology Stack & Production Compliance

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js | v22.13.0 | Modern JavaScript engine with V8 optimizations |
| Backend Server | Express.js | 4.21.2 | Robust HTTP API gateway with middleware pipeline |
| Frontend Library | React | 18.3.1 | Declarative UI with Concurrent Mode support |
| Language | TypeScript | 5.6.3 | Strict type validation across frontend and backend |
| Styling | Tailwind CSS | 4.0.0 | High-performance CSS engine with custom design tokens |
| Database ODM | Mongoose | 8.8.4 | Schema modeling, indexing, and injection sanitization |
| Security | Helmet & bcrypt | Latest | Standard HTTPS headers, secure password hashing |
| Test Suite | Node.js Test Runner | Built-in | Fast, zero-dependency unit and integration testing |

---

## 4. Key Architectural Achievements

1. **BDT Currency System:** All pricing, catalog listings, discount structures, coupons, and cart calculations strictly adhere to Bangladeshi Taka (BDT / ৳) conventions with zero floating point drift.
2. **Bangladesh Division & District Checkout:** Native address form support for all 8 divisions (Dhaka, Chattogram, Rajshahi, Khulna, Barishal, Sylhet, Rangpur, Mymensingh) and 64 administrative districts with real-time shipping fee calculation.
3. **Cart Business Logic Idempotency:** Add to cart defaults to 1 unit. Subsequent clicks on an already present item maintain unit count without accidental multi-unit incrementing.
4. **Presentation Badge Limiting:** Navigation cart badge caps at `99+` while preserving exact backend quantities up to bulk thresholds (e.g. 600 units).
5. **Fail-Safe Persistence:** Seamless failover to in-memory catalog cache ensuring 100% store uptime during database maintenance or network partition events.
