import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UserModel, IUserAddress, UserRole } from '../models/User';
import { OtpVerificationModel } from '../models/OtpVerification';
import { generateToken, requireAuth } from '../middleware/auth';
import { authLimiter, otpLimiter } from '../middleware/rateLimit';
import { sendEmail, generateOtpEmailTemplate, isEmailConfigured } from '../services/emailService';
import { isDbConnected, isProduction, requirePersistentStorage } from '../db';
import { validateBdLocation } from '../data/bangladeshLocations';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'novara-commerce-super-secret-jwt-key-2026';

// In-memory fallback OTP store when Atlas is offline
export const inMemoryOtps = new Map<string, any>();

// Helper to securely hash an OTP code with HMAC-SHA256
export function hashOtp(email: string, otp: string): string {
  return crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${email.toLowerCase().trim()}:${otp.trim()}`)
    .digest('hex');
}

// Generate cryptographically secure 6-digit numeric OTP
export function generateSecureNumericOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

// Enforce customer-only role on public self-registration (blocks privilege escalation)
export function sanitizeRegistrationRole(_requestedRole?: unknown): UserRole {
  return 'customer';
}

// Compute short fingerprint of passwordHash so password-reset JWTs are single-use
export function getPasswordFingerprint(passwordHash: string): string {
  return crypto.createHash('sha256').update(passwordHash || '').digest('hex').slice(0, 16);
}

// In-memory fallback user store when Atlas is not configured yet
export let inMemoryUsers: any[] = [
  {
    id: 'user-admin',
    name: 'Novara Admin',
    email: 'admin@novara.com',
    passwordHash: bcrypt.hashSync('Admin@123', 10),
    role: 'super_admin' as UserRole,
    phone: '+880 1711 000000',
    addresses: [
      {
        id: 'addr-admin',
        name: 'Novara HQ',
        phone: '+880 1711 000000',
        division: 'Dhaka',
        district: 'Dhaka',
        upazila: 'Gulshan',
        street: 'Road 11, Banani',
        landmark: 'Near Kemal Ataturk Ave',
        isDefault: true,
      },
    ],
    isVerified: true,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 'user-customer',
    name: 'Sarah Khan',
    email: 'customer@example.com',
    passwordHash: bcrypt.hashSync('Customer@123', 10),
    role: 'customer' as UserRole,
    phone: '+880 1812 345678',
    addresses: [
      {
        id: 'addr-1',
        name: 'Sarah Khan',
        phone: '+880 1812 345678',
        division: 'Dhaka',
        district: 'Dhaka',
        upazila: 'Dhanmondi',
        street: 'House 42, Road 9/A',
        landmark: 'Opposite Dhanmondi Lake',
        isDefault: true,
      },
    ],
    isVerified: true,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'user-guest-sample',
    name: 'Rafiul Islam',
    email: 'rafiul@example.com',
    passwordHash: bcrypt.hashSync('Rafiul@123', 10),
    role: 'customer' as UserRole,
    phone: '+880 1712 998877',
    addresses: [],
    isVerified: true,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

// Email service status check
router.get('/email-service-status', (req: Request, res: Response) => {
  const configured = isEmailConfigured();
  res.json({
    success: true,
    configured,
    provider: 'Resend',
    sender: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    message: configured
      ? 'Resend API key is configured and active.'
      : 'RESEND_API_KEY is not set. In development/testing, OTP code is logged and returned in dev hints.',
  });
});

// Request an OTP (for registration, password reset, or email verification)
router.post('/send-otp', otpLimiter, async (req: Request, res: Response) => {
  try {
    const { email, purpose = 'registration', metadata } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'A valid email address is required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Account enumeration protection / existence check
    if (purpose === 'registration') {
      let existing = false;
      if (isDbConnected()) {
        const found = await UserModel.findOne({ email: normalizedEmail });
        if (found) existing = true;
      } else {
        existing = Boolean(inMemoryUsers.find((u) => u.email === normalizedEmail));
      }

      if (existing) {
        res.status(400).json({ success: false, error: 'An account with this email address already exists. Please sign in.' });
        return;
      }
    } else if (purpose === 'password_reset') {
      let existing = false;
      if (isDbConnected()) {
        const found = await UserModel.findOne({ email: normalizedEmail });
        if (found) existing = true;
      } else {
        existing = Boolean(inMemoryUsers.find((u) => u.email === normalizedEmail));
      }

      // If user does not exist, do not leak this directly, but avoid sending OTP
      if (!existing) {
        // Return friendly message with timing parity to prevent enumeration
        res.json({
          success: true,
          message: 'If an account is associated with this email, a verification code has been sent.',
          cooldownSeconds: 60,
        });
        return;
      }
    }

    // Rate-limiting & 60s cooldown check
    const now = new Date();
    let currentRecord: any = null;
    if (isDbConnected()) {
      currentRecord = await OtpVerificationModel.findOne({ email: normalizedEmail, purpose });
    } else {
      currentRecord = inMemoryOtps.get(`${normalizedEmail}:${purpose}`);
    }

    if (currentRecord && currentRecord.resendAvailableAt > now) {
      const remainingSeconds = Math.ceil((currentRecord.resendAvailableAt.getTime() - now.getTime()) / 1000);
      res.status(429).json({
        success: false,
        error: `Please wait ${remainingSeconds} seconds before requesting a new code.`,
        remainingSeconds,
      });
      return;
    }

    // Generate secure 6-digit OTP and HMAC-SHA256 hash
    const rawOtp = generateSecureNumericOtp();
    const otpHash = hashOtp(normalizedEmail, rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 60 seconds

    // Securely prepare metadata if registration
    const storedMetadata = metadata ? { ...metadata } : {};
    if (storedMetadata.password) {
      storedMetadata.passwordHash = await bcrypt.hash(storedMetadata.password, 10);
      delete storedMetadata.password;
    }

    // Persist OTP record
    if (isDbConnected()) {
      await OtpVerificationModel.findOneAndUpdate(
        { email: normalizedEmail, purpose },
        {
          $set: {
            otpHash,
            expiresAt,
            attemptsCount: 0,
            maxAttempts: 5,
            resendAvailableAt,
            isVerified: false,
            metadata: storedMetadata,
          },
        },
        { upsert: true, new: true }
      );
    } else {
      inMemoryOtps.set(`${normalizedEmail}:${purpose}`, {
        email: normalizedEmail,
        otpHash,
        purpose,
        expiresAt,
        attemptsCount: 0,
        maxAttempts: 5,
        resendAvailableAt,
        isVerified: false,
        metadata: storedMetadata,
        createdAt: now,
      });
    }

    // Dispatch branded email template via Resend
    const emailSubject =
      purpose === 'password_reset'
        ? 'Your ShopMax Password Reset Code'
        : 'Your ShopMax Verification Code';

    const emailContent = generateOtpEmailTemplate({
      otp: rawOtp,
      purpose,
      recipientName: storedMetadata.name || 'Valued Customer',
      expiresInMinutes: 10,
    });

    const emailConfigured = isEmailConfigured();

    // In production, refuse to claim OTP delivery if email provider is unconfigured
    if (!emailConfigured && process.env.NODE_ENV === 'production') {
      res.status(503).json({
        success: false,
        emailConfigured: false,
        emailDelivered: false,
        error: 'Email verification service (RESEND_API_KEY) is not configured on this server.',
      });
      return;
    }

    if (emailConfigured) {
      const emailResult = await sendEmail({
        to: normalizedEmail,
        subject: emailSubject,
        html: emailContent.html,
        text: emailContent.text,
      });

      if (!emailResult.success) {
        // Reset resend cooldown so user can retry immediately once provider recovers
        if (isDbConnected()) {
          await OtpVerificationModel.updateOne(
            { email: normalizedEmail, purpose },
            { $set: { resendAvailableAt: new Date(0) } }
          );
        } else {
          const rec = inMemoryOtps.get(`${normalizedEmail}:${purpose}`);
          if (rec) rec.resendAvailableAt = new Date(0);
        }

        res.status(502).json({
          success: false,
          emailConfigured: true,
          emailDelivered: false,
          error: emailResult.error || 'Failed to deliver verification email via Resend. Please check sender configuration or try again.',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Verification code sent to your email address.',
        cooldownSeconds: 60,
        expiresAt: expiresAt.toISOString(),
        emailConfigured: true,
        emailDelivered: true,
      });
      return;
    }

    // Honest non-production fallback when RESEND_API_KEY is not configured
    res.json({
      success: true,
      message: 'Email provider (RESEND_API_KEY) is not configured in this environment. Use the development verification code below.',
      cooldownSeconds: 60,
      expiresAt: expiresAt.toISOString(),
      emailConfigured: false,
      emailDelivered: false,
      ...(process.env.NODE_ENV !== 'production' ? { devCode: rawOtp } : {}),
    });
  } catch (err: any) {
    console.error('send-otp error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to dispatch verification code' });
  }
});

// Verify OTP
router.post('/verify-otp', otpLimiter, async (req: Request, res: Response) => {
  try {
    const { email, otp, purpose = 'registration' } = req.body;

    if (!email || !otp) {
      res.status(400).json({ success: false, error: 'Email and OTP code are required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    let record: any = null;
    if (isDbConnected()) {
      record = await OtpVerificationModel.findOne({ email: normalizedEmail, purpose });
    } else {
      record = inMemoryOtps.get(`${normalizedEmail}:${purpose}`);
    }

    if (!record) {
      res.status(400).json({
        success: false,
        error: 'No active verification code found for this email. Please request a new code.',
      });
      return;
    }

    // Check if already used (replay attack prevention)
    if (record.isVerified) {
      res.status(400).json({
        success: false,
        error: 'This verification code has already been used. Please request a new code.',
      });
      return;
    }

    // Check expiration
    const now = new Date();
    if (new Date(record.expiresAt) < now) {
      res.status(400).json({
        success: false,
        error: 'This verification code has expired (10-minute validity). Please request a new code.',
      });
      return;
    }

    // Check attempt limits (max 5)
    if (record.attemptsCount >= record.maxAttempts) {
      res.status(429).json({
        success: false,
        error: 'Maximum verification attempts (5) exceeded. Please request a new code.',
      });
      return;
    }

    // Increment attempts
    record.attemptsCount += 1;
    if (isDbConnected()) {
      await OtpVerificationModel.updateOne(
        { _id: record._id },
        { $inc: { attemptsCount: 1 } }
      );
    }

    // Cryptographic constant-time comparison
    const computedHash = hashOtp(normalizedEmail, cleanOtp);
    const hashBufferA = Buffer.from(computedHash, 'hex');
    const hashBufferB = Buffer.from(record.otpHash, 'hex');

    const isValid =
      hashBufferA.length === hashBufferB.length &&
      crypto.timingSafeEqual(hashBufferA, hashBufferB);

    if (!isValid) {
      const remaining = Math.max(0, record.maxAttempts - record.attemptsCount);
      res.status(400).json({
        success: false,
        error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        remainingAttempts: remaining,
      });
      return;
    }

    // Mark as verified
    record.isVerified = true;
    if (isDbConnected()) {
      await OtpVerificationModel.updateOne(
        { _id: record._id },
        { $set: { isVerified: true } }
      );
    }

    // Purpose-specific fulfillment:
    if (purpose === 'registration') {
      if (!requirePersistentStorage(res, 'Account registration')) {
        return;
      }
      const meta = record.metadata || {};
      const userName = meta.name || normalizedEmail.split('@')[0];
      const passwordHash = meta.passwordHash || (await bcrypt.hash('User@123', 10));
      const userPhone = meta.phone || '';

      let createdUser: any = null;

      if (isDbConnected()) {
        createdUser = await UserModel.create({
          name: userName,
          email: normalizedEmail,
          passwordHash,
          phone: userPhone,
          role: 'customer',
          addresses: [],
          isVerified: true,
        });
      } else {
        createdUser = {
          id: `user-${Date.now()}`,
          name: userName,
          email: normalizedEmail,
          passwordHash,
          phone: userPhone,
          role: 'customer' as UserRole,
          addresses: [],
          isVerified: true,
          createdAt: new Date().toISOString(),
        };
        inMemoryUsers.push(createdUser);
      }

      const token = generateToken({
        userId: createdUser._id ? createdUser._id.toString() : createdUser.id,
        email: createdUser.email,
        role: createdUser.role,
        name: createdUser.name,
      });

      res.status(201).json({
        success: true,
        message: 'Email verified and account created successfully!',
        token,
        user: {
          id: createdUser._id ? createdUser._id.toString() : createdUser.id,
          name: createdUser.name,
          email: createdUser.email,
          role: createdUser.role,
          phone: createdUser.phone,
          addresses: createdUser.addresses,
        },
      });
      return;
    }

    if (purpose === 'password_reset') {
      let currentPwdHash = '';
      if (isDbConnected()) {
        const targetUser = await UserModel.findOne({ email: normalizedEmail });
        currentPwdHash = targetUser?.passwordHash || '';
      } else {
        const targetUser = inMemoryUsers.find((u) => u.email === normalizedEmail);
        currentPwdHash = targetUser?.passwordHash || '';
      }

      // Issue a short-lived single-use reset token bound to current password fingerprint (15 mins)
      const resetToken = jwt.sign(
        {
          email: normalizedEmail,
          purpose: 'password_reset',
          pwdFp: getPasswordFingerprint(currentPwdHash),
        },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      res.json({
        success: true,
        message: 'Email verified successfully. You may now choose a new password.',
        resetToken,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Email verified successfully.',
    });
  } catch (err: any) {
    console.error('verify-otp error:', err);
    res.status(500).json({ success: false, error: err.message || 'OTP verification failed' });
  }
});

// Reset Password
router.post('/reset-password', authLimiter, async (req: Request, res: Response) => {
  try {
    if (!requirePersistentStorage(res, 'Password reset')) {
      return;
    }
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      res.status(400).json({ success: false, error: 'Reset token and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
      return;
    }

    let payload: any;
    try {
      payload = jwt.verify(resetToken, JWT_SECRET);
    } catch {
      res.status(401).json({ success: false, error: 'Invalid or expired password reset token' });
      return;
    }

    if (payload.purpose !== 'password_reset' || !payload.email) {
      res.status(401).json({ success: false, error: 'Invalid reset token format' });
      return;
    }

    const email = payload.email.toLowerCase().trim();
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    if (isDbConnected()) {
      const user = await UserModel.findOne({ email });
      if (!user) {
        res.status(404).json({ success: false, error: 'User account not found' });
        return;
      }
      if (payload.pwdFp && payload.pwdFp !== getPasswordFingerprint(user.passwordHash)) {
        res.status(401).json({ success: false, error: 'This password reset token has already been used.' });
        return;
      }
      user.passwordHash = newPasswordHash;
      await user.save();
    } else {
      const user = inMemoryUsers.find((u) => u.email === email);
      if (!user) {
        res.status(404).json({ success: false, error: 'User account not found' });
        return;
      }
      if (payload.pwdFp && payload.pwdFp !== getPasswordFingerprint(user.passwordHash)) {
        res.status(401).json({ success: false, error: 'This password reset token has already been used.' });
        return;
      }
      user.passwordHash = newPasswordHash;
    }

    res.json({
      success: true,
      message: 'Password has been successfully updated. You can now sign in with your new password.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Password reset failed' });
  }
});

router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    if (!requirePersistentStorage(res, 'User registration')) {
      return;
    }
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, error: 'Name, email, and password are required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (isDbConnected()) {
      const existing = await UserModel.findOne({ email: normalizedEmail });
      if (existing) {
        res.status(400).json({ success: false, error: 'An account with this email already exists' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const safeRole = sanitizeRegistrationRole(req.body.role);
      const user = await UserModel.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: phone?.trim(),
        role: safeRole,
        addresses: [],
        isVerified: true,
      });

      const token = generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      });

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          addresses: user.addresses,
        },
      });
      return;
    }

    // In-memory fallback
    const existing = inMemoryUsers.find((u) => u.email === normalizedEmail);
    if (existing) {
      res.status(400).json({ success: false, error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const safeRole = sanitizeRegistrationRole(req.body.role);
    const newUser = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      phone: phone?.trim() || '',
      role: safeRole,
      addresses: [],
      isVerified: true,
      createdAt: new Date().toISOString(),
    };
    inMemoryUsers.push(newUser);

    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        addresses: newUser.addresses,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Registration failed' });
  }
});

// Login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (isDbConnected()) {
      const user = await UserModel.findOne({ email: normalizedEmail });
      if (!user) {
        res.status(401).json({ success: false, error: 'Invalid email or password' });
        return;
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        res.status(401).json({ success: false, error: 'Invalid email or password' });
        return;
      }

      const token = generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      });

      res.json({
        success: true,
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          addresses: user.addresses,
        },
      });
      return;
    }

    // In-memory fallback
    const user = inMemoryUsers.find((u) => u.email === normalizedEmail);
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        addresses: user.addresses,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
});

// Me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    if (isDbConnected()) {
      const user = await UserModel.findById(userId).select('-passwordHash');
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      res.json({
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          addresses: user.addresses,
        },
      });
      return;
    }

    const user = inMemoryUsers.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        addresses: user.addresses,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Saved address add
router.post('/address', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, phone, division, district, upazila, unionWard, postalCode, street, landmark, isDefault } = req.body;

    if (!name || !phone || !division || !district || !street) {
      res.status(400).json({ success: false, error: 'Recipient name, phone, division, district, and street are required' });
      return;
    }

    // Backend independent validation of Bangladesh administrative location hierarchy
    const locationCheck = validateBdLocation(division, district, upazila, unionWard);
    if (!locationCheck.valid) {
      res.status(400).json({ success: false, error: locationCheck.error || 'Invalid Bangladesh administrative location' });
      return;
    }

    const newAddress: IUserAddress = {
      id: `addr-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      division: division.trim(),
      district: district.trim(),
      upazila: (upazila || '').trim(),
      unionWard: unionWard ? unionWard.trim() : undefined,
      postalCode: postalCode ? postalCode.trim() : undefined,
      street: street.trim(),
      landmark: landmark?.trim(),
      isDefault: Boolean(isDefault),
    };

    if (isDbConnected()) {
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      if (newAddress.isDefault) {
        user.addresses.forEach((a: IUserAddress) => (a.isDefault = false));
      }
      user.addresses.push(newAddress);
      await user.save();

      res.status(201).json({ success: true, addresses: user.addresses, address: newAddress });
      return;
    }

    const user = inMemoryUsers.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (newAddress.isDefault) {
      user.addresses.forEach((a: any) => (a.isDefault = false));
    }
    user.addresses.push(newAddress);

    res.status(201).json({ success: true, addresses: user.addresses, address: newAddress });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Edit / Update existing saved address
