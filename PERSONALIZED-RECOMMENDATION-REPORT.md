# PERSONALIZED RECOMMENDATION ENGINE ARCHITECTURE & PRODUCTION REPORT

**Date:** November 2026  
**System:** Novara Commerce Platform  
**Engine:** Behavioral Collaborative & Content-Based Scoring Engine with Recency Decay  
**Status:** FULLY INTEGRATED & TEST-VERIFIED

---

## 1. Architecture Overview

The Novara Recommendation Engine moves the platform from static, hardcoded product grids to a real-time behavioral personalization system. It captures customer purchase intent, search patterns, and browsing affinity, and translates them into dynamically ranked product recommendations.

```
+-----------------------------------------------------------------------------------+
|                                Client Applications                                |
|  - PDP Product Views (15s deduped)                                                |
|  - Search Queries & Autocomplete Clicks                                           |
|  - Category Explorations                                                          |
|  - Checkout Order Completions                                                     |
+-----------------------------------------------------------------------------------+
                                      |
                                      v  POST /api/recommendations/track
+-----------------------------------------------------------------------------------+
|                        Event Tracking & Session Ingestion                         |
|  - Anonymous Session UUID ('novara_interaction_session_id')                      |
|  - Authenticated Customer Bearer Token Resolution                                 |
|  - Mongoose Document Store with In-Memory Buffer Fallback                         |
+-----------------------------------------------------------------------------------+
                                      |
                                      v  GET /api/recommendations/personalized
+-----------------------------------------------------------------------------------+
|                        Weighted Scoring & Ranking Pipeline                        |
|  1. Event Weight Multipliers: Order (6.0) > Search (3.0) > Click (2.5) > View (1.0)|
|  2. Exponential Half-Life Time Decay (48-Hour Decay Constant)                    |
|  3. Catalog Candidate Filtering (Excludes current product & out-of-stock items)   |
|  4. Product Affinity Scoring (Category weight + Keyword overlap + Ratings)        |
|  5. Cold-Start Fallback (Featured & Bestseller items for new visitors)            |
+-----------------------------------------------------------------------------------+
```

---

## 2. Mathematical Scoring Model

### 2.1 Interaction Weight Hierarchy
Customer actions indicate different degrees of purchasing intent. A completed order signifies high conviction, while an impression or glance carries lower affinity. The engine scores interaction types according to the following hierarchy:

| Interaction Event (`eventType`) | Weight ($W_e$) | Rationale |
|---|---|---|
| `order_complete` | **6.0** | Definite purchase commitment; highest category and brand affinity. |
| `search` | **3.0** | High-intent explicit query for specific product types or features. |
| `search_click` | **2.5** | Confirmation that a particular search result resonated with the user. |
| `category_view` | **2.0** | Active category browsing interest across related subcategories. |
| `product_view` | **1.0** | Baseline product inspection and engagement. |

### 2.2 Recency Time-Decay Formulation
To prevent stale interactions from weeks ago dominating current browsing intent, weights decay over time using a continuous half-life formulation:

$$\text{Decay}(\Delta t) = 0.5^{\frac{\Delta t}{T_{\text{half}}}}$$

Where:
- $\Delta t$ is the elapsed time in hours between event creation and recommendation computation.
- $T_{\text{half}} = 48.0\text{ hours}$ (the half-life constant).

**Empirical Weight Decay Over Time:**
- $0\text{ hours (Immediate): } 1.000$ (100% of base weight)
- $24\text{ hours: } 0.707$ (70.7% of base weight)
- $48\text{ hours: } 0.500$ (50.0% of base weight)
- $96\text{ hours: } 0.250$ (25.0% of base weight)

### 2.3 Total Product Affinity Score
For every candidate product $P$ in the eligible active catalog, the cumulative personalization score is computed as:

$$\text{Score}(P) = \sum_{e \in \text{Interactions}} \left[ W_e \cdot \text{Decay}(\Delta t_e) \cdot \mathbb{I}_{\text{match}}(e, P) \right] + \beta_{\text{keyword}} + 0.5 \cdot (\text{Rating}_P) + \gamma_{\text{badge}}$$

