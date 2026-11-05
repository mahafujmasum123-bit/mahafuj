# PREMIUM DESIGN SYSTEM & ARCHITECTURE AUDIT REPORT
**Platform**: NOVARA COMMERCE / ShopMax
**Audit Date**: November 2026
**Lead Engineers**: Senior UI/UX Designer, Principal Frontend Architect, Full-Stack Production QA

---

## 1. Existing Frontend Architecture

### Core Stack & Framework
- **Runtime & SPA**: React 19.0.1 on Vite 8.3.0, bundled with `@vitejs/plugin-react` and `@tailwindcss/vite` 4.3.3.
- **Routing**: URL path-based routing in `src/App.tsx` with browser `pushState` / `popstate` synchronization (`/`, `/shop`, `/product/:slug`, `/cart`, `/checkout`, `/account`, `/wishlist`, `/blog`, `/about`, `/contact`, `/admin/*`).
- **State Management**: Redux Toolkit (`@reduxjs/toolkit` 2.13.0) with dedicated slices:
  - `authSlice.ts`: Authentication, user profile, JWT token, pending cart actions, auth modal state.
  - `cartSlice.ts`: Shopping cart items, lines count, subtotal, discount, VAT, shipping calculation, cart drawer toggle.
  - `uiSlice.ts`: Wishlist items, mobile drawer toggles, notification indicators.
  - `toastSlice.ts`: Global feedback notifications.
- **Context API**: `CartFlyContext.tsx` powering animated flying item particles into the cart badge.
- **Icons**: `lucide-react` (0.546.0).
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss";`), custom font `Plus Jakarta Sans` via Google Fonts.

---

## 2. Existing Backend & Database Architecture

### Backend Services
- **Server Engine**: Express 4.21.2 (`server.ts`) running on port 3000 (`0.0.0.0:3000`), with Vite middleware in development and static bundle serving in production.
- **API Modules**:
  - `/api/auth`: Login, registration, OTP verification, password reset, OAuth.
  - `/api/products`: Full catalog, pagination, keyword search, category filtering, related products (`/related?page=1&limit=15`).
  - `/api/categories`: Category CRUD with active status filtering.
  - `/api/cart`: Server-side cart persistence, sync, and stock validation.
  - `/api/checkout` & `/api/orders`: Order placement, stock deduction, cancellation, status progression.
  - `/api/cms` & `/api/homepage`: Dynamic homepage builder, sliders, banners, and advertisements.
  - `/api/payment`: SSLCommerz, bKash, Nagad, and Cash on Delivery (COD) workflows.
  - `/api/wishlist`: Multi-device synced wishlist storage.
- **Database & Data Store**:
  - MongoDB via Mongoose 9.11.4 with fail-safe in-memory fallback during local development.
  - `server/db.ts` enforces `bufferCommands: false` to fail fast and prevent hanging requests.
  - Seed catalog in `server/data/initialData.ts` containing 24+ rich products, 6 categories, default banners, and location matrices for all 8 divisions and 64 districts in Bangladesh.

---

## 3. Current Design System Analysis

- **Primary Color Palette**:
  - Deep Forest Brand: `#00875a` (Primary green), `#00724c` (Hover dark green), `#0c261e` (Header/banner dark green).
  - Accent / Highlights: `#10b981` (Emerald-500), `#34d399` (Emerald-400), `#d1fae5` (Emerald-100).
  - Canvas: Pure White `#ffffff` with subtle neutral surfaces (`#f8faf9`, `#fbfcfb`, `#f3f4f6`).
  - Text: Gray-900 `#111827`, Gray-700 `#374151`, Gray-500 `#6b7280`, Gray-400 `#9ca3af`.
- **Typography**: `Plus Jakarta Sans` (weights 300, 400, 500, 600, 700, 800) with `Caveat` for handwritten accents.
- **Radius Tokens**: `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-3xl` (24px), `rounded-full` (9999px).

---

## 4. Product Card & Image Problems Identified

1. **Card Inner Image Container Contrast & Ratio**:
   - `ProductCard.tsx` uses `bg-[#fbfcfb]` for the image container, which has weak contrast against the card's `#ffffff` body, making the product silhouette blend into the card rather than popping out.
   - The image container has `p-1 sm:p-1.5`, which in some aspect ratios restricts the visible image footprint.
2. **Hover Micro-Interactions**:
   - The hover state scales the image with `scale-105` without subtle optical containment, which can cause edge clipping if the image touches container borders.
3. **Card Dimension Parity Across Breakpoints**:
   - Fixed heights are properly avoided, but title lines need consistent clamp limits (`line-clamp-2` with `min-h-[2.5rem]`) so prices align precisely along the horizontal baseline across adjacent cards in multi-column grids.
4. **Action Affordance Touch Targets**:
   - The quick-add button is `w-8 h-8 sm:w-9 sm:h-9`. On touch screens, it needs a minimum 40px–44px comfortable tap boundary or touch padding to satisfy mobile accessibility standards.

---

## 5. Mobile Product Grid Problems Identified