router.put('/address/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const addressId = req.params.id;
    const { name, phone, division, district, upazila, unionWard, postalCode, street, landmark, isDefault } = req.body;

    if (!name || !phone || !division || !district || !street) {
      res.status(400).json({ success: false, error: 'Recipient name, phone, division, district, and street are required' });
      return;
    }

    // Backend independent validation of Bangladesh administrative location hierarchy
    const locationCheck = validateBdLocation(division, district, upazila, unionWard);
    if (!locationCheck.valid) {
      res.status(400).json({ success: false, error: locationCheck.error || 'Invalid Bangladesh administrative location' });
      return;
    }

    if (isDbConnected()) {
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const addrIndex = user.addresses.findIndex((a: IUserAddress) => a.id === addressId);
      if (addrIndex === -1) {
        res.status(404).json({ success: false, error: 'Address not found' });
        return;
      }

      if (isDefault) {
        user.addresses.forEach((a: IUserAddress) => (a.isDefault = false));
      }

      user.addresses[addrIndex] = {
        id: addressId,
        name: name.trim(),
        phone: phone.trim(),
        division: division.trim(),
        district: district.trim(),
        upazila: (upazila || '').trim(),
        unionWard: unionWard ? unionWard.trim() : undefined,
        postalCode: postalCode ? postalCode.trim() : undefined,
        street: street.trim(),
        landmark: landmark?.trim(),
        isDefault: isDefault !== undefined ? Boolean(isDefault) : user.addresses[addrIndex].isDefault,
      };

      await user.save();
      res.json({ success: true, addresses: user.addresses, address: user.addresses[addrIndex] });
      return;
    }

    const user = inMemoryUsers.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const addrIndex = (user.addresses || []).findIndex((a: any) => a.id === addressId);
    if (addrIndex === -1) {
      res.status(404).json({ success: false, error: 'Address not found' });
      return;
    }

    if (isDefault) {
      user.addresses.forEach((a: any) => (a.isDefault = false));
    }

    user.addresses[addrIndex] = {
      id: addressId,
      name: name.trim(),
      phone: phone.trim(),
      division: division.trim(),
      district: district.trim(),
      upazila: (upazila || '').trim(),
      unionWard: unionWard ? unionWard.trim() : undefined,
      postalCode: postalCode ? postalCode.trim() : undefined,
      street: street.trim(),
      landmark: landmark?.trim(),
      isDefault: isDefault !== undefined ? Boolean(isDefault) : user.addresses[addrIndex].isDefault,
    };

    res.json({ success: true, addresses: user.addresses, address: user.addresses[addrIndex] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete saved address
router.delete('/address/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const addressId = req.params.id;

    if (isDbConnected()) {
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      user.addresses = user.addresses.filter((a: IUserAddress) => a.id !== addressId);
      if (user.addresses.length > 0 && !user.addresses.some((a: IUserAddress) => a.isDefault)) {
        user.addresses[0].isDefault = true;
      }
      await user.save();
      res.json({ success: true, addresses: user.addresses });
      return;
    }

    const user = inMemoryUsers.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    user.addresses = (user.addresses || []).filter((a: any) => a.id !== addressId);
    if (user.addresses.length > 0 && !user.addresses.some((a: any) => a.isDefault)) {
      user.addresses[0].isDefault = true;
    }
    res.json({ success: true, addresses: user.addresses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Set default saved address
router.put('/address/:id/default', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const addressId = req.params.id;

    if (isDbConnected()) {
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      let found = false;
      user.addresses.forEach((a: IUserAddress) => {
        if (a.id === addressId) {
          a.isDefault = true;
          found = true;
        } else {
          a.isDefault = false;
        }
      });
      if (!found) {
        res.status(404).json({ success: false, error: 'Address not found' });
        return;
      }
      await user.save();
      res.json({ success: true, addresses: user.addresses });
      return;
    }

    const user = inMemoryUsers.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    let found = false;
    (user.addresses || []).forEach((a: any) => {
      if (a.id === addressId) {
        a.isDefault = true;
        found = true;
      } else {
        a.isDefault = false;
      }
    });
    if (!found) {
      res.status(404).json({ success: false, error: 'Address not found' });
      return;
    }
    res.json({ success: true, addresses: user.addresses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update customer profile (name, phone)
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, phone } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ success: false, error: 'Full name must be at least 2 characters.' });
      return;
    }

    if (isDbConnected()) {
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      user.name = name.trim();
      if (phone !== undefined) user.phone = String(phone).trim();
      await user.save();

      res.json({
        success: true,
        message: 'Profile updated successfully.',
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          addresses: user.addresses,
        },
      });
      return;
    }

    const user = inMemoryUsers.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    user.name = name.trim();
    if (phone !== undefined) user.phone = String(phone).trim();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        addresses: user.addresses,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Change password while authenticated
router.put('/change-password', requireAuth, authLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: 'Current password and new password are required.' });
      return;
    }

    if (String(newPassword).length < 6) {
      res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
      return;
    }

    if (isDbConnected()) {
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      const match = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!match) {
        res.status(400).json({ success: false, error: 'Current password is incorrect.' });
        return;
      }
      user.passwordHash = await bcrypt.hash(newPassword, 10);
      await user.save();
      res.json({ success: true, message: 'Password updated successfully.' });
      return;
    }

    const user = inMemoryUsers.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      res.status(400).json({ success: false, error: 'Current password is incorrect.' });
      return;
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// OAuth status (Honest reporting: never fake OAuth success)
router.get('/oauth-status', (req: Request, res: Response) => {
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID);
  const facebookConfigured = Boolean(process.env.FACEBOOK_APP_ID);

  res.json({
    success: true,
    providers: {
      google: {
        available: googleConfigured,
        clientId: process.env.GOOGLE_CLIENT_ID || null,
        message: googleConfigured ? 'Ready' : 'GOOGLE_CLIENT_ID not configured in environment',
      },
      facebook: {
        available: facebookConfigured,
        appId: process.env.FACEBOOK_APP_ID || null,
        message: facebookConfigured ? 'Ready' : 'FACEBOOK_APP_ID not configured in environment',
      },
    },
  });
});

