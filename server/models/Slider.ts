import mongoose, { Schema, Document } from 'mongoose';

/**
 * Image-Only Hero Slider Model (Phase 10)
 * The Hero Slider is an image-only slider management system.
 * Content consists strictly of the hero image upload and optional destination link.
 */
export interface ISlider extends Document {
  imageUrl: string;
  destinationLink?: string;
  openInNewTab?: boolean;
  altText?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SliderSchema = new Schema<ISlider>(
  {
    imageUrl: { type: String, required: true },
    destinationLink: { type: String, default: '' },
    openInNewTab: { type: Boolean, default: false },
    altText: { type: String, default: 'Hero Slide' },
    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const SliderModel =
  mongoose.models.Slider || mongoose.model<ISlider>('Slider', SliderSchema);
