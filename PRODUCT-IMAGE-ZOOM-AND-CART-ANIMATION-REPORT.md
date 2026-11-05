# PRODUCT IMAGE ZOOM & PARABOLIC CART ANIMATION REPORT

**Date:** November 2026  
**System:** Novara Commerce Platform  
**Components:** Product Detail Gallery Zoom & Parabolic Flying Cart Animation Subsystem  
**Status:** FULLY IMPLEMENTED & TEST-VERIFIED

---

## 1. Product Image Zoom System

Modern ecommerce conversion rates depend heavily on customers inspecting fine fabric textures, stitching, electronic ports, and material finishes. The Novara platform implements a dual-mode zoom architecture:
1. **Desktop Hover Zoom:** Cursor-following continuous magnification inside a bounded container.
2. **Mobile Touch Modal:** Full-screen high-resolution modal with thumbnail switcher and pinch/zoom support.

### 1.1 Desktop Hover Zoom Architecture
- **Component:** `src/pages/ProductDetailPage.tsx`
- **Container Styling:** `relative overflow-hidden cursor-crosshair rounded-3xl bg-gray-50 border border-gray-100`
- **Mechanism:**
  - `onMouseEnter`: Sets `isZooming = true`.
  - `onMouseMove`: Calculates cursor position relative to container bounding client rect:
    $$\text{originX} = \max\left(0, \min\left(100, \frac{\text{clientX} - \text{rect.left}}{\text{rect.width}} \times 100\right)\right)$$
    $$\text{originY} = \max\left(0, \min\left(100, \frac{\text{clientY} - \text{rect.top}}{\text{rect.height}} \times 100\right)\right)$$
  - Updates inline styles dynamically:
    ```tsx
    style={{
      transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
      transform: isZooming ? 'scale(2.2)' : 'scale(1)',
      transition: isZooming ? 'none' : 'transform 0.3s ease-out',
    }}
    ```
  - `onMouseLeave`: Sets `isZooming = false`, smoothly returning the image to 1x scale without jump cuts.
- **Visual Cue:** Renders a subtle `Hover to zoom` pill indicator with a zoom-in magnifying glass in the bottom-left corner of the main image container.

### 1.2 Mobile Touch-Friendly Modal Viewer
On touch screens, mouse cursor events do not exist. Tapping the image on mobile or clicking the expand button opens a dedicated full-screen modal:
- **State:** `isMobileModalOpen: boolean`
- **UI Elements:**
  - Fixed full-screen backdrop (`fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col`)
  - Image counter badge (`Image 1 of 4`)
  - High-resolution responsive centered image with `max-h-[75vh] object-contain`
  - Interactive bottom thumbnail strip for switching images on the fly
  - Touch-accessible close button (`p-3 bg-white/10 hover:bg-white/20 rounded-full text-white`) and `Escape` key listener.

---

## 2. Parabolic Cart Flight Animation

### 2.1 Trajectory Physics & Dynamic Coordinate Calculation
- **Context:** `src/context/CartFlyContext.tsx`
- **Target Element:** Global navigation cart icon (`[data-testid="navigation-cart-button"]` in `Navbar.tsx`).
- **Mathematical Trajectory:**
  When a customer clicks any "Add to Cart" button (on product cards, wishlist, quick-add, or PDP), the system retrieves the bounding client rect of the initiating button ($R_{\text{source}}$) and the target cart icon ($R_{\text{target}}$):
  $$\text{startX} = R_{\text{source}}.\text{left} + \frac{R_{\text{source}}.\text{width}}{2}, \quad \text{startY} = R_{\text{source}}.\text{top} + \frac{R_{\text{source}}.\text{height}}{2}$$
  $$\text{endX} = R_{\text{target}}.\text{left} + \frac{R_{\text{target}}.\text{width}}{2}, \quad \text{endY} = R_{\text{target}}.\text{top} + \frac{R_{\text{target}}.\text{height}}{2}$$
  $$\Delta X = \text{endX} - \text{startX}, \quad \Delta Y = \text{endY} - \text{startY}$$

### 2.2 CSS Animation & Parabolic Curve
The flying thumbnail is injected into a portal root using dynamic CSS custom properties:
```css
@keyframes flyToCartParabolic {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 1;
  }
  30% {
    /* Upward arc apex before descending into cart */
    transform: translate3d(calc(var(--delta-x) * 0.35), calc(var(--delta-y) * 0.15 - 50px), 0) scale(0.85);
    opacity: 0.95;
  }
  75% {
    transform: translate3d(calc(var(--delta-x) * 0.8), calc(var(--delta-y) * 0.75), 0) scale(0.5);
    opacity: 0.8;
  }
  100% {
    transform: translate3d(var(--delta-x), var(--delta-y), 0) scale(0.2);
    opacity: 0;
  }
}
```

### 2.3 Navbar Cart Badge Bounce
Upon projectile arrival at the 100% trajectory mark (800ms), a target animation is triggered on the navigation cart icon:
- The cart button applies a spring keyframe animation:
  `transform: scale(1.25)` $\rightarrow$ `scale(0.95)` $\rightarrow$ `scale(1.05)` $\rightarrow$ `scale(1.00)`
- The distinct line item counter updates instantly.

### 2.4 Accessibility & Motion Sensitivity Compliance
The system queries the standard W3C media feature:
```typescript
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```
If reduced motion is requested by user OS settings:
1. Flying projectile animation is skipped immediately.
2. The cart badge updates instantaneously without visual distraction.
3. No jarring layout shifts or frame stutter occurs.

---

## 3. Automated Test Verification Results

In `src/utils/cartVerificationAndIntegrations.test.ts`:
- **Test 21 (Vector Physics):** Verified that a button located at $(100, 500)$ aiming for a navbar cart at $(800, 20)$ computes exact relative offsets $\Delta X = +660\text{px}$ and $\Delta Y = -480\text{px}$. (Passed)
- **Test 22 (Zoom Origin Clamping):** Verified cursor coordinates map accurately to container percentages ($50\%$ for center, $0\%$ for top-left, and clamped to $100\%$ for cursor points at or beyond bottom-right borders). (Passed)