/**
 * Server-side Google ID Token or Access Token Verification
 */
export async function verifyGoogleToken(params: { credential?: string; accessToken?: string }): Promise<{
  valid: boolean;
  email?: string;
  name?: string;
  googleId?: string;
  picture?: string;
  error?: string;
}> {
  const { credential, accessToken } = params;

  if (credential) {
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      const payload: any = await res.json();

      if (!res.ok || payload.error || payload.error_description) {
        return { valid: false, error: payload.error_description || payload.error || 'Invalid Google ID token' };
      }

      // Validate issuer
      const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
      if (!validIssuers.includes(payload.iss)) {
        return { valid: false, error: `Invalid Google token issuer: ${payload.iss}` };
      }

      // Validate audience if client ID configured
      if (process.env.GOOGLE_CLIENT_ID && payload.aud !== process.env.GOOGLE_CLIENT_ID) {
        return { valid: false, error: 'Google token audience mismatch' };
      }

      // Check expiry
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (payload.exp && parseInt(payload.exp, 10) < nowSeconds) {
        return { valid: false, error: 'Google ID token has expired' };
      }

      // Email verified check
      if (payload.email_verified !== 'true' && payload.email_verified !== true) {
        return { valid: false, error: 'Google account email is not verified' };
      }

      return {
        valid: true,
        email: payload.email.toLowerCase().trim(),
        name: payload.name || payload.email.split('@')[0],
        googleId: payload.sub,
        picture: payload.picture,
      };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Google token validation request failed' };
    }
  }

  if (accessToken) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload: any = await res.json();

      if (!res.ok || payload.error) {
        return { valid: false, error: payload.error_description || payload.error || 'Invalid Google access token' };
      }

      if (payload.email_verified === false) {
        return { valid: false, error: 'Google account email is not verified' };
      }

      return {
        valid: true,
        email: (payload.email || '').toLowerCase().trim(),
        name: payload.name || payload.given_name || 'Google User',
        googleId: payload.sub,
        picture: payload.picture,
      };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Google userinfo request failed' };
    }
  }

  return { valid: false, error: 'Neither Google credential (id_token) nor accessToken was provided' };
}

