import mongoose, { Schema, Document } from 'mongoose';

export type BannerPlacement =
  | 'homepage-main'
  | 'homepage-secondary'
  | 'homepage-category'
  | 'homepage-promotion'
  | 'category-page'
  | 'product-listing'
  | 'product-detail'
  | 'custom-promo';

export interface GradientStop {
  color: string;
  position: number; // 0 to 100
  opacity?: number; // 0 to 1
}

export interface BannerLayer {
  id: string;
  name: string;
  type: 'background' | 'overlay' | 'image' | 'gradient' | 'text' | 'shape';
  visible: boolean;
  zIndex: number;
  opacity: number;
  config: Record<string, any>;
  locked?: boolean;
}

export interface IBanner extends Document {
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
    angle: number; // 0 to 360
    stops: GradientStop[];
  };

  // Background Image & Transformation
  bgImage?: {
    url: string;
    positionX: number; // 0 to 100
    positionY: number; // 0 to 100
    alignment: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'custom';
    objectFit: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
    scale: number; // 0.5 to 3
    rotation: number; // -180 to 180
    zoom: number; // 1 to 3
    opacity: number; // 0 to 1
    blur: number; // 0 to 20px
  };

  // Overlay System
  overlay?: {
    enabled: boolean;
    type: 'solid' | 'gradient';
    color: string;
    opacity: number; // 0 to 1
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

  // Scheduling
  startDate?: string;
  endDate?: string;

  createdAt: Date;
  updatedAt: Date;
}

const GradientStopSchema = new Schema(
  {
    color: { type: String, required: true },
    position: { type: Number, required: true, min: 0, max: 100 },
    opacity: { type: Number, default: 1, min: 0, max: 1 },
  },
  { _id: false }
);

const BannerLayerSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['background', 'overlay', 'image', 'gradient', 'text', 'shape'],
    },
    visible: { type: Boolean, default: true },
    zIndex: { type: Number, default: 0 },
    opacity: { type: Number, default: 1, min: 0, max: 1 },
    config: { type: Schema.Types.Mixed, default: {} },
    locked: { type: Boolean, default: false },
  },
  { _id: false }
);

const BannerSchema = new Schema<IBanner>(
  {
    name: { type: String, required: true, default: 'Untitled Banner' },
    status: {
      type: String,
      enum: ['draft', 'published', 'scheduled', 'disabled'],
      default: 'published',
      index: true,
    },
    placement: {
      type: String,
      required: true,
      enum: [
        'homepage-main',
        'homepage-secondary',
        'homepage-category',
        'homepage-promotion',
        'category-page',
        'product-listing',
        'product-detail',
        'custom-promo',
      ],
      index: true,
    },
    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },

    bgType: {
      type: String,
      enum: ['solid', 'gradient', 'image', 'image-overlay', 'image-gradient', 'multi-layer'],
      default: 'solid',
    },
    backgroundColor: { type: String, default: '#0c261e' },
    textColor: { type: String, default: '#ffffff' },

    gradient: {
      type: {
        type: String,
        enum: ['linear', 'radial'],
        default: 'linear',
      },
      angle: { type: Number, default: 135, min: 0, max: 360 },
      stops: [GradientStopSchema],
    },

    bgImage: {
      url: { type: String, default: '' },
      positionX: { type: Number, default: 50, min: 0, max: 100 },
      positionY: { type: Number, default: 50, min: 0, max: 100 },
      alignment: {
        type: String,
        enum: ['center', 'top', 'bottom', 'left', 'right', 'custom'],
        default: 'center',
      },
      objectFit: {
        type: String,
        enum: ['cover', 'contain', 'fill', 'scale-down', 'none'],
        default: 'cover',
      },
      scale: { type: Number, default: 1, min: 0.2, max: 5 },
      rotation: { type: Number, default: 0, min: -180, max: 180 },
      zoom: { type: Number, default: 1, min: 1, max: 3 },
      opacity: { type: Number, default: 1, min: 0, max: 1 },
      blur: { type: Number, default: 0, min: 0, max: 50 },
    },

    overlay: {
      enabled: { type: Boolean, default: false },
      type: { type: String, enum: ['solid', 'gradient'], default: 'solid' },
      color: { type: String, default: '#000000' },
      opacity: { type: Number, default: 0.35, min: 0, max: 1 },
      blendMode: { type: String, default: 'normal' },
      direction: { type: String, default: 'to-bottom' },
      gradientStops: [GradientStopSchema],
    },

    layers: [BannerLayerSchema],

    tag: { type: String },
    headline: { type: String },
    subheadline: { type: String },
    buttonText: { type: String },
    buttonLink: { type: String },
    textAlign: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
    contentPosition: {
      type: String,
      enum: ['left', 'center', 'right', 'top-left', 'bottom-left', 'top-right', 'bottom-right'],
      default: 'left',
    },
    maxContentWidth: { type: Number, default: 600 },

    destinationLink: { type: String },
    openInNewTab: { type: Boolean, default: false },

    responsive: {
      desktopHeight: { type: Number, default: 450 },
      tabletHeight: { type: Number, default: 350 },
      mobileHeight: { type: Number, default: 280 },
      hideOnMobile: { type: Boolean, default: false },
    },

    startDate: { type: String },
    endDate: { type: String },
  },
  { timestamps: true }
);

export const BannerModel =
  mongoose.models.Banner || mongoose.model<IBanner>('Banner', BannerSchema);
