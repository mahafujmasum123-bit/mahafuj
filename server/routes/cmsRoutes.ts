import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { INITIAL_TESTIMONIALS } from '../data/initialData';
import { SliderModel, ISlider } from '../models/Slider';
import { BannerModel, BannerPlacement, GradientStop, BannerLayer, IBanner } from '../models/Banner';
import { AdvertisementModel } from '../models/Advertisement';
import { recordActivityLog } from '../models/AuditLog';
import { isDbConnected } from '../db';

const router = Router();

// ==========================================
// 1. DATA MODELS & INTERFACES
// ==========================================

export interface SliderItem {
  id: string;
  imageUrl: string;
  destinationLink?: string;
  openInNewTab?: boolean;
  altText?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BannerItem {
  id: string;
  name: string;
  status: 'draft' | 'published' | 'scheduled' | 'disabled';
  placement: BannerPlacement;
  displayOrder: number;
  isActive: boolean;

  // Background System
  bgType: 'solid' | 'gradient' | 'image' | 'image-overlay' | 'image-gradient' | 'multi-layer';
  backgroundColor: string;
  textColor?: string;

  // Multi-Color Gradient
  gradient?: {
    type: 'linear' | 'radial';
    angle: number;
    stops: GradientStop[];
  };

  // Background Image & Transformation
  bgImage?: {
    url: string;
    positionX: number;
    positionY: number;
    alignment: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'custom';
    objectFit: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
    scale: number;
    rotation: number;
    zoom: number;
    opacity: number;
    blur: number;
  };

  // Overlay System
  overlay?: {
    enabled: boolean;
    type: 'solid' | 'gradient';
    color: string;
    opacity: number;
    blendMode: string;
    direction?: string;
    gradientStops?: GradientStop[];
  };

  // Visual Layers
  layers: BannerLayer[];

  // Optional Content (image-only banners omit these)
  tag?: string;
  headline?: string;
  subheadline?: string;
  buttonText?: string;
  buttonLink?: string;
  textAlign?: 'left' | 'center' | 'right';
  contentPosition?: 'left' | 'center' | 'right' | 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right';
  maxContentWidth?: number;

  // Optional Destination Link
  destinationLink?: string;
  openInNewTab?: boolean;

  // Responsive settings
  responsive?: {
    desktopHeight?: number;
    tabletHeight?: number;
    mobileHeight?: number;
    hideOnMobile?: boolean;
  };

  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdvertisementItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  destinationUrl: string;
  buttonText: string;
  priority: number;
  frequency: 'once_per_session' | 'always' | 'daily';
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  impressions: number;
  clicks: number;
  dismissals: number;
  createdAt: string;
  updatedAt: string;
}

// Initial Image-Only Hero Sliders (Phase 10 Compliant)
export let inMemorySliders: SliderItem[] = [
  {
    id: 'sld-1',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=85',
    destinationLink: '/shop',
    openInNewTab: false,
    altText: 'Novara Lifestyle & Fashion Collection',
    displayOrder: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sld-2',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600&q=85',
    destinationLink: '/shop?category=electronics',
    openInNewTab: false,
    altText: 'Studio Grade Wireless Acoustics',
    displayOrder: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sld-3',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1600&q=85',
    destinationLink: '/shop?category=electronics',
    openInNewTab: false,
    altText: 'Smart Biometric Wearables',
    displayOrder: 3,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Initial Visual Banners (Phase 9 Compliant)
export let inMemoryBanners: BannerItem[] = [
  {
    id: 'bnr-main-1',
    name: 'Season Highlight Main Banner',
    status: 'published',
    placement: 'homepage-main',
    displayOrder: 1,
    isActive: true,
    bgType: 'image-overlay',
    backgroundColor: '#051b14',
    textColor: '#ffffff',
    gradient: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#051b14', position: 0, opacity: 1 },
        { color: '#0d3829', position: 100, opacity: 1 },
      ],
    },
    bgImage: {
      url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=85',
      positionX: 50,
      positionY: 50,
      alignment: 'center',
      objectFit: 'cover',
      scale: 1,
      rotation: 0,
      zoom: 1,
      opacity: 0.95,
      blur: 0,
    },
    overlay: {
      enabled: true,
      type: 'gradient',
      color: '#051b14',
      opacity: 0.6,
      blendMode: 'multiply',
      direction: 'to-right',
      gradientStops: [
        { color: '#051b14', position: 0, opacity: 0.85 },
        { color: 'transparent', position: 75, opacity: 0 },
      ],
    },
    layers: [
      { id: 'lay-bg', name: 'Background Image', type: 'image', visible: true, zIndex: 0, opacity: 1, config: {} },
      { id: 'lay-ov', name: 'Dark Gradient Overlay', type: 'overlay', visible: true, zIndex: 1, opacity: 0.6, config: {} },
    ],
    tag: 'SEASON HIGHLIGHT',
    headline: 'Premium Living Redefined',
    subheadline: 'Handpicked aesthetics and certified electronics backed by our 30-day guarantee.',
    buttonText: 'Shop Highlights',
    buttonLink: '/shop',
    textAlign: 'left',
    contentPosition: 'left',
    maxContentWidth: 620,
    destinationLink: '/shop',
    openInNewTab: false,
    responsive: { desktopHeight: 480, tabletHeight: 380, mobileHeight: 300, hideOnMobile: false },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bnr-sec-1',
    name: 'Smart Tech Split Secondary',
    status: 'published',
    placement: 'homepage-secondary',
    displayOrder: 1,
    isActive: true,
    bgType: 'image-overlay',
    backgroundColor: '#0c261e',
    textColor: '#ffffff',
    bgImage: {
      url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=900&q=85',
      positionX: 50,
      positionY: 50,
      alignment: 'center',
      objectFit: 'cover',
      scale: 1,
      rotation: 0,
      zoom: 1,
      opacity: 0.9,
      blur: 0,
    },
    overlay: {
      enabled: true,
      type: 'solid',
      color: '#0c261e',
      opacity: 0.45,
      blendMode: 'multiply',
    },
    layers: [],
    tag: 'Smart Tech',
    headline: 'Smart Tech, Smarter You',
    subheadline: 'Latest gadgets with authentic warranty and rapid Dhaka delivery.',
    buttonText: 'Shop Tech',
    buttonLink: '/shop?category=electronics',
    destinationLink: '/shop?category=electronics',
    responsive: { desktopHeight: 280, tabletHeight: 240, mobileHeight: 200 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bnr-sec-2',
    name: 'Fashion Split Secondary',
    status: 'published',
    placement: 'homepage-secondary',
    displayOrder: 2,
    isActive: true,
    bgType: 'image-overlay',
    backgroundColor: '#fef3e9',
    textColor: '#1f2937',
    bgImage: {
      url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=900&q=85',
      positionX: 50,
      positionY: 50,
      alignment: 'center',
      objectFit: 'cover',
      scale: 1,
      rotation: 0,
      zoom: 1,
      opacity: 0.85,
      blur: 0,
    },
    overlay: {
      enabled: true,
      type: 'solid',
      color: '#ffffff',
      opacity: 0.2,
      blendMode: 'normal',
    },
    layers: [],
    tag: 'Fashion',
    headline: 'Fashion That Speaks You',
    subheadline: 'Contemporary tailoring, breathable fabrics, and everyday essentials.',
    buttonText: 'Explore Styles',
    buttonLink: '/shop?category=fashion',
    destinationLink: '/shop?category=fashion',
    responsive: { desktopHeight: 280, tabletHeight: 240, mobileHeight: 200 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bnr-cat-1',
    name: 'Home & Living Category Banner',
    status: 'published',
    placement: 'homepage-category',
    displayOrder: 1,
    isActive: true,
    bgType: 'gradient',
    backgroundColor: '#134e4a',
    textColor: '#ffffff',
    gradient: {
      type: 'linear',
      angle: 120,
      stops: [
        { color: '#134e4a', position: 0, opacity: 1 },
        { color: '#042f2e', position: 100, opacity: 1 },
      ],
    },
    layers: [],
    tag: 'CURATED PICKS',
    headline: 'Smart Living Essentials',
    subheadline: 'Elevate your everyday routine with ergonomic accessories.',
    buttonText: 'Browse Categories',
    buttonLink: '/shop?category=home-living',
    destinationLink: '/shop?category=home-living',
    responsive: { desktopHeight: 220, tabletHeight: 200, mobileHeight: 180 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bnr-promo-1',
    name: 'Flash Discount Promotion Banner',
    status: 'published',
    placement: 'homepage-promotion',
    displayOrder: 1,
    isActive: true,
    bgType: 'image-overlay',
    backgroundColor: '#064e3b',
    textColor: '#ffffff',
    bgImage: {
      url: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1400&q=85',
      positionX: 50,
      positionY: 50,
      alignment: 'center',
      objectFit: 'cover',
      scale: 1,
      rotation: 0,
      zoom: 1,
      opacity: 0.9,
      blur: 0,
    },
    overlay: {
      enabled: true,
      type: 'gradient',
      color: '#064e3b',
      opacity: 0.7,
      blendMode: 'multiply',
      direction: 'to-right',
      gradientStops: [
        { color: '#064e3b', position: 0, opacity: 0.9 },
        { color: '#022c22', position: 100, opacity: 0.4 },
      ],
    },
    layers: [],
    tag: 'LIMITED TIME OFFER',
    headline: 'UP TO 50% OFF FLASH SALE',
    subheadline: 'On Your Favorite Brands across Tech, Living & Footwear.',
    buttonText: 'Claim Discount',
    buttonLink: '/shop?discount=true',
    destinationLink: '/shop?discount=true',
    responsive: { desktopHeight: 300, tabletHeight: 260, mobileHeight: 220 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export let inMemoryAdvertisements: AdvertisementItem[] = [
  {
    id: 'ad-1',
    title: 'Flash Sale: 20% Off Your Entire Cart',
    description: 'Use promo code FLASH20 during checkout to unlock an exclusive 20% discount on all premium electronics and footwear.',
    imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1000&q=80',
    destinationUrl: '/shop?coupon=FLASH20',
    buttonText: 'Claim 20% Off',
    priority: 1,
    frequency: 'once_per_session',
    isActive: true,
    startDate: '2025-01-01',
    endDate: '2028-12-31',
    impressions: 48,
    clicks: 16,
    dismissals: 32,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let inMemoryCMS = {
  announcementBar: {
    enabled: true,
    freeShippingText: 'Free shipping on orders over ৳2,500 across Bangladesh',
    guaranteeText: '30 Days Money Back Guarantee',
    supportText: '24/7 Dedicated Customer Care',
  },
  testimonials: INITIAL_TESTIMONIALS,
};

let inMemoryNewsletter: string[] = ['subscriber1@novara.com'];
let inMemoryEnquiries: any[] = [];

// ==========================================
// 2. HERO SLIDERS CRUD APIS (IMAGE-ONLY)
// ==========================================

// GET /api/cms/sliders - List sliders (Public or Admin)
router.get('/sliders', async (req: Request, res: Response) => {
  try {
    const { activeOnly } = req.query;

    if (isDbConnected()) {
      try {
        const query = activeOnly === 'true' ? { isActive: true } : {};
        const dbSliders = await SliderModel.find(query).sort({ displayOrder: 1, createdAt: -1 });
        if (dbSliders.length > 0) {
          const formatted: SliderItem[] = dbSliders.map((s) => ({
            id: s._id.toString(),
            imageUrl: s.imageUrl,
            destinationLink: s.destinationLink || '',
            openInNewTab: Boolean(s.openInNewTab),
            altText: s.altText || '',
            displayOrder: s.displayOrder,
            isActive: s.isActive,
            createdAt: s.createdAt.toISOString(),
            updatedAt: s.updatedAt.toISOString(),
          }));
          res.json({ success: true, data: formatted });
          return;
        }
      } catch (dbErr) {
        console.warn('DB slider query failed, using memory store:', dbErr);
      }
    }

    let result = [...inMemorySliders].sort((a, b) => a.displayOrder - b.displayOrder);
    if (activeOnly === 'true') {
      result = result.filter((s) => s.isActive);
    }

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/cms/sliders - Create slider (Admin)
// Strictly image-only per Phase 10: requires imageUrl, optional destinationLink, NO text fields
router.post('/sliders', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const {
      imageUrl,
      destinationLink,
      openInNewTab,
      altText,
      displayOrder,
      isActive,
    } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
      res.status(400).json({ success: false, error: 'Hero image URL is required.' });
      return;
    }

    const now = new Date().toISOString();
    const newSlider: SliderItem = {
      id: `sld-${Date.now()}`,
      imageUrl: imageUrl.trim(),
      destinationLink: destinationLink?.trim() || '',
      openInNewTab: Boolean(openInNewTab),
      altText: altText?.trim() || 'Hero Slide',
      displayOrder: typeof displayOrder === 'number' ? displayOrder : inMemorySliders.length + 1,
      isActive: isActive !== false,
      createdAt: now,
      updatedAt: now,
    };

    inMemorySliders.push(newSlider);

    if (isDbConnected()) {
      try {
        const created = await SliderModel.create({
          imageUrl: newSlider.imageUrl,
          destinationLink: newSlider.destinationLink,
          openInNewTab: newSlider.openInNewTab,
          altText: newSlider.altText,
          displayOrder: newSlider.displayOrder,
          isActive: newSlider.isActive,
        });
        newSlider.id = created._id.toString();
      } catch (dbErr: any) {
        console.warn('Slider DB persistence failed:', dbErr.message);
      }
    }

    // Log admin activity
    const user = (req as any).user;
    await recordActivityLog({
      action: 'HERO_SLIDER_CREATE',
      category: 'hero_slider',
      actorName: user?.name || 'Administrator',
      actorEmail: user?.email,
      actorRole: user?.role || 'admin',
      resourceId: newSlider.id,
      resourceType: 'Slider',
      details: `Created hero slider slide ${newSlider.id} (Order: ${newSlider.displayOrder})`,
      metadata: { destinationLink: newSlider.destinationLink, openInNewTab: newSlider.openInNewTab },
    });

    res.status(201).json({
      success: true,
      data: newSlider,
      message: 'Hero slider created successfully and published live.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/cms/sliders/reorder - Reorder multiple sliders (Admin)
router.put('/sliders/reorder', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const { orders } = req.body; // Array of { id: string, displayOrder: number }
    if (!Array.isArray(orders)) {
      res.status(400).json({ success: false, error: 'Expected orders array of { id, displayOrder }' });
      return;
    }

    for (const item of orders) {
      const found = inMemorySliders.find((s) => s.id === item.id);
      if (found) {
        found.displayOrder = Number(item.displayOrder);
        found.updatedAt = new Date().toISOString();
      }
      if (isDbConnected()) {
        try {
          await SliderModel.findByIdAndUpdate(item.id, { displayOrder: Number(item.displayOrder) });
        } catch (e) {}
      }
    }

    inMemorySliders.sort((a, b) => a.displayOrder - b.displayOrder);

    const user = (req as any).user;
    await recordActivityLog({
      action: 'HERO_SLIDER_REORDER',
      category: 'hero_slider',
      actorName: user?.name || 'Administrator',
      actorEmail: user?.email,
      actorRole: user?.role || 'admin',
      details: `Reordered ${orders.length} hero slider items`,
    });

    res.json({ success: true, message: 'Hero slides display order updated.', data: inMemorySliders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/cms/sliders/:id - Update slider (Admin)
router.put('/sliders/:id', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = inMemorySliders.find((s) => s.id === id);

    if (!existing) {
      res.status(404).json({ success: false, error: 'Slider not found.' });
      return;
    }

    const {
      imageUrl,
      destinationLink,
      openInNewTab,
      altText,
      displayOrder,
      isActive,
    } = req.body;

    if (imageUrl !== undefined) existing.imageUrl = imageUrl.trim();
    if (destinationLink !== undefined) existing.destinationLink = destinationLink.trim();
    if (openInNewTab !== undefined) existing.openInNewTab = Boolean(openInNewTab);
    if (altText !== undefined) existing.altText = altText.trim();
    if (displayOrder !== undefined) existing.displayOrder = Number(displayOrder);
    if (isActive !== undefined) existing.isActive = Boolean(isActive);
    existing.updatedAt = new Date().toISOString();

    if (isDbConnected()) {
      try {
        await SliderModel.findByIdAndUpdate(id, {
          imageUrl: existing.imageUrl,
          destinationLink: existing.destinationLink,
          openInNewTab: existing.openInNewTab,
          altText: existing.altText,
          displayOrder: existing.displayOrder,
          isActive: existing.isActive,
        });
      } catch (dbErr: any) {
        console.warn('Slider update DB sync fallback:', dbErr.message);
      }
    }

    const user = (req as any).user;
    await recordActivityLog({
      action: 'HERO_SLIDER_UPDATE',
      category: 'hero_slider',
      actorName: user?.name || 'Administrator',
      actorEmail: user?.email,
      actorRole: user?.role || 'admin',
      resourceId: id,
      resourceType: 'Slider',
      details: `Updated hero slider slide ${id}`,
      metadata: { destinationLink: existing.destinationLink, isActive: existing.isActive },
    });

    res.json({
      success: true,
      data: existing,
      message: 'Slider updated and live changes synchronized to homepage.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/cms/sliders/:id/toggle - Toggle active state (Admin)
router.patch('/sliders/:id/toggle', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const slider = inMemorySliders.find((s) => s.id === id);

    if (!slider) {
      res.status(404).json({ success: false, error: 'Slider not found.' });
      return;
    }

    slider.isActive = !slider.isActive;
    slider.updatedAt = new Date().toISOString();

    if (isDbConnected()) {
      try {
        await SliderModel.findByIdAndUpdate(id, { isActive: slider.isActive });
      } catch (dbErr: any) {
        console.warn('Slider toggle DB sync fallback:', dbErr.message);
      }
    }

    const user = (req as any).user;
    await recordActivityLog({
      action: 'HERO_SLIDER_TOGGLE',
      category: 'hero_slider',
      actorName: user?.name || 'Administrator',
      actorEmail: user?.email,
      actorRole: user?.role || 'admin',
      resourceId: id,
      resourceType: 'Slider',
      details: `Toggled hero slider ${id} to ${slider.isActive ? 'active' : 'hidden'}`,
    });

    res.json({
      success: true,
      data: slider,
      message: `Slider is now ${slider.isActive ? 'active' : 'hidden'} on storefront.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/cms/sliders/:id - Delete slider (Admin)
router.delete('/sliders/:id', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idx = inMemorySliders.findIndex((s) => s.id === id);

    if (idx === -1) {
      res.status(404).json({ success: false, error: 'Slider not found.' });
      return;
    }

    inMemorySliders.splice(idx, 1);

    if (isDbConnected()) {
      try {
        await SliderModel.findByIdAndDelete(id);
      } catch (dbErr: any) {
        console.warn('Slider deletion DB sync fallback:', dbErr.message);
      }
    }

    const user = (req as any).user;
    await recordActivityLog({
      action: 'HERO_SLIDER_DELETE',
      category: 'hero_slider',
      actorName: user?.name || 'Administrator',
      actorEmail: user?.email,
      actorRole: user?.role || 'admin',
      resourceId: id,
      resourceType: 'Slider',
      details: `Deleted hero slider slide ${id}`,
    });

    res.json({ success: true, message: 'Slider deleted successfully from store database.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. ADVANCED VISUAL BANNERS CRUD APIS
// ==========================================

// GET /api/cms/banners - List banners with placement/status filtering
router.get('/banners', async (req: Request, res: Response) => {
  try {
    const { placement, status, activeOnly } = req.query;

    if (isDbConnected()) {
      try {
        const query: any = {};
        if (placement) query.placement = placement;
        if (status) query.status = status;
        if (activeOnly === 'true') {
          query.isActive = true;
          query.status = 'published';
        }

        const dbBanners = await BannerModel.find(query).sort({ displayOrder: 1, createdAt: -1 });
        if (dbBanners.length > 0) {
          const formatted: BannerItem[] = dbBanners.map((b) => ({
            id: b._id.toString(),
            name: b.name || 'Untitled Banner',
            status: b.status || (b.isActive ? 'published' : 'draft'),
            placement: b.placement,
            displayOrder: b.displayOrder,
            isActive: b.isActive,
            bgType: b.bgType || 'solid',
            backgroundColor: b.backgroundColor || '#0c261e',
            textColor: b.textColor || '#ffffff',
            gradient: b.gradient,
            bgImage: b.bgImage,
            overlay: b.overlay,
            layers: b.layers || [],
            tag: b.tag,
            headline: b.headline,
            subheadline: b.subheadline,
            buttonText: b.buttonText,
            buttonLink: b.buttonLink,
            textAlign: b.textAlign,
            contentPosition: b.contentPosition,
            maxContentWidth: b.maxContentWidth,
            destinationLink: b.destinationLink,
            openInNewTab: b.openInNewTab,
            responsive: b.responsive,
            startDate: b.startDate,
            endDate: b.endDate,
            createdAt: b.createdAt.toISOString(),
            updatedAt: b.updatedAt.toISOString(),
          }));
          res.json({ success: true, data: formatted });
          return;
        }
      } catch (dbErr) {
        console.warn('DB banner query fallback to memory:', dbErr);
      }
    }

    let result = [...inMemoryBanners].sort((a, b) => a.displayOrder - b.displayOrder);
    if (placement) {
      result = result.filter((b) => b.placement === placement);
    }
    if (status) {
      result = result.filter((b) => b.status === status);
    }
    if (activeOnly === 'true') {
      result = result.filter((b) => b.isActive && b.status === 'published');
    }

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/cms/banners - Create banner (Admin)
router.post('/banners', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const {
      name,
      status = 'published',
      placement,
      displayOrder,
      isActive = true,
      bgType = 'solid',
      backgroundColor = '#0c261e',
      textColor = '#ffffff',
      gradient,
      bgImage,
      overlay,
      layers = [],
      tag,
      headline,
      subheadline,
      buttonText,
      buttonLink,
      textAlign = 'left',
      contentPosition = 'left',
      maxContentWidth = 600,
      destinationLink,
      openInNewTab = false,
      responsive,
      startDate,
      endDate,
    } = req.body;

    if (!placement) {
      res.status(400).json({ success: false, error: 'Placement location is required.' });
      return;
    }

    const now = new Date().toISOString();
    const newBanner: BannerItem = {
      id: `bnr-${Date.now()}`,
      name: name?.trim() || 'Untitled Banner',
      status: status || 'published',
      placement,
      displayOrder: typeof displayOrder === 'number' ? displayOrder : inMemoryBanners.length + 1,
      isActive: isActive !== false,
      bgType,
      backgroundColor: backgroundColor?.trim() || '#0c261e',
      textColor: textColor?.trim() || '#ffffff',
      gradient,
      bgImage,
      overlay,
      layers,
      tag: tag?.trim(),
      headline: headline?.trim(),
      subheadline: subheadline?.trim(),
      buttonText: buttonText?.trim(),
      buttonLink: buttonLink?.trim(),
      textAlign,
      contentPosition,
      maxContentWidth,
      destinationLink: destinationLink?.trim(),
      openInNewTab: Boolean(openInNewTab),
      responsive: responsive || { desktopHeight: 450, tabletHeight: 350, mobileHeight: 280 },
      startDate,
      endDate,
      createdAt: now,
      updatedAt: now,
    };

    inMemoryBanners.push(newBanner);

    if (isDbConnected()) {
      try {
        const created = await BannerModel.create({
          ...newBanner,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        newBanner.id = created._id.toString();
      } catch (dbErr: any) {
        console.warn('Banner DB persistence fallback:', dbErr.message);
      }
    }

    const user = (req as any).user;
    await recordActivityLog({
      action: 'BANNER_CREATE',
      category: 'banner',
      actorName: user?.name || 'Administrator',
      actorEmail: user?.email,
      actorRole: user?.role || 'admin',
      resourceId: newBanner.id,
      resourceType: 'Banner',
      details: `Created visual banner "${newBanner.name}" for ${newBanner.placement} (${newBanner.status})`,
      metadata: { placement: newBanner.placement, bgType: newBanner.bgType },
    });

    res.status(201).json({
      success: true,
      data: newBanner,
      message: `Banner created successfully for placement '${placement}'.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/cms/banners/reorder - Reorder banners (Admin)
router.put('/banners/reorder', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      res.status(400).json({ success: false, error: 'Expected orders array of { id, displayOrder }' });
      return;
    }

    for (const item of orders) {
      const banner = inMemoryBanners.find((b) => b.id === item.id);
      if (banner) {
        banner.displayOrder = Number(item.displayOrder);
        banner.updatedAt = new Date().toISOString();
      }
      if (isDbConnected()) {
        try {
          await BannerModel.findByIdAndUpdate(item.id, { displayOrder: Number(item.displayOrder) });
        } catch (e) {}
      }
    }

    inMemoryBanners.sort((a, b) => a.displayOrder - b.displayOrder);

    const user = (req as any).user;
    await recordActivityLog({
      action: 'BANNER_REORDER',
      category: 'banner',
      actorName: user?.name || 'Administrator',
      actorEmail: user?.email,
      actorRole: user?.role || 'admin',
      details: `Reordered ${orders.length} banners`,
    });

    res.json({ success: true, message: 'Banners display order updated.', data: inMemoryBanners });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/cms/banners/:id/duplicate - Duplicate banner (Admin)
router.post('/banners/:id/duplicate', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const source = inMemoryBanners.find((b) => b.id === id);

    if (!source) {
      res.status(404).json({ success: false, error: 'Source banner not found.' });
      return;
    }

    const now = new Date().toISOString();
    const cloned: BannerItem = {
      ...JSON.parse(JSON.stringify(source)),
      id: `bnr-${Date.now()}`,
      name: `${source.name} (Copy)`,
      status: 'draft',
      displayOrder: source.displayOrder + 1,
      createdAt: now,
      updatedAt: now,
    };

    inMemoryBanners.push(cloned);

    if (isDbConnected()) {
      try {
        const created = await BannerModel.create({
          ...cloned,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        cloned.id = created._id.toString();
      } catch (dbErr: any) {
        console.warn('Banner duplication DB write fallback:', dbErr.message);
      }
    }

    const user = (req as any).user;
    await recordActivityLog({
      action: 'BANNER_DUPLICATE',
      category: 'banner',
      actorName: user?.name || 'Administrator',
      actorEmail: user?.email,
      actorRole: user?.role || 'admin',
      resourceId: cloned.id,
      resourceType: 'Banner',
      details: `Duplicated banner "${source.name}" into "${cloned.name}"`,
    });

    res.status(201).json({
      success: true,
      data: cloned,
      message: 'Banner duplicated successfully as draft.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/cms/banners/:id - Update banner (Admin)
router.put('/banners/:id', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const banner = inMemoryBanners.find((b) => b.id === id);

    if (!banner) {
      res.status(404).json({ success: false, error: 'Banner not found.' });
      return;
    }

    const updates = req.body;
    Object.assign(banner, updates, { updatedAt: new Date().toISOString() });

    if (isDbConnected()) {
      try {
        await BannerModel.findByIdAndUpdate(id, updates);
      } catch (dbErr: any) {
        console.warn('Banner update DB fallback:', dbErr.message);
      }
    }

    const user = (req as any).user;
    await recordActivityLog({
      action: 'BANNER_UPDATE',
      category: 'banner',
      actorName: user?.name || 'Administrator',
      actorEmail: user?.email,
      actorRole: user?.role || 'admin',
      resourceId: id,
      resourceType: 'Banner',
      details: `Updated visual banner "${banner.name}" (${banner.placement})`,
      metadata: { status: banner.status, bgType: banner.bgType },
    });

    res.json({
      success: true,
      data: banner,
      message: 'Banner updated and live on storefront.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/cms/banners/:id/status - Change banner status (Admin)
router.patch('/banners/:id/status', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const banner = inMemoryBanners.find((b) => b.id === id);

    if (!banner) {
      res.status(404).json({ success: false, error: 'Banner not found.' });
      return;
    }

    if (!['draft', 'published', 'scheduled', 'disabled'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid status value.' });
      return;
    }

    banner.status = status;
    banner.isActive = status === 'published';
    banner.updatedAt = new Date().toISOString();

    if (isDbConnected()) {
      try {
        await BannerModel.findByIdAndUpdate(id, { status: banner.status, isActive: banner.isActive });
      } catch (dbErr: any) {
        console.warn('Banner status DB fallback:', dbErr.message);
      }
    }

    const user = (req as any).user;
    await recordActivityLog({
      action: 'BANNER_STATUS_CHANGE',
      category: 'banner',
      actorName: user?.name || 'Administrator',
      actorEmail: user?.email,
      actorRole: user?.role || 'admin',
      resourceId: id,
      resourceType: 'Banner',
      details: `Changed banner "${banner.name}" status to "${status}"`,
    });

    res.json({
      success: true,
      data: banner,
      message: `Banner status set to ${status}.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/cms/banners/:id/toggle - Toggle active state (Admin)
router.patch('/banners/:id/toggle', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const banner = inMemoryBanners.find((b) => b.id === id);

    if (!banner) {
      res.status(404).json({ success: false, error: 'Banner not found.' });
      return;
    }

    banner.isActive = !banner.isActive;
    banner.status = banner.isActive ? 'published' : 'disabled';
    banner.updatedAt = new Date().toISOString();

    if (isDbConnected()) {
      try {
        await BannerModel.findByIdAndUpdate(id, { isActive: banner.isActive, status: banner.status });
      } catch (dbErr: any) {
        console.warn('Banner toggle DB fallback:', dbErr.message);
      }
    }

    const user = (req as any).user;
    await recordActivityLog({
      action: 'BANNER_TOGGLE',
      category: 'banner',
      actorName: user?.name || 'Administrator',
      actorEmail: user?.email,
      actorRole: user?.role || 'admin',
      resourceId: id,
      resourceType: 'Banner',
      details: `Toggled banner "${banner.name}" ${banner.isActive ? 'published' : 'disabled'}`,
    });

    res.json({
      success: true,
      data: banner,
      message: `Banner is now ${banner.isActive ? 'active' : 'hidden'} on storefront.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/cms/banners/:id - Delete banner (Admin)
router.delete('/banners/:id', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idx = inMemoryBanners.findIndex((b) => b.id === id);

    if (idx === -1) {
      res.status(404).json({ success: false, error: 'Banner not found.' });
      return;
    }

    const [deleted] = inMemoryBanners.splice(idx, 1);

    if (isDbConnected()) {
      try {
        await BannerModel.findByIdAndDelete(id);
      } catch (dbErr: any) {
        console.warn('Banner deletion DB fallback:', dbErr.message);
      }
    }

    const user = (req as any).user;
    await recordActivityLog({
      action: 'BANNER_DELETE',
      category: 'banner',
      actorName: user?.name || 'Administrator',
      actorEmail: user?.email,
      actorRole: user?.role || 'admin',
      resourceId: id,
      resourceType: 'Banner',
      details: `Deleted visual banner "${deleted?.name || id}"`,
    });

    res.json({ success: true, message: 'Banner deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. ADVERTISEMENT MANAGEMENT SYSTEM APIS
// ==========================================

// GET /api/cms/advertisements - List all ads (Admin)
router.get('/advertisements', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    if (isDbConnected()) {
      try {
        const dbAds = await AdvertisementModel.find().sort({ priority: 1, createdAt: -1 });
        if (dbAds.length > 0) {
          const formatted = dbAds.map((a) => ({
            id: a._id.toString(),
            title: a.title,
            description: a.description,
            imageUrl: a.imageUrl,
            destinationUrl: a.destinationUrl,
            buttonText: a.buttonText,
            priority: a.priority,
            frequency: a.frequency,
            isActive: a.isActive,
            startDate: a.startDate ? a.startDate.toISOString().split('T')[0] : undefined,
            endDate: a.endDate ? a.endDate.toISOString().split('T')[0] : undefined,
            impressions: a.impressions || 0,
            clicks: a.clicks || 0,
            dismissals: a.dismissals || 0,
            createdAt: a.createdAt.toISOString(),
            updatedAt: a.updatedAt.toISOString(),
          }));
          res.json({ success: true, data: formatted });
          return;
        }
      } catch (dbErr) {
        console.warn('DB advertisement query failed:', dbErr);
      }
    }

    res.json({ success: true, data: inMemoryAdvertisements });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/cms/advertisements/active - Active ad popup (Public)
router.get('/advertisements/active', async (req: Request, res: Response) => {
  try {
    const now = new Date();

    if (isDbConnected()) {
      try {
        const activeAd = await AdvertisementModel.findOne({
          isActive: true,
          $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }],
          $and: [{ $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] }],
        }).sort({ priority: 1, createdAt: -1 });

        if (activeAd) {
          res.json({
            success: true,
            data: {
              id: activeAd._id.toString(),
              title: activeAd.title,
              description: activeAd.description,
              imageUrl: activeAd.imageUrl,
              destinationUrl: activeAd.destinationUrl,
              buttonText: activeAd.buttonText,
              priority: activeAd.priority,
              frequency: activeAd.frequency,
              isActive: activeAd.isActive,
            },
          });
          return;
        }
      } catch (dbErr) {
        console.warn('DB active ad query failed:', dbErr);
      }
    }

    const eligible = inMemoryAdvertisements
      .filter((a) => {
        if (!a.isActive) return false;
        if (a.startDate && new Date(a.startDate) > now) return false;
        if (a.endDate && new Date(a.endDate) < now) return false;
        return true;
      })
      .sort((a, b) => a.priority - b.priority);

    if (eligible.length > 0) {
      const topAd = eligible[0];
      res.json({
        success: true,
        data: {
          id: topAd.id,
          title: topAd.title,
          description: topAd.description,
          imageUrl: topAd.imageUrl,
          destinationUrl: topAd.destinationUrl,
          buttonText: topAd.buttonText,
          priority: topAd.priority,
          frequency: topAd.frequency,
          isActive: topAd.isActive,
        },
      });
      return;
    }

    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/cms/advertisements - Create advertisement (Admin)
router.post('/advertisements', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      imageUrl,
      destinationUrl,
      buttonText,
      priority,
      frequency,
      isActive,
      startDate,
      endDate,
    } = req.body;

    if (!title || !imageUrl) {
      res.status(400).json({ success: false, error: 'Title and advertisement image are required.' });
      return;
    }

    const now = new Date().toISOString();
    const newAd: AdvertisementItem = {
      id: `ad-${Date.now()}`,
      title: title.trim(),
      description: description?.trim() || '',
      imageUrl: imageUrl.trim(),
      destinationUrl: destinationUrl?.trim() || '/shop',
      buttonText: buttonText?.trim() || 'Claim Deal',
      priority: typeof priority === 'number' ? priority : 1,
      frequency: frequency || 'once_per_session',
      isActive: isActive !== false,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      impressions: 0,
      clicks: 0,
      dismissals: 0,
      createdAt: now,
      updatedAt: now,
    };

    inMemoryAdvertisements.push(newAd);

    if (isDbConnected()) {
      try {
        const created = await AdvertisementModel.create({
          title: newAd.title,
          description: newAd.description,
          imageUrl: newAd.imageUrl,
          destinationUrl: newAd.destinationUrl,
          buttonText: newAd.buttonText,
          priority: newAd.priority,
          frequency: newAd.frequency,
          isActive: newAd.isActive,
          startDate: newAd.startDate ? new Date(newAd.startDate) : undefined,
          endDate: newAd.endDate ? new Date(newAd.endDate) : undefined,
          impressions: 0,
          clicks: 0,
          dismissals: 0,
        });
        newAd.id = created._id.toString();
      } catch (dbErr: any) {
        console.warn('Ad DB persistence failed:', dbErr.message);
      }
    }

    const user = (req as any).user;
    await recordActivityLog({
      action: 'ADVERTISEMENT_CREATE',
      category: 'catalog',
      actorName: user?.name || 'Administrator',
      actorEmail: user?.email,
      actorRole: user?.role || 'admin',
      resourceId: newAd.id,
      details: `Created promotion popup "${newAd.title}"`,
    });

    res.status(201).json({
      success: true,
      data: newAd,
      message: 'Advertisement campaign created and active for visitors.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/cms/advertisements/:id - Update advertisement (Admin)
router.put('/advertisements/:id', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ad = inMemoryAdvertisements.find((a) => a.id === id);

    if (!ad) {
      res.status(404).json({ success: false, error: 'Advertisement not found.' });
      return;
    }

    const {
      title,
      description,
      imageUrl,
      destinationUrl,
      buttonText,
      priority,
      frequency,
      isActive,
      startDate,
      endDate,
    } = req.body;

    if (title !== undefined) ad.title = title;
    if (description !== undefined) ad.description = description;
    if (imageUrl !== undefined) ad.imageUrl = imageUrl;
    if (destinationUrl !== undefined) ad.destinationUrl = destinationUrl;
    if (buttonText !== undefined) ad.buttonText = buttonText;
    if (priority !== undefined) ad.priority = Number(priority);
    if (frequency !== undefined) ad.frequency = frequency;
    if (isActive !== undefined) ad.isActive = Boolean(isActive);
    if (startDate !== undefined) ad.startDate = startDate;
    if (endDate !== undefined) ad.endDate = endDate;
    ad.updatedAt = new Date().toISOString();

    if (isDbConnected()) {
      try {
        await AdvertisementModel.findByIdAndUpdate(id, {
          title: ad.title,
          description: ad.description,
          imageUrl: ad.imageUrl,
          destinationUrl: ad.destinationUrl,
          buttonText: ad.buttonText,
          priority: ad.priority,
          frequency: ad.frequency,
          isActive: ad.isActive,
          startDate: ad.startDate ? new Date(ad.startDate) : undefined,
          endDate: ad.endDate ? new Date(ad.endDate) : undefined,
        });
      } catch (dbErr: any) {
        console.warn('Ad update DB fallback:', dbErr.message);
      }
    }

    res.json({
      success: true,
      data: ad,
      message: 'Advertisement campaign settings updated successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/cms/advertisements/:id/toggle - Toggle ad (Admin)
router.patch('/advertisements/:id/toggle', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ad = inMemoryAdvertisements.find((a) => a.id === id);

    if (!ad) {
      res.status(404).json({ success: false, error: 'Advertisement not found.' });
      return;
    }

    ad.isActive = !ad.isActive;
    ad.updatedAt = new Date().toISOString();

    if (isDbConnected()) {
      try {
        await AdvertisementModel.findByIdAndUpdate(id, { isActive: ad.isActive });
      } catch (dbErr: any) {
        console.warn('Ad toggle DB fallback:', dbErr.message);
      }
    }

    res.json({
      success: true,
      data: ad,
      message: `Advertisement is now ${ad.isActive ? 'active' : 'paused'}.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/cms/advertisements/:id - Delete advertisement (Admin)
router.delete('/advertisements/:id', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idx = inMemoryAdvertisements.findIndex((a) => a.id === id);

    if (idx === -1) {
      res.status(404).json({ success: false, error: 'Advertisement not found.' });
      return;
    }

    inMemoryAdvertisements.splice(idx, 1);

    if (isDbConnected()) {
      try {
        await AdvertisementModel.findByIdAndDelete(id);
      } catch (dbErr: any) {
        console.warn('Ad deletion DB fallback:', dbErr.message);
      }
    }

    res.json({ success: true, message: 'Advertisement campaign deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Interactions tracking (public)
router.post('/advertisements/:id/impression', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ad = inMemoryAdvertisements.find((a) => a.id === id);
    if (ad) ad.impressions = (ad.impressions || 0) + 1;
    if (isDbConnected()) {
      try {
        await AdvertisementModel.findByIdAndUpdate(id, { $inc: { impressions: 1 } });
      } catch (e) {}
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/advertisements/:id/click', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ad = inMemoryAdvertisements.find((a) => a.id === id);
    if (ad) ad.clicks = (ad.clicks || 0) + 1;
    if (isDbConnected()) {
      try {
        await AdvertisementModel.findByIdAndUpdate(id, { $inc: { clicks: 1 } });
      } catch (e) {}
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/advertisements/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ad = inMemoryAdvertisements.find((a) => a.id === id);
    if (ad) ad.dismissals = (ad.dismissals || 0) + 1;
    if (isDbConnected()) {
      try {
        await AdvertisementModel.findByIdAndUpdate(id, { $inc: { dismissals: 1 } });
      } catch (e) {}
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 5. CMS ANNOUNCEMENT & FOOTER ENQUIRIES
// ==========================================

router.get('/homepage', (req: Request, res: Response) => {
  res.json({ success: true, data: inMemoryCMS });
});

router.put('/homepage', requireAuth, requireRole(['admin', 'super_admin', 'catalog_manager']), (req: Request, res: Response) => {
  inMemoryCMS = {
    ...inMemoryCMS,
    ...req.body,
  };
  res.json({ success: true, data: inMemoryCMS, message: 'CMS settings saved successfully' });
});

router.post('/newsletter', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    res.status(400).json({ success: false, error: 'Please enter a valid email address' });
    return;
  }

  const normalized = email.toLowerCase().trim();
  if (inMemoryNewsletter.includes(normalized)) {
    res.json({ success: true, message: 'You are already subscribed to our newsletter!' });
    return;
  }

  inMemoryNewsletter.push(normalized);
  res.status(201).json({
    success: true,
    message: 'Welcome to the NOVARA club! You have been subscribed for exclusive deals.',
  });
});

router.post('/support-enquiry', (req: Request, res: Response) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    res.status(400).json({ success: false, error: 'Name, email, and message are required' });
    return;
  }

  const enquiry = {
    id: `enq-${Date.now()}`,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    subject: subject?.trim() || 'General Inquiry',
    message: message.trim(),
    status: 'open',
    createdAt: new Date(),
  };

  inMemoryEnquiries.push(enquiry);
  res.status(201).json({
    success: true,
    message: 'Thank you for reaching out! Our Dhaka support desk will contact you shortly.',
  });
});

export default router;