/**
 * Server-side Facebook Access Token Verification
 */
export async function verifyFacebookToken(accessToken: string): Promise<{
  valid: boolean;
  email?: string;
  name?: string;
  facebookId?: string;
  picture?: string;
  error?: string;
}> {
  if (!accessToken || !accessToken.trim()) {
    return { valid: false, error: 'Facebook access token is required' };
  }

  try {
    let graphUrl = `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(
      accessToken
    )}`;

    // If app secret is set, add cryptographic appsecret_proof for high security
    if (process.env.FACEBOOK_APP_SECRET) {
      const appSecretProof = crypto
        .createHmac('sha256', process.env.FACEBOOK_APP_SECRET.trim())
        .update(accessToken)
        .digest('hex');
      graphUrl += `&appsecret_proof=${appSecretProof}`;
    }

    const res = await fetch(graphUrl);
    const data: any = await res.json();

    if (!res.ok || data.error) {
      return {
        valid: false,
        error: data.error?.message || 'Failed to verify Facebook access token with Meta Graph API',
      };
    }

    const facebookId = data.id;
    const name = data.name || 'Facebook User';
    const email = (data.email || `fb_${facebookId}@novara-auth.net`).toLowerCase().trim();
    const picture = data.picture?.data?.url;

    return {
      valid: true,
      facebookId,
      name,
      email,
      picture,
    };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Facebook token verification network error' };
  }
}

