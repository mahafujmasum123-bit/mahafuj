import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/modal/Modal';
import { BannerRenderer, BannerData } from '../../../components/banner/BannerRenderer';
import { BannerPlacement, GradientStop, BannerLayer } from '../../../../server/models/Banner';
import {
  Upload,
  Image as ImageIcon,
  Sliders,
  Layers,
  Palette,
  Maximize2,
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Move,
  Link as LinkIcon,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Copy,
} from 'lucide-react';

export interface BannerFormData extends BannerData {
  id?: string;
  name: string;
  status: 'draft' | 'published' | 'scheduled' | 'disabled';
  placement: BannerPlacement;
  displayOrder: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

interface BannerDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BannerFormData) => Promise<void>;
  initialData?: BannerFormData | null;
  token?: string | null;
}

const PRESET_BANNER_IMAGES = [
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=85',
  'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=900&q=85',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=85',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000&q=85',
  'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200&q=85',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000&q=85',
];

const PRESET_GRADIENTS: { name: string; stops: GradientStop[]; angle: number }[] = [
  {
    name: 'Forest Glow',
    angle: 135,
    stops: [
      { color: '#051b14', position: 0, opacity: 1 },
      { color: '#0d3829', position: 50, opacity: 1 },
      { color: '#165b43', position: 100, opacity: 1 },
    ],
  },
  {
    name: 'Dark Obsidian',
    angle: 180,
    stops: [
      { color: '#090d16', position: 0, opacity: 1 },
      { color: '#111827', position: 100, opacity: 1 },
    ],
  },
  {
    name: 'Royal Emerald',
    angle: 120,
    stops: [
      { color: '#022c22', position: 0, opacity: 1 },
      { color: '#065f46', position: 70, opacity: 1 },
      { color: '#059669', position: 100, opacity: 1 },
    ],
  },
  {
    name: 'Midnight Violet',
    angle: 135,
    stops: [
      { color: '#1e1b4b', position: 0, opacity: 1 },
      { color: '#312e81', position: 60, opacity: 1 },
      { color: '#4338ca', position: 100, opacity: 1 },
    ],
  },
  {
    name: 'Amber Glow',
    angle: 90,
    stops: [
      { color: '#451a03', position: 0, opacity: 1 },
      { color: '#78350f', position: 50, opacity: 1 },
      { color: '#d97706', position: 100, opacity: 1 },
    ],
  },
  {
    name: 'Ocean Depth',
    angle: 160,
    stops: [
      { color: '#082f49', position: 0, opacity: 1 },
      { color: '#0369a1', position: 60, opacity: 1 },
      { color: '#0284c7', position: 100, opacity: 1 },
    ],
  },
  {
    name: 'Rose Velvet',
    angle: 135,
    stops: [
      { color: '#4c0519', position: 0, opacity: 1 },
      { color: '#9f1239', position: 50, opacity: 1 },
      { color: '#e11d48', position: 100, opacity: 1 },
    ],
  },
  {
    name: 'Neon Cyber',
    angle: 45,
    stops: [
      { color: '#064e3b', position: 0, opacity: 1 },
      { color: '#0284c7', position: 50, opacity: 1 },
      { color: '#9333ea', position: 100, opacity: 1 },
    ],
  },
];

const DEFAULT_BANNER: BannerFormData = {
  name: 'New Promotional Banner',
  status: 'published',
  placement: 'homepage-secondary',
  displayOrder: 1,
  isActive: true,
  bgType: 'image-overlay',
  backgroundColor: '#0c261e',
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
    url: PRESET_BANNER_IMAGES[0],
    positionX: 50,
    positionY: 50,
    alignment: 'center',
    objectFit: 'cover',
    scale: 1,
    rotation: 0,
    zoom: 1,
    opacity: 1,
    blur: 0,
  },
  overlay: {
    enabled: true,
    type: 'solid',
    color: '#000000',
    opacity: 0.45,
    blendMode: 'normal',
    gradientStops: [
      { color: '#000000', position: 0, opacity: 0.7 },
      { color: 'transparent', position: 80, opacity: 0 },
    ],
  },
  layers: [
    { id: 'lay-1', name: 'Background Base', type: 'background', visible: true, zIndex: 0, opacity: 1, config: {} },
    { id: 'lay-2', name: 'Product Photography', type: 'image', visible: true, zIndex: 1, opacity: 1, config: {} },
    { id: 'lay-3', name: 'Dark Tint Overlay', type: 'overlay', visible: true, zIndex: 2, opacity: 0.45, config: {} },
  ],
  tag: '',
  headline: '',
  subheadline: '',
  buttonText: '',
  buttonLink: '',
  textAlign: 'left',
  contentPosition: 'left',
  maxContentWidth: 620,
  destinationLink: '',
  openInNewTab: false,
  responsive: {
    desktopHeight: 440,
    tabletHeight: 360,
    mobileHeight: 280,
    hideOnMobile: false,
  },
};