1. **Explicit Mobile 1-Column Requirement**:
   - On small and standard mobile viewports (< 640px), product cards must render in a clean 1-column layout (`grid-cols-1`).
   - Audit found that while `HomePage.tsx` has `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`, certain secondary carousels or recommendations in other pages needed verification to guarantee strict 1-column display on small mobile devices without squishing items side-by-side.
2. **Card Visual Impact in Single-Column View**:
   - In 1-column mobile view, product images must occupy a prominent visual portion of the card without excessive white borders or bloated margins, allowing customers to easily inspect product features while scrolling.

---

## 6. Banner Rendering Problems Identified

1. **Dynamic Banner Container Heights & Aspect Ratios**:
   - In `BannerRenderer.tsx`, mobile height defaults to `220px`. For banners with headlines, subheadings, and action buttons, `220px` causes vertical text crowding on small screens (360px–390px wide).
   - Solution: Refine mobile banner container height to `min-h-[260px] sm:min-h-[340px] lg:min-h-[420px]` with responsive typography (`clamp(...)` or balanced line wrapping).
2. **Hero Slider Cropping**:
   - In `HomePage.tsx`, the Hero Slider container was set to `h-[220px] sm:h-[360px] lg:h-[480px]`. On 375px mobile screens, wide 16:9 images suffer center cropping. Introducing responsive height constraints improves readability without layout shifts.
3. **Image Overlay Contrast**:
   - Text over photography in promo banners requires consistent scrim gradients (`rgba(0,0,0,0.55)` to `rgba(0,0,0,0.2)`) to ensure WCAG AA contrast (4.5:1) regardless of image luminance.

---

## 7. Category Section Problems Identified

1. **Visual Hierarchy & Premium Card Presentation**:
   - In `HomePage.tsx`, category cards were using basic icon containers with subtle hover effects.
   - For a luxury, modern e-commerce storefront, category cards should feature refined surface elevations, high-contrast typography, crisp border tokens, and smooth scale transitions.
2. **Category Count & Data Integrity**:
   - The category showcase must load dynamically from the backend (`/api/categories?activeOnly=true`) and fall back safely to `INITIAL_CATEGORIES` while preserving real category slugs (`electronics`, `fashion`, `home-living`, etc.) and active filtering.

---

## 8. Existing Scrollbar Implementation

1. **Current State in `src/index.css`**:
   - A WebKit scrollbar implementation exists with `#10b981` thumb and `#f8faf9` track.
   - Needs refinement for cross-browser consistency (Firefox `scrollbar-color: #00875a #f1f5f3;`), touch smoothness, and prevention of unexpected horizontal scrollbars (`overflow-x: hidden` on viewport roots).
2. **Container Scrollbars**:
   - Tables in the admin panel and modal dialogue windows need consistent `custom-scrollbar` utility classes for elegant scrolling without obstructive system scrollbars.

---

## 9. Exact Files Requiring Modification

| File Path | Role & Changes |
|---|---|
| `src/index.css` | Global design tokens, scrollbar styling refinement, focus rings, accessibility styles |
| `src/components/ui/ProductCard.tsx` | Image container optimization, contrast surface, zero-distortion fitting, accessible quick-add tap targets |
| `src/pages/HomePage.tsx` | Mobile 1-column grid enforcement, premium category cards, responsive hero slider proportions |
| `src/components/banner/BannerRenderer.tsx` | Responsive heights, text contrast scrims, non-destructive image cropping |
| `src/pages/ShopPage.tsx` | Mobile 1-column grid refinement, filter drawer ergonomics, sort controls |
| `src/pages/ProductDetailPage.tsx` | Related products 1-column mobile grid, gallery image viewer |
| `src/pages/WishlistPage.tsx` | Wishlist grid responsiveness, recommendations card styling |
| `src/components/layout/Header.tsx` | Header navigation spacing, search bar alignment, mobile drawer elegance |
| `src/components/cart/CartDrawer.tsx` | Scrollbar, thumbnail dimensions, touch button padding |

---

## 10. Safe Implementation Plan

1. **Phase A — Global Tokens & Scrollbars (`src/index.css`)**:
   - Refine design tokens, responsive typography clamps, sleek cross-browser scrollbar rules, and zero horizontal overflow guards.
2. **Phase B — Product Card & Image Optimization (`src/components/ui/ProductCard.tsx`)**:
   - Optimize container background (`#f8faf9`), image padding, `object-contain`, and touch-accessible quick-add button.
3. **Phase C — Homepage Category Showcase & Hero Banners (`src/pages/HomePage.tsx`, `src/components/banner/BannerRenderer.tsx`)**:
   - Elevate category cards with premium styling, optimize banner heights and overlays, preserve all dynamic admin integrations.
4. **Phase D — Responsive Grid Standardization Across All Pages**:
   - Enforce strict 1-column on mobile (< 640px) for homepage, shop catalog, related products, recommendations, and wishlist.
5. **Phase E — Verification & Production Reports**:
   - Run automated test suite (`npm test`), build check (`compile_applet`), lint check (`lint_applet`), and generate all required documentation reports.
