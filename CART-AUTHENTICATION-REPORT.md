# Cart Authentication & Gate Enforcement Report

**Executive Summary**  
This document specifies the end-to-end gating architecture that restricts cart additions strictly to authenticated customers, the persistence engine for preserving purchase intent during signup, and the verified automated cart fulfillment workflow.

---

## 1. Authentication Gating Across Storefront Touchpoints

To prevent abandoned anonymous sessions and satisfy strict e-commerce order integrity, all cart mutation entry points enforce an authentication check prior to state changes:

| Surface / Component | Trigger | Unauthenticated Behavior | Post-Auth Recovery |
| :--- | :--- | :--- | :--- |
| **ProductCard** (`ProductCard.tsx`) | Quick "Add to Cart" button | Stores item to `pendingCartAction`, opens `AuthModal` in `'register'` mode, shows informational toast. | Auto-adds item, triggers flying animation & toast. |
| **Product Detail** (`ProductDetailPage.tsx`) | Primary "Add to Cart" button | Stores item + chosen variant + selected qty, opens `AuthModal` (`'register'`). | Dispatches item addition to cart store immediately. |
| **Product Detail** (`ProductDetailPage.tsx`) | "Buy Now" button | Captures item and opens `AuthModal` (`'register'`). | Adds item and routes user straight to `/checkout`. |
| **Wishlist** (`WishlistPage.tsx`) | Single item "Add to Cart" | Captures item and opens `AuthModal` (`'register'`). | Item added to cart; removed from wishlist. |
| **Wishlist** (`WishlistPage.tsx`) | Bulk "Move All to Cart" | Opens `AuthModal` (`'register'`) with warning. | Re-initiates bulk server sync and updates cart. |
| **Cart Page** (`CartPage.tsx`) | Recommended Carousel Quick-Add | Captures recommendation and opens `AuthModal` (`'register'`). | Automatically fulfills pending item into cart. |
| **Backend API** (`cartRoutes.ts`) | `POST /api/cart/add` | Validated by `requireAuth` middleware; rejects anonymous requests with `HTTP 401 Unauthorized`. | Authenticated request processes normally. |

---

## 2. The Pending Cart Action Engine

### 2.1 State Serialization
When an unauthenticated customer initiates an add-to-cart action, the application builds a standardized `PendingCartAction` object:
```typescript
interface PendingCartAction {
  action: 'add';
  item: {
    productId: string;
    variantId?: string;
    variantName?: string;
    sku: string;
    name: string;
    price: number;
    salePrice?: number;
    quantity: number;
    image: string;
    stock: number;
  };
}
```

### 2.2 Dual-Layer Storage Redundancy
1. **Redux Store (`authSlice.ts`)**: Fast, in-memory reactive state consumed directly by `AuthModal` when completing an inline registration or login.
2. **Local Storage (`localStorage.setItem('novara_pending_cart_v1', ...))`)**: Resilient browser storage that survives:
   - External OAuth popup redirects and browser refocus events.
   - Accidental page refreshes during social login.
   - Multi-tab browser sessions.

---

## 3. Automated Post-Authentication Fulfillment Lifecycle

```
[Customer Clicks "Add to Cart"]
            │
      Is Authenticated?
      ├─────► YES ─────► Add to Cart directly (Redux + API) ──► Show Success Toast
      │
      └─────► NO
               │
               ▼
        1. Serialize item into pendingCartAction + localStorage
        2. Dispatch openAuthModal({ mode: 'register' })
        3. Show Toast: "Account Required — Please create an account to add items to your cart."
               │
               ▼
        Customer Completes Auth (Local Registration, Login, Google, or Facebook)
               │
               ▼
        AuthModal Fulfillment Hook Fires:
        1. Reads pendingCartAction
        2. Dispatches addToCart(pendingCartAction.item)
        3. Syncs with POST /api/cart/add
        4. Shows Success Toast: "Added to Cart — Successfully added to your cart after authentication."
        5. Clears pendingCartAction from Redux and localStorage
```

---

## 4. Cart Presentation & Badge Metrics
- **Badge Calculation (`formatCartBadge`)**:
  - `0`: Badge hidden.
  - `1` – `99`: Displays exact count (e.g. `1`, `60`, `99`).
  - `> 99`: Displays `99+`.
- **Underlying Inventory Integrity**: While presentation displays `99+`, the underlying Redux cart accurately tracks unlimited line quantities (e.g. 60, 200, 600 units) with verified unit test assertion (`calculateCartTotals retains true totalQuantity`).
