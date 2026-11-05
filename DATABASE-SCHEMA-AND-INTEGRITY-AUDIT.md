# DATABASE SCHEMA AND INTEGRITY AUDIT REPORT
**Database Engine:** MongoDB Atlas via Mongoose 8.8.4  
**Failover Target:** Bounded In-Memory Operational Store  
**Audit Scope:** Data Models, Compound Indexes, Foreign Key Integrity, Schema Validation  

---

## 1. Schema Inventory & Field Integrity

### 1.1 Product Model (`server/models/Product.ts`)
- **Fields:**
  - `name`: String, required, trimmed.
  - `slug`: String, unique, indexed.
  - `sku`: String, unique index, uppercase normalized.
  - `brand`: String, indexed.
  - `category`: String, indexed.
  - `subcategory`: String, indexed.
  - `price`: Number, non-negative, currency BDT.
  - `salePrice`: Number, optional, must be `<= price`.
  - `stock`: Number, integer, default 0, non-negative.
  - `reservedStock`: Number, default 0 (order reservation buffer).
  - `ratingAverage`: Number (0.0 to 5.0), default 5.0.
  - `reviewCount`: Number, default 0.
  - `salesCount`: Number, default 0.
  - `badge`: String (e.g. '-22%', 'Hot', 'Premium', 'Best Seller').
  - `images`: Array of Image Objects (`{ url, isPrimary, alt }`).
  - `banglaKeywords`: Array of strings for bilingual token search.
  - `status`: Enum (`'draft' | 'published' | 'archived'`).
- **Compound Indexes:**
  - `{ status: 1, category: 1, price: 1 }` (Catalog filter optimization).
  - `{ name: 'text', brand: 'text', category: 'text', description: 'text' }` (Full-text index).

### 1.2 User & Customer Model (`server/models/User.ts`)
- **Fields:**
  - `email`: String, lowercase, unique, trimmed, RFC 5322 validation.
  - `password`: String (bcrypt hashed, min 10 rounds).
  - `role`: Enum (`'customer' | 'admin' | 'super_admin' | 'catalog_manager' | 'inventory_manager'`).
  - `phone`: String, optional (not required for customer registration).
  - `addresses`: Array of Bangladesh structured addresses (`division`, `district`, `upazila`, `streetAddress`, `postalCode`).
  - `loginFingerprint`: String (invalidated upon password reset).

### 1.3 Order Model (`server/models/Order.ts`)
- **Fields:**
  - `orderNumber`: String, unique, format `NOV-YYYYMMDD-XXXX`.
  - `customer`: Ref User or Guest Session identifier.
  - `items`: Array of Line Items (`productId`, `variantId`, `sku`, `name`, `unitPrice`, `quantity`, `subtotal`).
  - `pricing`: `{ subtotal, discount, shippingFee, finalTotal }` in BDT.
  - `shippingAddress`: Structured address with division & district.
  - `shippingMethod`: `'standard' | 'express' | 'next_day'`.
  - `payment`: `{ method: 'cod' | 'bkash' | 'nagad' | 'card', status: 'pending' | 'paid' | 'failed' }`.
  - `orderStatus`: State-machine controlled (`'pending' -> 'confirmed' -> 'processing' -> 'packed' -> 'shipped' -> 'delivered' | 'cancelled' | 'returned'`).

### 1.4 UserInteraction Model (`server/models/UserInteraction.ts`)
- **Fields:**
  - `userId` / `sessionId`: String, indexed.
  - `eventType`: Enum (`'product_view' | 'search' | 'search_click' | 'category_view' | 'order_complete'`).
  - `productId`: String, indexed.
  - `category`: String, indexed.
  - `searchQuery`: String, normalized.
  - `createdAt`: Date, indexed for time-decay weighting (7-day decay window).

---

## 2. Integrity Checks & Anti-Corruption Protections

1. **Idempotent Stock Restoration:** Order cancellations restore stock exactly once via an internal lock/flag check (`isStockRestored`).
2. **Duplicate Detection:** User interaction tracking deduplicates repeat hits within a 30-second window, preventing bot or spam distortion of recommendation models.
3. **Price Sanity Constraint:** Server-side order generation recomputes line prices directly from product catalog documents; client-submitted totals are ignored and rejected if altered.
4. **NoSQL Injection Sanitization:** Recursive parameter cleaner eliminates MongoDB operators (`$gt`, `$where`, `$regex`) from all unauthenticated input keys.
