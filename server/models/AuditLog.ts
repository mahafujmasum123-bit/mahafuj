import mongoose, { Schema, Document } from 'mongoose';
import { isDbConnected } from '../db';

export interface IActivityLog extends Document {
  action: string;
  category: 'banner' | 'hero_slider' | 'settings' | 'catalog' | 'order' | 'general';
  actorName: string;
  actorEmail?: string;
  actorRole: string;
  resourceId?: string;
  resourceType?: string;
  details: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface IAdminLog extends Document {
  eventType: 'login_success' | 'login_failed' | 'logout' | 'unauthorized_attempt' | 'security_alert' | 'config_change';
  actorEmail?: string;
  actorName?: string;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
  outcome: 'success' | 'failure' | 'blocked';
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    action: { type: String, required: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ['banner', 'hero_slider', 'settings', 'catalog', 'order', 'general'],
      index: true,
    },
    actorName: { type: String, required: true },
    actorEmail: { type: String },
    actorRole: { type: String, required: true },
    resourceId: { type: String, index: true },
    resourceType: { type: String },
    details: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

const AdminLogSchema = new Schema<IAdminLog>(
  {
    eventType: {
      type: String,
      required: true,
      enum: ['login_success', 'login_failed', 'logout', 'unauthorized_attempt', 'security_alert', 'config_change'],
      index: true,
    },
    actorEmail: { type: String, index: true },
    actorName: { type: String },
    actorRole: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    outcome: { type: String, required: true, enum: ['success', 'failure', 'blocked'] },
    reason: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const ActivityLogModel =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

export const AdminLogModel =
  mongoose.models.AdminLog || mongoose.model<IAdminLog>('AdminLog', AdminLogSchema);

// In-Memory stores for resilient auditing
export const inMemoryActivityLogs: any[] = [
  {
    id: 'act-1',
    action: 'SYSTEM_BOOT',
    category: 'general',
    actorName: 'System',
    actorRole: 'system',
    details: 'Novara Commerce initialized content and commerce infrastructure',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'act-2',
    action: 'SETTINGS_INITIALIZE',
    category: 'settings',
    actorName: 'Novara Admin',
    actorEmail: 'admin@shopmax.com',
    actorRole: 'super_admin',
    details: 'Verified shipping, payment gateway, and email configurations',
    timestamp: new Date().toISOString(),
  },
];

export const inMemoryAdminSecurityLogs: any[] = [
  {
    id: 'sec-1',
    eventType: 'security_alert',
    actorEmail: 'system',
    outcome: 'success',
    reason: 'Security subsystem initialized with audit logging',
    ipAddress: '127.0.0.1',
    timestamp: new Date().toISOString(),
  },
];

/**
 * Append-only helper to record administrative activity
 */
export async function recordActivityLog(params: {
  action: string;
  category: 'banner' | 'hero_slider' | 'settings' | 'catalog' | 'order' | 'general';
  actorName: string;
  actorEmail?: string;
  actorRole: string;
  resourceId?: string;
  resourceType?: string;
  details: string;
  metadata?: Record<string, any>;
}) {
  const logItem = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...params,
    timestamp: new Date().toISOString(),
  };

  inMemoryActivityLogs.unshift(logItem);
  if (inMemoryActivityLogs.length > 500) {
    inMemoryActivityLogs.pop();
  }

  if (isDbConnected()) {
    try {
      await ActivityLogModel.create({
        ...params,
        timestamp: new Date(),
      });
    } catch (err: any) {
      console.warn('recordActivityLog DB write fallback:', err.message);
    }
  }
}

/**
 * Append-only helper to record administrative security events
 */
export async function recordAdminLog(params: {
  eventType: 'login_success' | 'login_failed' | 'logout' | 'unauthorized_attempt' | 'security_alert' | 'config_change';
  actorEmail?: string;
  actorName?: string;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
  outcome: 'success' | 'failure' | 'blocked';
  reason?: string;
  metadata?: Record<string, any>;
}) {
  // Redact any password or credential keys before logging
  const safeMeta = { ...(params.metadata || {}) };
  delete safeMeta.password;
  delete safeMeta.secret;
  delete safeMeta.token;
  delete safeMeta.appSecret;

  const logItem = {
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...params,
    metadata: safeMeta,
    timestamp: new Date().toISOString(),
  };

  inMemoryAdminSecurityLogs.unshift(logItem);
  if (inMemoryAdminSecurityLogs.length > 500) {
    inMemoryAdminSecurityLogs.pop();
  }

  if (isDbConnected()) {
    try {
      await AdminLogModel.create({
        ...params,
        metadata: safeMeta,
        timestamp: new Date(),
      });
    } catch (err: any) {
      console.warn('recordAdminLog DB write fallback:', err.message);
    }
  }
}
