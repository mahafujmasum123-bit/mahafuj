import mongoose, { Schema, Document } from 'mongoose';
import { isDbConnected } from '../db';

export interface ISettings extends Document {
  key: string;
  general: {
    storeName: string;
    tagline: string;
    supportEmail: string;
    supportPhone: string;
    currency: string;
    currencySymbol: string;
    taxRatePercent: number;
  };
  shipping: {
    freeShippingThreshold: number;
    insideDhakaFee: number;
    outsideDhakaFee: number;
    estimatedDaysInside: string;
    estimatedDaysOutside: string;
    expressDeliveryAvailable: boolean;
    expressFee: number;
  };
  payment: {
    cod: {
      enabled: boolean;
      title: string;
      description: string;
      maxOrderLimit: number;
    };
    bkash: {
      enabled: boolean;
      isSandbox: boolean;
      merchantNumber: string;
      appKey: string;
      appSecret: string;
    };
    nagad: {
      enabled: boolean;
      isSandbox: boolean;
      merchantId: string;
    };
    card: {
      enabled: boolean;
      isSandbox: boolean;
      storeId: string;
      storePassword: string;
      provider: string;
    };
  };
  email: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      username: string;
      password?: string;
      senderName: string;
      senderEmail: string;
      enabled: boolean;
    };
  };
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true, default: 'global_settings' },
    general: {
      storeName: { type: String, default: 'NOVARA COMMERCE' },
      tagline: { type: String, default: 'Premium Lifestyle & Tech Electronics' },
      supportEmail: { type: String, default: 'support@novara.com' },
      supportPhone: { type: String, default: '+880 1711 000000' },
      currency: { type: String, default: 'BDT' },
      currencySymbol: { type: String, default: '৳' },
      taxRatePercent: { type: Number, default: 0 },
    },
    shipping: {
      freeShippingThreshold: { type: Number, default: 2500 },
      insideDhakaFee: { type: Number, default: 60 },
      outsideDhakaFee: { type: Number, default: 120 },
      estimatedDaysInside: { type: String, default: '1-2 Days' },
      estimatedDaysOutside: { type: String, default: '3-5 Days' },
      expressDeliveryAvailable: { type: Boolean, default: true },
      expressFee: { type: Number, default: 150 },
    },
    payment: {
      cod: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: 'Cash on Delivery (COD)' },
        description: { type: String, default: 'Pay with cash upon courier delivery across Bangladesh.' },
        maxOrderLimit: { type: Number, default: 50000 },
      },
      bkash: {
        enabled: { type: Boolean, default: true },
        isSandbox: { type: Boolean, default: true },
        merchantNumber: { type: String, default: '01700000000' },
        appKey: { type: String, default: '' },
        appSecret: { type: String, default: '' },
      },
      nagad: {
        enabled: { type: Boolean, default: true },
        isSandbox: { type: Boolean, default: true },
        merchantId: { type: String, default: 'NAGAD_NOVARA_01' },
      },
      card: {
        enabled: { type: Boolean, default: true },
        isSandbox: { type: Boolean, default: true },
        storeId: { type: String, default: '' },
        storePassword: { type: String, default: '' },
        provider: { type: String, default: 'sslcommerz' },
      },
    },
    email: {
      smtp: {
        host: { type: String, default: 'smtp.resend.com' },
        port: { type: Number, default: 587 },
        secure: { type: Boolean, default: false },
        username: { type: String, default: 'resend' },
        password: { type: String, default: '' },
        senderName: { type: String, default: 'ShopMax by Novara' },
        senderEmail: { type: String, default: 'orders@shopmax.com' },
        enabled: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true }
);

export const SettingsModel =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

// In-Memory Master Fallback Cache
export let cachedSettings = {
  general: {
    storeName: 'NOVARA COMMERCE',
    tagline: 'Premium Lifestyle & Tech Electronics',
    supportEmail: 'support@novara.com',
    supportPhone: '+880 1711 000000',
    currency: 'BDT',
    currencySymbol: '৳',
    taxRatePercent: 0,
  },
  shipping: {
    freeShippingThreshold: 2500,
    insideDhakaFee: 60,
    outsideDhakaFee: 120,
    estimatedDaysInside: '1-2 Days',
    estimatedDaysOutside: '3-5 Days',
    expressDeliveryAvailable: true,
    expressFee: 150,
  },
  payment: {
    cod: {
      enabled: true,
      title: 'Cash on Delivery (COD)',
      description: 'Pay with cash upon courier delivery across Bangladesh.',
      maxOrderLimit: 50000,
    },
    bkash: {
      enabled: true,
      isSandbox: true,
      merchantNumber: '01700000000',
      appKey: process.env.BKASH_APP_KEY || '',
      appSecret: process.env.BKASH_APP_SECRET || '',
    },
    nagad: {
      enabled: true,
      isSandbox: true,
      merchantId: process.env.NAGAD_MERCHANT_ID || 'NAGAD_NOVARA_01',
    },
    card: {
      enabled: true,
      isSandbox: true,
      storeId: process.env.SSLCOMMERZ_STORE_ID || '',
      storePassword: process.env.SSLCOMMERZ_STORE_PASSWD || '',
      provider: 'sslcommerz',
    },
  },
  email: {
    smtp: {
      host: 'smtp.resend.com',
      port: 587,
      secure: false,
      username: 'resend',
      password: process.env.RESEND_API_KEY || '',
      senderName: 'ShopMax by Novara',
      senderEmail: 'orders@shopmax.com',
      enabled: true,
    },
  },
};

