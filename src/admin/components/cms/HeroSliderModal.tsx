import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/modal/Modal';
import { Upload, Image as ImageIcon, Link as LinkIcon, CheckCircle2, XCircle, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { handleImageFallback } from '../../../utils/safeMarkdown';

export interface HeroSliderFormData {
  id?: string;
  imageUrl: string;
  destinationLink?: string;
  openInNewTab?: boolean;
  altText?: string;
  displayOrder: number;
  isActive: boolean;
}

interface HeroSliderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: HeroSliderFormData) => Promise<void>;
  initialData?: HeroSliderFormData | null;
  token?: string | null;
}

export const HeroSliderModal: React.FC<HeroSliderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  token,
}) => {
  const [formData, setFormData] = useState<HeroSliderFormData>({
    imageUrl: '',
    destinationLink: '',
    openInNewTab: false,
    altText: 'Novara Hero Slide',
    displayOrder: 1,
    isActive: true,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        imageUrl: initialData.imageUrl || '',
        destinationLink: initialData.destinationLink || '',
        openInNewTab: Boolean(initialData.openInNewTab),
        altText: initialData.altText || 'Novara Hero Slide',
        displayOrder: initialData.displayOrder || 1,
        isActive: initialData.isActive !== false,
      });
    } else {
      setFormData({
        imageUrl: '',
        destinationLink: '',
        openInNewTab: false,
        altText: 'Novara Hero Slide',
        displayOrder: 1,
        isActive: true,
      });
    }
    setUploadError(null);
  }, [initialData, isOpen]);

  // Handle local device image upload via /api/upload/file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size exceeds 10MB maximum limit.');
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
              folder: 'sliders',
            }),
          });

          const data = await res.json();
          if (data.success && data.url) {
            setFormData((prev) => ({ ...prev, imageUrl: data.url }));
          } else {
            setUploadError(data.error || 'Failed to upload image to server.');
          }
        } catch {
          setUploadError('Network exception occurred during upload.');
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setUploadError('Failed to read image file from disk.');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadError('Unexpected error uploading image.');
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl.trim()) {
      setUploadError('Hero slide image is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to save hero slide.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData?.id ? 'Edit Image-Only Hero Slide' : 'Add New Hero Slide'}
      description="Upload a high-resolution hero lifestyle image and configure an optional destination link."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {uploadError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* 1. Hero Image Upload & Preview Area */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-800">
            Hero Slide Image <span className="text-red-500">*</span>
          </label>

          {formData.imageUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 aspect-[16/8] group">
              <img
                src={formData.imageUrl}
                alt={formData.altText || 'Hero Slide Preview'}
                onError={handleImageFallback}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <label className="px-3 py-1.5 bg-white text-gray-900 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-100 transition shadow-sm">
                  <span>Replace Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, imageUrl: '' })}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition shadow-sm cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 hover:border-emerald-600 rounded-2xl p-6 text-center transition bg-gray-50/50">
              <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-xs font-bold text-gray-800 mb-1">
                Upload Hero Banner Photography
              </div>
              <p className="text-[11px] text-gray-500 max-w-xs mx-auto mb-3">
                Recommended aspect ratio: 16:7 or 21:9 (e.g. 1920x840px or 1600x700px). Supports JPEG, PNG, WebP up to 10MB.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <label className="flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Uploading...' : 'Choose from Device'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploading}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Direct URL Alternative Input */}
              <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center gap-2">
                <span className="text-[11px] text-gray-400 font-semibold shrink-0">Or Image URL:</span>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono text-gray-900 focus:outline-emerald-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Optional Destination Link */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-800">
            Optional Destination Link
          </label>
          <div className="relative">
            <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="/shop, /shop?category=electronics, or https://..."
              value={formData.destinationLink}
              onChange={(e) => setFormData({ ...formData, destinationLink: e.target.value })}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-emerald-600 font-mono"
            />
          </div>
          <p className="text-[11px] text-gray-500">
            Leave blank if this slide is purely display imagery without a clickable action. Internal routes (/shop) and external URLs (Facebook, Instagram, custom URLs) are fully supported.
          </p>

          {Boolean(formData.destinationLink?.trim()) && (
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.openInNewTab}
                  onChange={(e) => setFormData({ ...formData, openInNewTab: e.target.checked })}
                  className="w-3.5 h-3.5 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs text-gray-700 font-semibold">
                  Open link in new browser tab (_blank)
                </span>
              </label>
            </div>
          )}
        </div>

        {/* 3. Accessibility Alt Text */}
        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1">
            Accessibility Alt Text
          </label>
          <input
            type="text"
            value={formData.altText}
            onChange={(e) => setFormData({ ...formData, altText: e.target.value })}
            placeholder="e.g. Novara Studio Wireless Headphones Summer Collection"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-emerald-600"
          />
        </div>

        {/* 4. Display Order & Active Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Display Sequence Order
            </label>
            <input
              type="number"
              min="1"
              value={formData.displayOrder}
              onChange={(e) =>
                setFormData({ ...formData, displayOrder: parseInt(e.target.value, 10) || 1 })
              }
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="heroSlideActiveCheckbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
            />
            <label
              htmlFor="heroSlideActiveCheckbox"
              className="text-xs font-bold text-gray-800 cursor-pointer"
            >
              Publish Live on Storefront
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploading || !formData.imageUrl}
            className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Hero Slide' : 'Publish Hero Slide'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