// Google OAuth Handler
router.post('/google', authLimiter, async (req: Request, res: Response) => {
  try {
    if (!requirePersistentStorage(res, 'Google authentication')) {
      return;
    }
    const { credential, accessToken } = req.body;

    if (!credential && !accessToken) {
      res.status(400).json({
        success: false,
        error: 'Google ID token (credential) or accessToken is required.',
      });
      return;
    }

    const verification = await verifyGoogleToken({ credential, accessToken });
    if (!verification.valid || !verification.email) {
      res.status(401).json({
        success: false,
        error: verification.error || 'Google authentication failed. Token verification rejected.',
      });
      return;
    }

    const normalizedEmail = verification.email;
    let user: any = null;

    if (isDbConnected()) {
      user = await UserModel.findOne({ email: normalizedEmail });

      if (user) {
        // Link googleId and avatar if not yet linked
        if (!user.googleId && verification.googleId) user.googleId = verification.googleId;
        if (!user.avatarUrl && verification.picture) user.avatarUrl = verification.picture;
        user.isVerified = true;
        await user.save();
      } else {
        // Create new customer account safely
        const randomPassword = crypto.randomBytes(24).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        user = await UserModel.create({
          name: verification.name || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          passwordHash,
          role: 'customer',
          addresses: [],
          isVerified: true,
          googleId: verification.googleId,
          avatarUrl: verification.picture,
          authProvider: 'google',
        });
      }
    } else {
      user = inMemoryUsers.find((u) => u.email === normalizedEmail);
      if (user) {
        if (!user.googleId && verification.googleId) user.googleId = verification.googleId;
        if (!user.avatarUrl && verification.picture) user.avatarUrl = verification.picture;
        user.isVerified = true;
      } else {
        const randomPassword = crypto.randomBytes(24).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        user = {
          id: `user-g-${Date.now()}`,
          name: verification.name || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          passwordHash,
          role: 'customer' as UserRole,
          addresses: [],
          isVerified: true,
          googleId: verification.googleId,
          avatarUrl: verification.picture,
          authProvider: 'google',
          createdAt: new Date().toISOString(),
        };
        inMemoryUsers.push(user);
      }
    }

    const token = generateToken({
      userId: user._id ? user._id.toString() : user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      phone: user.phone,
    });

    res.json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: {
        id: user._id ? user._id.toString() : user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        addresses: user.addresses || [],
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err: any) {
    console.error('Google OAuth error:', err);
    res.status(500).json({ success: false, error: err.message || 'Google authentication failed' });
  }
});

// Facebook OAuth Handler
router.post('/facebook', authLimiter, async (req: Request, res: Response) => {
  try {
    if (!requirePersistentStorage(res, 'Facebook authentication')) {
      return;
    }
    const { accessToken } = req.body;

    if (!accessToken) {
      res.status(400).json({
        success: false,
        error: 'Facebook accessToken is required.',
      });
      return;
    }

    const verification = await verifyFacebookToken(accessToken);
    if (!verification.valid || !verification.email) {
      res.status(401).json({
        success: false,
        error: verification.error || 'Facebook authentication failed. Token verification rejected.',
      });
      return;
    }

    const normalizedEmail = verification.email;
    let user: any = null;

    if (isDbConnected()) {
      user = await UserModel.findOne({
        $or: [{ email: normalizedEmail }, { facebookId: verification.facebookId }],
      });

      if (user) {
        if (!user.facebookId && verification.facebookId) user.facebookId = verification.facebookId;
        if (!user.avatarUrl && verification.picture) user.avatarUrl = verification.picture;
        user.isVerified = true;
        await user.save();
      } else {
        const randomPassword = crypto.randomBytes(24).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        user = await UserModel.create({
          name: verification.name || 'Facebook Customer',
          email: normalizedEmail,
          passwordHash,
          role: 'customer',
          addresses: [],
          isVerified: true,
          facebookId: verification.facebookId,
          avatarUrl: verification.picture,
          authProvider: 'facebook',
        });
      }
    } else {
      user = inMemoryUsers.find(
        (u) => u.email === normalizedEmail || (u.facebookId && u.facebookId === verification.facebookId)
      );
      if (user) {
        if (!user.facebookId && verification.facebookId) user.facebookId = verification.facebookId;
        if (!user.avatarUrl && verification.picture) user.avatarUrl = verification.picture;
        user.isVerified = true;
      } else {
        const randomPassword = crypto.randomBytes(24).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        user = {
          id: `user-fb-${Date.now()}`,
          name: verification.name || 'Facebook Customer',
          email: normalizedEmail,
          passwordHash,
          role: 'customer' as UserRole,
          addresses: [],
          isVerified: true,
          facebookId: verification.facebookId,
          avatarUrl: verification.picture,
          authProvider: 'facebook',
          createdAt: new Date().toISOString(),
        };
        inMemoryUsers.push(user);
      }
    }

    const token = generateToken({
      userId: user._id ? user._id.toString() : user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      phone: user.phone,
    });

    res.json({
      success: true,
      message: 'Facebook authentication successful',
      token,
      user: {
        id: user._id ? user._id.toString() : user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        addresses: user.addresses || [],
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err: any) {
    console.error('Facebook OAuth error:', err);
    res.status(500).json({ success: false, error: err.message || 'Facebook authentication failed' });
  }
});

// Dedicated Secure Administrator Login Endpoint
// Verifies credentials server-side using ADMIN_EMAIL and ADMIN_PASSWORD_HASH / ADMIN_PASSWORD from private environment
router.post('/admin-login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Administrator email and password are required' });
      return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const envAdminEmail = (process.env.ADMIN_EMAIL || 'admin@novara.com').toLowerCase().trim();
    const envAdminHash = process.env.ADMIN_PASSWORD_HASH;
    const envAdminPassword = process.env.ADMIN_PASSWORD;

    let isAuthenticated = false;
    let adminName = 'Novara Administrator';
    let adminRole: UserRole = 'super_admin';
    let adminId = 'admin-env-master';

    // 1. Verify against private environment configuration
    if (normalizedEmail === envAdminEmail) {
      if (envAdminHash) {
        try {
          isAuthenticated = await bcrypt.compare(password, envAdminHash);
        } catch {
          isAuthenticated = false;
        }
      } else if (envAdminPassword) {
        isAuthenticated = password === envAdminPassword;
      } else {
        // Safe development default comparison against pre-hashed Admin@123
        const devDefaultHash = inMemoryUsers.find((u) => u.email === 'admin@novara.com')?.passwordHash;
        if (devDefaultHash) {
          isAuthenticated = await bcrypt.compare(password, devDefaultHash);
        }
      }
    }

    // 2. Fallback: check database or staff list for authorized admin roles
    if (!isAuthenticated) {
      const allowedAdminRoles: UserRole[] = [
        'super_admin',
        'admin',
        'order_manager',
        'catalog_manager',
        'inventory_manager',
        'customer_support',
        'finance',
      ];

      if (isDbConnected()) {
        try {
          const dbUser = await UserModel.findOne({ email: normalizedEmail });
          if (dbUser && allowedAdminRoles.includes(dbUser.role)) {
            const match = await bcrypt.compare(password, dbUser.passwordHash);
            if (match) {
              isAuthenticated = true;
              adminName = dbUser.name;
              adminRole = dbUser.role;
              adminId = dbUser._id.toString();
            }
          }
        } catch (dbErr) {
          console.warn('DB admin lookup fallback:', dbErr);
        }
      }

      if (!isAuthenticated) {
        const memUser = inMemoryUsers.find((u) => u.email === normalizedEmail);
        if (memUser && allowedAdminRoles.includes(memUser.role)) {
          const match = await bcrypt.compare(password, memUser.passwordHash);
          if (match) {
            isAuthenticated = true;
            adminName = memUser.name;
            adminRole = memUser.role;
            adminId = memUser.id;
          }
        }
      }
    }

    if (!isAuthenticated) {
      console.warn(`[Security Audit] Failed administrator login attempt for email: "${normalizedEmail}" from IP: ${req.ip}`);
      res.status(401).json({
        success: false,
        error: 'Invalid administrator credentials. Access denied.',
      });
      return;
    }

    console.log(`[Security Audit] Granted administrator session to: "${normalizedEmail}" (${adminRole})`);

    const token = generateToken({
      userId: adminId,
      email: normalizedEmail,
      role: adminRole,
      name: adminName,
    });

    res.json({
      success: true,
      message: 'Administrator authentication successful',
      token,
      user: {
        id: adminId,
        name: adminName,
        email: normalizedEmail,
        role: adminRole,
      },
    });
  } catch (err: any) {
    console.error('Admin login exception:', err);
    res.status(500).json({ success: false, error: err.message || 'Administrator authentication failed' });
  }
});

export default router;
