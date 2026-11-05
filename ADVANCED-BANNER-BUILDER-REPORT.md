# ADVANCED BANNER BUILDER & VISUAL CMS ENGINEERING REPORT
**Application:** NOVARA COMMERCE / ShopMax  
**Module:** Visual CMS & Advanced Dynamic Banner Designer  
**Status:** Completed & Production Verified  

---

## 1. Executive Summary
The visual banner creation capabilities of NOVARA COMMERCE have been transformed from basic static markup into an enterprise-grade Visual CMS Studio. Administrators can now construct, customize, layer, and deploy responsive banners in real-time. All visual configurations persist dynamically in MongoDB (backed by resilient fallback) and immediately influence customer-facing homepages, category spotlight strips, split promotional cards, and promotional discount ribbons without requiring code changes or server redeployments.

---

## 2. Core Architectural Pillars

### A. Modular Data Architecture (`server/models/Banner.ts`)
- **Background Support:**
  - `solid`: Single HEX/RGBA background color with live color-picker.
  - `gradient`: Linear and radial gradients with customizable angle (0° to 360°) and dynamic multi-stop color array (`stops: [{ color, position, opacity }]`).
  - `image`: High-resolution background photo with object-fit (`cover`, `contain`, `fill`) and focal alignment (`center`, `top`, `bottom`, `left`, `right`, `custom`).
  - `image-overlay`: High-resolution photo combined with an overlay tint layer (solid or gradient) with blend modes (`normal`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`).
  - `multi-layer`: Stacking contexts supporting infinite decorative, typography, shape, and badge layers with independent CSS `z-index`.

### B. Image Transformation Engine
- Precise fine-tuning parameters for background imagery:
  - **Scale / Zoom:** `0.5x` to `2.5x`
  - **Rotation:** `-180°` to `+180°` with degree readout
  - **Opacity:** `0%` to `100%`
  - **Gaussian Blur:** `0px` to `20px` for text legibility optimization
  - **Focal Alignment:** Dynamic `objectPosition` based on coordinates or named presets.

### C. Visual Layer Management
- Freeform and aligned visual layer stacking:
  - Layer types: `text`, `heading`, `badge`, `button`, `image`, `shape`, `overlay`.
  - Reordering controls: Move Up, Move Down, Toggle Visibility, Delete.
  - Granular positioning: Percentage-based `top`, `left`, `width`, `height`.
  - Visual styling: Font family, font size, font weight, letter spacing, text color, background tint, border radius, box shadow.

### D. Multi-Viewport Live Responsive Preview
- Live viewport switching in the Admin Designer Modal:
  - **Desktop:** 1280px representation (`desktopHeight: 280px - 700px`)
  - **Tablet:** 768px representation (`tabletHeight: 220px - 500px`)
  - **Mobile:** 375px representation (`mobileHeight: 180px - 400px`)
- All responsive viewport dimensions and custom aspect ratios persist per banner and adapt responsively on customer storefront viewports via Tailwind container queries and inline height variables.

### E. Secure Navigation & Link Sanitization
- `sanitizeBannerLink` engine strictly filters and normalizes:
  - Internal relative routes (e.g., `/shop`, `/product/gadget-1`) with client-side SPA routing.
  - External trusted URLs (e.g., `https://brandpartner.com`) with `target="_blank"` and `rel="noopener noreferrer"`.
  - Strict blocking of dangerous schemes including `javascript:`, `data:`, `vbscript:`, avoiding XSS vectors.

---

## 3. Visual Designer Component Suite

1. **`src/components/banner/BannerRenderer.tsx`**
   - High-performance, zero-flicker frontend renderer for customer-facing storefronts.
   - Computes multi-stop linear/radial CSS gradients with opacity and hex conversion.
   - Applies background image transformation matrices and blend modes.
   - Renders stack of visual layers with calculated `z-index`.
   - Handles touch and click navigation safely.

2. **`src/admin/components/cms/BannerDesignerModal.tsx`**
   - Tabbed Studio Workspace:
     - *Background & Image*: Solid, Gradient, Image URL, Local File Upload (`/api/upload/file`), Image Transforms.
     - *Multi-Color Gradient Builder*: Presets (Emerald Forest, Royal Midnight, Sunset Glow, Neon Cyber, Warm Peach, Cyber Violet, Obsidian Dark, Golden Hour), custom stops addition/removal, angle slider.
     - *Overlays & Blends*: Overlay enablement, color, opacity slider, blend mode dropdown.
     - *Layers Stack*: Layer reordering (Up/Down), visibility toggle, layer properties.
     - *Content & Call-to-Action*: Headline, Subtitle, Badge/Tag, Button label, Button link, Alignment, Max content width.
     - *Placement & Responsive*: Placement section selector (`homepage-main`, `homepage-secondary`, `homepage-category`, `homepage-promotion`), Responsive heights per device, Status dropdown (`published`, `draft`, `scheduled`, `disabled`), Display sequence order.

3. **`src/admin/pages/CmsAdminPage.tsx`**
   - Visual cards rendering live `BannerRenderer` previews.
   - Duplication workflow: 1-click duplication via `/api/cms/banners/:id/duplicate` creating instantaneous draft copies.
   - Real-time Active/Paused toggling via `/api/cms/banners/:id/toggle`.

---

## 4. Storefront Integration (`src/pages/HomePage.tsx`)
- Dynamic query fetching active published banners (`/api/cms/banners?status=published`).
- `split_banners` dual promo section renders configured `homepage-secondary` banners with dynamic backgrounds and image transformations.
- `promotional_banner` section renders full-width highlight banner dynamically.
- `product_grid` seamlessly interleaves promotional banners based on admin section settings.
