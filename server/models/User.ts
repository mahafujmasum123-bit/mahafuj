import mongoose, { Schema, Document } from 'mongoose';

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'order_manager'
  | 'inventory_manager'
  | 'catalog_manager'
  | 'customer_support'
  | 'finance'
  | 'customer';

export interface IUserAddress {
  id: string;
  name: string;
  phone: string;
  division: string;
  district: string;
  upazila: string;
  unionWard?: string;
  postalCode?: string;
  street: string;
  landmark?: string;
  isDefault: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone?: string;
  addresses: IUserAddress[];
  isVerified: boolean;
  avatarUrl?: string;
  googleId?: string;
  facebookId?: string;
  authProvider?: 'local' | 'google' | 'facebook';
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IUserAddress>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    division: { type: String, required: true },
    district: { type: String, required: true },
    upazila: { type: String, required: true },
    unionWard: { type: String },
    postalCode: { type: String },
    street: { type: String, required: true },
    landmark: { type: String },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: [
        'super_admin',
        'admin',
        'order_manager',
        'inventory_manager',
        'catalog_manager',
        'customer_support',
        'finance',
        'customer',
      ],
      default: 'customer',
      index: true,
    },
    phone: { type: String, trim: true },
    addresses: [AddressSchema],
    isVerified: { type: Boolean, default: true },
    avatarUrl: { type: String },
    googleId: { type: String, index: true },
    facebookId: { type: String, index: true },
    authProvider: { type: String, enum: ['local', 'google', 'facebook'], default: 'local' },
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