export const BannerDesignerModal: React.FC<BannerDesignerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  token,
}) => {
  const [formData, setFormData] = useState<BannerFormData>(DEFAULT_BANNER);
  const [designerTab, setDesignerTab] = useState<
    'canvas' | 'gradient' | 'overlay' | 'layers' | 'content' | 'settings'
  >('canvas');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...DEFAULT_BANNER,
        ...initialData,
        bgImage: {
          ...DEFAULT_BANNER.bgImage,
          ...(initialData.bgImage || {}),
        },
        gradient: {
          ...DEFAULT_BANNER.gradient,
          ...(initialData.gradient || {}),
        },
        overlay: {
          ...DEFAULT_BANNER.overlay,
          ...(initialData.overlay || {}),
        },
        layers: initialData.layers && initialData.layers.length > 0 ? initialData.layers : DEFAULT_BANNER.layers,
        responsive: {
          ...DEFAULT_BANNER.responsive,
          ...(initialData.responsive || {}),
        },
      });
    } else {
      setFormData({
        ...DEFAULT_BANNER,
        id: undefined,
      });
    }
    setUploadError(null);
  }, [initialData, isOpen]);

  // Local Image Upload Handler via /api/upload/file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size exceeds 10MB limit.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await fetch('/api/upload/file', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify({
              fileBase64: base64,
              filename: file.name,
              folder: 'banners',
            }),
          });

          const data = await res.json();
          if (data.success && data.url) {
            setFormData((prev) => ({
              ...prev,
              bgImage: {
                ...(prev.bgImage || {
                  positionX: 50,
                  positionY: 50,
                  alignment: 'center',
                  objectFit: 'cover',
                  scale: 1,
                  rotation: 0,
                  zoom: 1,
                  opacity: 1,
                  blur: 0,
                }),
                url: data.url,
              },
            }));
          } else {
            setUploadError(data.error || 'Failed to upload image.');
          }
        } catch {
          setUploadError('Network error uploading image.');
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setUploadError('Failed to read image from disk.');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadError('Unexpected upload exception.');
      setIsUploading(false);
    }
  };

  const handleResetTransformations = () => {
    setFormData((prev) => ({
      ...prev,
      bgImage: {
        ...(prev.bgImage || { url: '' }),
        positionX: 50,
        positionY: 50,
        alignment: 'center',
        objectFit: 'cover',
        scale: 1,
        rotation: 0,
        zoom: 1,
        opacity: 1,
        blur: 0,
      },
    }));
  };

  // Gradient Stops Management
  const handleAddGradientStop = () => {
    const existingStops = formData.gradient?.stops || [];
    const newPos = existingStops.length > 0 ? Math.min(100, existingStops[existingStops.length - 1].position + 20) : 50;
    const newStop: GradientStop = {
      color: '#10b981',
      position: newPos,
      opacity: 1,
    };
    setFormData((prev) => ({
      ...prev,
      gradient: {
        type: prev.gradient?.type || 'linear',
        angle: prev.gradient?.angle || 135,
        stops: [...(prev.gradient?.stops || []), newStop],
      },
    }));
  };

  const handleRemoveGradientStop = (index: number) => {
    const existingStops = formData.gradient?.stops || [];
    if (existingStops.length <= 2) return; // Maintain at least 2 stops
    const updated = existingStops.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      gradient: {
        type: prev.gradient?.type || 'linear',
        angle: prev.gradient?.angle || 135,
        stops: updated,
      },
    }));
  };

  const handleUpdateGradientStop = (index: number, updates: Partial<GradientStop>) => {
    const existingStops = [...(formData.gradient?.stops || [])];
    if (existingStops[index]) {
      existingStops[index] = { ...existingStops[index], ...updates };
      setFormData((prev) => ({
        ...prev,
        gradient: {
          type: prev.gradient?.type || 'linear',
          angle: prev.gradient?.angle || 135,
          stops: existingStops,
        },
      }));
    }
  };

  // Layer Management Actions
  const handleMoveLayer = (index: number, direction: 'up' | 'down') => {
    const layers = [...(formData.layers || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= layers.length) return;

    const temp = layers[index];
    layers[index] = layers[targetIndex];
    layers[targetIndex] = temp;

    // Recalculate zIndex
    layers.forEach((layer, idx) => {
      layer.zIndex = idx;
    });

    setFormData((prev) => ({ ...prev, layers }));
  };

  const handleToggleLayerVisibility = (index: number) => {
    const layers = [...(formData.layers || [])];
    if (layers[index]) {
      layers[index].visible = !layers[index].visible;
      setFormData((prev) => ({ ...prev, layers }));
    }
  };

  const handleDeleteLayer = (index: number) => {
    const layers = [...(formData.layers || [])];
    if (layers.length <= 1) return; // Preserve at least 1 layer
    layers.splice(index, 1);
    layers.forEach((l, idx) => {
      l.zIndex = idx;
    });
    setFormData((prev) => ({ ...prev, layers }));
  };

  const handleAddLayer = (type: 'image' | 'overlay' | 'gradient' | 'shape') => {
    const layers = [...(formData.layers || [])];
    const newLayer: BannerLayer = {
      id: `lay-${Date.now()}`,
      name: `New ${type.toUpperCase()} Layer`,
      type,
      visible: true,
      zIndex: layers.length,
      opacity: 1,
      config: type === 'overlay' ? { color: '#000000' } : {},
    };
    layers.push(newLayer);
    setFormData((prev) => ({ ...prev, layers }));
  };

  const handleSubmit = async (statusOverride?: 'draft' | 'published') => {
    setIsSubmitting(true);
    setUploadError(null);
    try {
      const dataToSave: BannerFormData = {
        ...formData,
        status: statusOverride || formData.status,
      };
      await onSave(dataToSave);
      onClose();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to save banner.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData?.id ? `Edit Banner: ${formData.name}` : 'Advanced Visual Banner Designer'}
      description="Visual CMS studio: customize backgrounds, multi-stop gradients, image transformations, overlays, layers, and placement."
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {uploadError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* 1. Header Toolbar: Name, Placement, Status, Viewport Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-gray-50 border border-gray-200 rounded-2xl">
          <div className="flex flex-1 items-center gap-3">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Banner Name..."
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-emerald-600 flex-1 max-w-xs"
            />

            <select
              value={formData.placement}
              onChange={(e) => setFormData({ ...formData, placement: e.target.value as BannerPlacement })}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-emerald-600"
            >
              <option value="homepage-main">Homepage Main Banner</option>
              <option value="homepage-secondary">Dual Split Secondary Card</option>
              <option value="homepage-category">Category Spotlight</option>
              <option value="homepage-promotion">Homepage Discount Strip</option>
              <option value="category-page">Category Page Header</option>
              <option value="product-listing">Product Listing Inset</option>
              <option value="product-detail">Product Detail Promotion</option>
              <option value="custom-promo">Custom Promotional Placement</option>
            </select>
          </div>

          {/* Responsive Viewport Switcher */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 self-end md:self-auto">
            <button
              type="button"
              onClick={() => setPreviewViewport('desktop')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                previewViewport === 'desktop' ? 'bg-emerald-800 text-white shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Desktop View (1200px)"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewViewport('tablet')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                previewViewport === 'tablet' ? 'bg-emerald-800 text-white shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewViewport('mobile')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                previewViewport === 'mobile' ? 'bg-emerald-800 text-white shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Interactive Live Preview Canvas */}
        <div className="bg-slate-900/5 p-4 rounded-3xl border border-gray-200/80 flex items-center justify-center overflow-x-auto min-h-[300px]">
          <div
            style={{
              width: previewViewport === 'mobile' ? '360px' : previewViewport === 'tablet' ? '680px' : '100%',
              maxWidth: '960px',
              transition: 'width 0.3s ease-in-out',
            }}
          >
            <BannerRenderer
              banner={formData}
              viewport={previewViewport}
              isEditorPreview={true}
            />
          </div>
        </div>

        {/* 3. Designer Configuration Tabs */}
        <div className="border-b border-gray-200 flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setDesignerTab('canvas')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer shrink-0 ${
              designerTab === 'canvas' ? 'bg-emerald-800 text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Background &amp; Image</span>
          </button>

          <button
            type="button"
            onClick={() => setDesignerTab('gradient')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer shrink-0 ${
              designerTab === 'gradient' ? 'bg-emerald-800 text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Gradient Builder</span>
          </button>

          <button
            type="button"
            onClick={() => setDesignerTab('overlay')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer shrink-0 ${
              designerTab === 'overlay' ? 'bg-emerald-800 text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Overlays &amp; Blending</span>
          </button>

          <button
            type="button"
            onClick={() => setDesignerTab('layers')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer shrink-0 ${
              designerTab === 'layers' ? 'bg-emerald-800 text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Layers Stack ({formData.layers?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setDesignerTab('content')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer shrink-0 ${
              designerTab === 'content' ? 'bg-emerald-800 text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Content &amp; Link</span>
          </button>

          <button
            type="button"
            onClick={() => setDesignerTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer shrink-0 ${
              designerTab === 'settings' ? 'bg-emerald-800 text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Placement &amp; Responsive</span>
          </button>
        </div>

        {/* 4. Tab Panels */}
        {/* TAB 1: BACKGROUND & IMAGE */}
        {designerTab === 'canvas' && (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Background Technique</label>
                <select
                  value={formData.bgType}
                  onChange={(e) => setFormData({ ...formData, bgType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900"
                >
                  <option value="solid">Solid Color</option>
                  <option value="gradient">Multi-Color Gradient</option>
                  <option value="image">Background Image</option>
                  <option value="image-overlay">Background Image + Solid Overlay</option>
                  <option value="image-gradient">Background Image + Gradient Overlay</option>
                  <option value="multi-layer">Multi-Layer Composite</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Base Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.backgroundColor || '#0c261e'}
                    onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={formData.backgroundColor}
                    onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Image Upload & Presets */}
            <div className="p-4 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">Background Imagery</span>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs">
                  <Upload className="w-3 h-3" />
                  <span>{isUploading ? 'Uploading...' : 'Upload from Device'}</span>
                  <input type="file" accept="image/*" disabled={isUploading} onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <input
                type="url"
                placeholder="Or paste direct image URL (https://...)"
                value={formData.bgImage?.url || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    bgImage: { ...(prev.bgImage || { positionX: 50, positionY: 50, alignment: 'center', objectFit: 'cover', scale: 1, rotation: 0, zoom: 1, opacity: 1, blur: 0 }), url: e.target.value },
                  }))
                }
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-mono"
              />

              {/* Presets */}
              <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                <span className="text-[11px] text-gray-400 font-semibold shrink-0">Presets:</span>
                {PRESET_BANNER_IMAGES.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        bgImage: { ...(prev.bgImage || { positionX: 50, positionY: 50, alignment: 'center', objectFit: 'cover', scale: 1, rotation: 0, zoom: 1, opacity: 1, blur: 0 }), url: img },
                      }))
                    }
                    className={`w-9 h-9 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                      formData.bgImage?.url === img ? 'border-emerald-600 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="Preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Transformations & Position */}
            <div className="p-4 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                <span className="text-xs font-bold text-gray-800">Positioning &amp; Transformations</span>
                <button
                  type="button"
                  onClick={handleResetTransformations}
                  className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Controls</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Alignment</label>
                  <select
                    value={formData.bgImage?.alignment || 'center'}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bgImage: { ...(prev.bgImage || { positionX: 50, positionY: 50, alignment: 'center', objectFit: 'cover', scale: 1, rotation: 0, zoom: 1, opacity: 1, blur: 0 }), alignment: e.target.value as any },
                      }))
                    }
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg"
                  >
                    <option value="center">Center</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="custom">Custom (X/Y)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Object Fit</label>
                  <select
                    value={formData.bgImage?.objectFit || 'cover'}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bgImage: { ...(prev.bgImage || { positionX: 50, positionY: 50, alignment: 'center', objectFit: 'cover', scale: 1, rotation: 0, zoom: 1, opacity: 1, blur: 0 }), objectFit: e.target.value as any },
                      }))
                    }
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg"
                  >
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="fill">Fill</option>
                    <option value="scale-down">Scale Down</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-500 font-semibold mb-1">
                    Scale ({formData.bgImage?.scale || 1}x)
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.05"
                    value={formData.bgImage?.scale ?? 1}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bgImage: { ...(prev.bgImage || { positionX: 50, positionY: 50, alignment: 'center', objectFit: 'cover', scale: 1, rotation: 0, zoom: 1, opacity: 1, blur: 0 }), scale: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-semibold mb-1">
                    Rotation ({formData.bgImage?.rotation || 0}°)
                  </label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={formData.bgImage?.rotation ?? 0}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bgImage: { ...(prev.bgImage || { positionX: 50, positionY: 50, alignment: 'center', objectFit: 'cover', scale: 1, rotation: 0, zoom: 1, opacity: 1, blur: 0 }), rotation: parseInt(e.target.value, 10) },
                      }))
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-semibold mb-1">
                    X-Position ({formData.bgImage?.positionX ?? 50}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.bgImage?.positionX ?? 50}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bgImage: { ...(prev.bgImage || { positionX: 50, positionY: 50, alignment: 'center', objectFit: 'cover', scale: 1, rotation: 0, zoom: 1, opacity: 1, blur: 0 }), positionX: parseInt(e.target.value, 10), alignment: 'custom' },
                      }))
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-semibold mb-1">
                    Y-Position ({formData.bgImage?.positionY ?? 50}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.bgImage?.positionY ?? 50}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bgImage: { ...(prev.bgImage || { positionX: 50, positionY: 50, alignment: 'center', objectFit: 'cover', scale: 1, rotation: 0, zoom: 1, opacity: 1, blur: 0 }), positionY: parseInt(e.target.value, 10), alignment: 'custom' },
                      }))
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-semibold mb-1">
                    Opacity ({Math.round((formData.bgImage?.opacity ?? 1) * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.bgImage?.opacity ?? 1}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bgImage: { ...(prev.bgImage || { positionX: 50, positionY: 50, alignment: 'center', objectFit: 'cover', scale: 1, rotation: 0, zoom: 1, opacity: 1, blur: 0 }), opacity: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-semibold mb-1">
                    Blur ({formData.bgImage?.blur || 0}px)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={formData.bgImage?.blur ?? 0}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bgImage: { ...(prev.bgImage || { positionX: 50, positionY: 50, alignment: 'center', objectFit: 'cover', scale: 1, rotation: 0, zoom: 1, opacity: 1, blur: 0 }), blur: parseInt(e.target.value, 10) },
                      }))
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MULTI-COLOR GRADIENT BUILDER */}
        {designerTab === 'gradient' && (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {/* Presets Grid */}
            <div>
              <span className="text-xs font-bold text-gray-700 block mb-2">Preset Color Harmonies</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_GRADIENTS.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        gradient: {
                          type: 'linear',
                          angle: p.angle,
                          stops: p.stops,
                        },
                      }))
                    }
                    className="p-2 bg-gray-50 border border-gray-200 hover:border-emerald-600 rounded-xl text-left transition cursor-pointer flex items-center gap-2"
                  >
                    <div
                      className="w-6 h-6 rounded-lg shrink-0 border border-white/40 shadow-2xs"
                      style={{
                        background: `linear-gradient(${p.angle}deg, ${p.stops.map((s) => s.color).join(', ')})`,
                      }}
                    />
                    <span className="text-[11px] font-bold text-gray-800 truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Gradient Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Gradient Type</label>
                <select
                  value={formData.gradient?.type || 'linear'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      gradient: {
                        stops: prev.gradient?.stops || [],
                        type: e.target.value as any,
                        angle: prev.gradient?.angle || 135,
                      },
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  <option value="linear">Linear Gradient</option>
                  <option value="radial">Radial Gradient</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Angle ({formData.gradient?.angle || 135}°)
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={formData.gradient?.angle || 135}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      gradient: {
                        stops: prev.gradient?.stops || [],
                        type: prev.gradient?.type || 'linear',
                        angle: parseInt(e.target.value, 10),
                      },
                    }))
                  }
                  className="w-full accent-emerald-600 mt-2"
                />
              </div>
            </div>

            {/* Color Stops Manager */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">
                  Color Stops ({formData.gradient?.stops?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={handleAddGradientStop}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stop</span>
                </button>
              </div>

              <div className="space-y-2">
                {(formData.gradient?.stops || []).map((stop, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs"
                  >
                    <span className="text-gray-400 font-bold w-4">#{idx + 1}</span>
                    <input
                      type="color"
                      value={stop.color}
                      onChange={(e) => handleUpdateGradientStop(idx, { color: e.target.value })}
                      className="w-7 h-7 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={stop.color}
                      onChange={(e) => handleUpdateGradientStop(idx, { color: e.target.value })}
                      className="w-20 px-2 py-1 bg-white border border-gray-200 rounded-lg font-mono text-[11px]"
                    />

                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-[11px] text-gray-500 font-semibold w-12">
                        {stop.position}%
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={stop.position}
                        onChange={(e) =>
                          handleUpdateGradientStop(idx, { position: parseInt(e.target.value, 10) })
                        }
                        className="flex-1 accent-emerald-600"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={(formData.gradient?.stops?.length || 0) <= 2}
                      onClick={() => handleRemoveGradientStop(idx)}
                      className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                      title="Delete stop"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: OVERLAYS & BLENDING */}
        {designerTab === 'overlay' && (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-gray-900 block">Dark Shade / Tint Overlay</span>
                <span className="text-[11px] text-gray-500">
                  Protects readability for typography layered over busy photography.
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.overlay?.enabled !== false}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      overlay: {
                        color: prev.overlay?.color || '#000000',
                        opacity: prev.overlay?.opacity ?? 0.45,
                        blendMode: prev.overlay?.blendMode || 'normal',
                        type: prev.overlay?.type || 'solid',
                        enabled: e.target.checked,
                      },
                    }))
                  }
                  className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-800">Enabled</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Overlay Tint Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.overlay?.color || '#000000'}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        overlay: { ...(prev.overlay || { enabled: true, opacity: 0.45, blendMode: 'normal', type: 'solid' }), color: e.target.value },
                      }))
                    }
                    className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={formData.overlay?.color || '#000000'}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        overlay: { ...(prev.overlay || { enabled: true, opacity: 0.45, blendMode: 'normal', type: 'solid' }), color: e.target.value },
                      }))
                    }
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Overlay Opacity ({Math.round((formData.overlay?.opacity ?? 0.45) * 100)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={formData.overlay?.opacity ?? 0.45}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      overlay: { ...(prev.overlay || { enabled: true, color: '#000000', blendMode: 'normal', type: 'solid' }), opacity: parseFloat(e.target.value) },
                    }))
                  }
                  className="w-full accent-emerald-600 mt-2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Blend Mode</label>
                <select
                  value={formData.overlay?.blendMode || 'normal'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      overlay: { ...(prev.overlay || { enabled: true, color: '#000000', opacity: 0.45, type: 'solid' }), blendMode: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  <option value="normal">Normal</option>
                  <option value="multiply">Multiply (Rich darks)</option>
                  <option value="overlay">Overlay (High contrast)</option>
                  <option value="darken">Darken</option>
                  <option value="screen">Screen (Lightened)</option>
                  <option value="color-burn">Color Burn</option>
                  <option value="soft-light">Soft Light</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Overlay Style</label>
                <select
                  value={formData.overlay?.type || 'solid'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      overlay: { ...(prev.overlay || { enabled: true, color: '#000000', opacity: 0.45, blendMode: 'normal' }), type: e.target.value as any },
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  <option value="solid">Solid Shade</option>
                  <option value="gradient">Gradient Shade (Fading)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LAYERS MANAGEMENT */}
        {designerTab === 'layers' && (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold text-gray-900 block">Visual Composition Stack</span>
                <span className="text-[11px] text-gray-500">
                  Manage z-index stacking order, visibility, and layer opacity.
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddLayer('image')}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  + Image
                </button>
                <button
                  type="button"
                  onClick={() => handleAddLayer('overlay')}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  + Tint
                </button>
                <button
                  type="button"
                  onClick={() => handleAddLayer('gradient')}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  + Gradient
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {(formData.layers || []).map((layer, idx) => (
                <div
                  key={layer.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                >
                  <span className="text-gray-400 font-bold font-mono">#{idx + 1}</span>

                  <button
                    type="button"
                    onClick={() => handleToggleLayerVisibility(idx)}
                    className="p-1 text-gray-500 hover:text-emerald-700 cursor-pointer"
                  >
                    {layer.visible ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                  </button>

                  <div className="flex-1">
                    <span className="font-bold text-gray-900">{layer.name}</span>
                    <span className="ml-2 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                      {layer.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveLayer(idx, 'up')}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === (formData.layers?.length || 0) - 1}
                      onClick={() => handleMoveLayer(idx, 'down')}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLayer(idx)}
                      className="p-1 rounded hover:bg-red-50 text-red-600 cursor-pointer ml-1"
                      title="Delete Layer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: OPTIONAL CONTENT & DESTINATION LINK */}
        {designerTab === 'content' && (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs text-emerald-900">
              💡 <strong>Optional Content:</strong> Leave headline and button fields empty to display a pristine image-only banner.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Badge Tag (Optional)</label>
                <input
                  type="text"
                  value={formData.tag || ''}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  placeholder="e.g. LIMITED EDITION, 40% OFF"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Headline Text (Optional)</label>
                <input
                  type="text"
                  value={formData.headline || ''}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  placeholder="e.g. Studio Acoustics Redefined"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Subheadline Description</label>
                <input
                  type="text"
                  value={formData.subheadline || ''}
                  onChange={(e) => setFormData({ ...formData, subheadline: e.target.value })}
                  placeholder="e.g. Certified lossless acoustics engineered for audiophiles."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Button Call to Action Label</label>
                <input
                  type="text"
                  value={formData.buttonText || ''}
                  onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                  placeholder="e.g. Shop Collection"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Button Destination URL</label>
                <input
                  type="text"
                  value={formData.buttonLink || ''}
                  onChange={(e) => setFormData({ ...formData, buttonLink: e.target.value })}
                  placeholder="/shop or /shop?category=electronics"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Text Alignment</label>
                <select
                  value={formData.textAlign || 'left'}
                  onChange={(e) => setFormData({ ...formData, textAlign: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  <option value="left">Left Aligned</option>
                  <option value="center">Centered</option>
                  <option value="right">Right Aligned</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Content Block Position</label>
                <select
                  value={formData.contentPosition || 'left'}
                  onChange={(e) => setFormData({ ...formData, contentPosition: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  <option value="left">Center Left</option>
                  <option value="center">Center</option>
                  <option value="right">Center Right</option>
                  <option value="top-left">Top Left</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>
            </div>

            {/* Destination Link (Entire Banner Click Action) */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <label className="block text-xs font-bold text-gray-800">
                Optional Banner Destination Link (Makes entire banner clickable)
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="/shop, /shop?category=electronics, or https://..."
                  value={formData.destinationLink || ''}
                  onChange={(e) => setFormData({ ...formData, destinationLink: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={Boolean(formData.openInNewTab)}
                  onChange={(e) => setFormData({ ...formData, openInNewTab: e.target.checked })}
                  className="w-3.5 h-3.5 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs text-gray-700 font-semibold">
                  Open link in new browser tab (_blank)
                </span>
              </label>
            </div>
          </div>
        )}

        {/* TAB 6: PLACEMENT & RESPONSIVE */}
        {designerTab === 'settings' && (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Publication Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  <option value="published">Published (Live)</option>
                  <option value="draft">Draft (Unpublished)</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Display Order Sequence</label>
                <input
                  type="number"
                  min="1"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="bannerIsActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="bannerIsActive" className="text-xs font-bold text-gray-800 cursor-pointer">
                  Active Flag
                </label>
              </div>
            </div>

            {/* Responsive Heights */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-gray-800 block">Responsive Height Specifications</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Desktop Height (px)</label>
                  <input
                    type="number"
                    min="200"
                    max="800"
                    value={formData.responsive?.desktopHeight || 440}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        responsive: { ...(prev.responsive || {}), desktopHeight: parseInt(e.target.value, 10) || 440 },
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Tablet Height (px)</label>
                  <input
                    type="number"
                    min="180"
                    max="600"
                    value={formData.responsive?.tabletHeight || 360}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        responsive: { ...(prev.responsive || {}), tabletHeight: parseInt(e.target.value, 10) || 360 },
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Mobile Height (px)</label>
                  <input
                    type="number"
                    min="150"
                    max="500"
                    value={formData.responsive?.mobileHeight || 280}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        responsive: { ...(prev.responsive || {}), mobileHeight: parseInt(e.target.value, 10) || 280 },
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.responsive?.hideOnMobile)}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        responsive: { ...(prev.responsive || {}), hideOnMobile: e.target.checked },
                      }))
                    }
                    className="w-3.5 h-3.5 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs text-gray-700 font-semibold">
                    Hide banner entirely on mobile screens (&lt; 640px)
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 5. Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer self-start sm:self-auto"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('draft')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('published')}
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Publish Banner'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