/**
 * Retrieve active settings from MongoDB Atlas with memory cache fallback
 */
export async function getActiveSettings() {
  if (isDbConnected()) {
    try {
      const doc = await SettingsModel.findOne({ key: 'global_settings' }).lean();
      if (doc) {
        return doc as unknown as typeof cachedSettings;
      }
      // Seed initial document if none exists
      await SettingsModel.create({ key: 'global_settings', ...cachedSettings });
    } catch (err: any) {
      console.warn('getActiveSettings DB query fallback:', err.message);
    }
  }
  return cachedSettings;
}

/**
 * Mask sensitive secrets for safe transmission to client/admin UI
 */
export function getMaskedSettings(settings: typeof cachedSettings) {
  return {
    general: settings.general,
    shipping: settings.shipping,
    payment: {
      cod: settings.payment.cod,
      bkash: {
        enabled: settings.payment.bkash.enabled,
        isSandbox: settings.payment.bkash.isSandbox,
        merchantNumber: settings.payment.bkash.merchantNumber,
        hasAppKey: Boolean(settings.payment.bkash.appKey),
        appKeyMasked: settings.payment.bkash.appKey ? `${settings.payment.bkash.appKey.slice(0, 3)}••••` : '',
        hasAppSecret: Boolean(settings.payment.bkash.appSecret),
        appSecretMasked: settings.payment.bkash.appSecret ? '••••••••••••' : '',
      },
      nagad: {
        enabled: settings.payment.nagad.enabled,
        isSandbox: settings.payment.nagad.isSandbox,
        merchantId: settings.payment.nagad.merchantId,
      },
      card: {
        enabled: settings.payment.card.enabled,
        isSandbox: settings.payment.card.isSandbox,
        storeIdMasked: settings.payment.card.storeId ? `${settings.payment.card.storeId.slice(0, 4)}••••` : '',
        hasStorePassword: Boolean(settings.payment.card.storePassword),
        provider: settings.payment.card.provider,
      },
    },
    email: {
      smtp: {
        host: settings.email.smtp.host,
        port: settings.email.smtp.port,
        secure: settings.email.smtp.secure,
        username: settings.email.smtp.username,
        senderName: settings.email.smtp.senderName,
        senderEmail: settings.email.smtp.senderEmail,
        enabled: settings.email.smtp.enabled,
        hasPassword: Boolean(settings.email.smtp.password),
        passwordMasked: settings.email.smtp.password ? '••••••••••••' : '',
      },
    },
  };
}

/**
 * Update a specific section of settings with automatic DB sync & in-memory cache update
 */
export async function updateSettingsSection<T extends keyof typeof cachedSettings>(
  section: T,
  values: Partial<typeof cachedSettings[T]>
) {
  // Preserve existing secrets if empty string or masked placeholder sent
  if (section === 'payment') {
    const p = values as any;
    if (p.bkash) {
      if (!p.bkash.appKey || p.bkash.appKey.includes('••••')) delete p.bkash.appKey;
      if (!p.bkash.appSecret || p.bkash.appSecret.includes('••••')) delete p.bkash.appSecret;
    }
    if (p.card) {
      if (!p.card.storeId || p.card.storeId.includes('••••')) delete p.card.storeId;
      if (!p.card.storePassword || p.card.storePassword.includes('••••')) delete p.card.storePassword;
    }
  }
  if (section === 'email') {
    const e = values as any;
    if (e.smtp && (!e.smtp.password || e.smtp.password.includes('••••'))) {
      delete e.smtp.password;
    }
  }

  // Deep merge into cachedSettings
  cachedSettings[section] = {
    ...cachedSettings[section],
    ...values,
  };

  if (isDbConnected()) {
    try {
      await SettingsModel.findOneAndUpdate(
        { key: 'global_settings' },
        { [section]: cachedSettings[section] },
        { upsert: true, new: true }
      );
    } catch (err: any) {
      console.warn(`updateSettingsSection DB update fallback for ${section}:`, err.message);
    }
  }

  return cachedSettings[section];
}