Where:
- $\mathbb{I}_{\text{match}}(e, P)$ is $1$ if the event's category or product matches candidate $P$, otherwise $0$.
- $\beta_{\text{keyword}}$ is $+2.0$ for each recent search query term matching product title or description.
- $0.5 \cdot (\text{Rating}_P)$ provides a quality baseline.
- $\gamma_{\text{badge}}$ adds $+1.5$ for verified "Best Seller" or "Hot" merchandise.

---

## 3. API Contract & Implementation

### 3.1 Event Tracking Endpoint: `POST /api/recommendations/track`
- **Headers:** `Content-Type: application/json`, optional `Authorization: Bearer <token>`, optional `x-session-id: <uuid>`
- **Request Body:**
  ```json
  {
    "eventType": "product_view",
    "productId": "prod-1",
    "category": "Electronics",
    "searchQuery": "wireless earbuds",
    "metadata": { "price": 2499 }
  }
  ```
- **Response:**
  ```json
  { "success": true, "message": "Interaction tracked" }
  ```

### 3.2 Personalized Feed Endpoint: `GET /api/recommendations/personalized`
- **Query Parameters:**
  - `limit`: Integer (default 8, max 24)
  - `currentProductId`: String (optional; used on PDP to exclude the current item)
- **Response Format:**
  ```json
  {
    "success": true,
    "source": "personalized",
    "recommendations": [
      {
        "id": "prod-2",
        "name": "Wireless Noise Cancelling Headphones",
        "slug": "wireless-noise-cancelling-headphones",
        "price": 4500,
        "category": "Electronics",
        "images": [...]
      }
    ]
  }
  ```

### 3.3 Cold-Start Fallback Strategy
When a new customer visits the store without any prior session history or cookies:
1. `computePersonalizedRecommendations` detects zero recorded interactions.
2. Returns high-converting catalog merchandise sorted by `isFeatured` (descending), `isBestSeller` (descending), and `ratingAverage` (descending).
3. The response sets `"source": "cold_start_fallback"`.
4. As soon as the customer types a search query or clicks an item, tracking records the interaction and subsequent queries seamlessly transition to personalized rankings.

---

## 4. Frontend Integration Points

1. **Product Detail Page (`ProductDetailPage.tsx`):**
   - Dispatches `trackUserInteraction({ eventType: 'product_view', productId, category })` inside a `useEffect` triggered on product slug change.
   - Utilizes a 15-second client-side deduplication map to prevent multiple telemetry pings during re-renders.
2. **Global Search Bar (`SearchBar.tsx`):**
   - Dispatches `trackUserInteraction({ eventType: 'search', searchQuery })` when a query is submitted.
   - Dispatches `trackUserInteraction({ eventType: 'search_click', productId, category, searchQuery })` when a suggestion in the dropdown is clicked.
3. **Checkout Page (`CheckoutPage.tsx`):**
   - Dispatches `trackUserInteraction({ eventType: 'order_complete', productId, metadata })` for each purchased cart item upon verified order placement.
4. **Session Identifier (`interactionTracker.ts`):**
   - Generates and persists a stable UUID in `localStorage` under `novara_interaction_session_id`, ensuring guest interactions follow the customer across sessions until login.

---

## 5. Verification Test Suite Results

Automated tests verified the following properties in `src/utils/cartVerificationAndIntegrations.test.ts`:
- **Test 16 (Weight Hierarchy):** Confirmed Order (6.0) > Search (3.0) > Search Click (2.5) > Category (2.0) > View (1.0). (Passed)
- **Test 17 (Recency Decay):** Confirmed recent events retain >99% weight, 48-hour events decay to ~50%, and 96-hour events decay to ~25%. (Passed)
- **Test 18 (Cold-Start Fallback):** Confirmed empty interaction histories fall back to featured and bestselling products in proper rank order. (Passed)
