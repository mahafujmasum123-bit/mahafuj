# Email Verification Removal & Secure Account Recovery Report
**Application:** NOVARA COMMERCE / ShopMax  
**Scope:** Customer Registration, Instant Login, and Cryptographic Password Reset  
**Status:** Implemented & Production Hardened  
**Date:** November 2026  

---

## 1. Executive Summary

Mandatory email verification links and registration OTP gates have been completely eliminated from the customer sign-up and login workflows. Customers register and authenticate immediately without delay or external link clicking. Secure account recovery is preserved through cryptographic single-use One-Time Passwords (OTPs) and password fingerprint hashing (`pwdFp`).

---

## 2. Customer Registration Workflow

### 2.1 Frictionless Onboarding
1. User provides `name`, `email`, `password`, and optional `phone`.
2. Server validates email format, trims whitespace, and hashes password using `bcryptjs` (salt factor 10).
3. The customer record is created with `isVerified: true` immediately.
4. Server generates an authenticated JSON Web Token (JWT) with standard expiration.
5. Client Redux state updates, stores the token, and transitions user to an authenticated session without showing pending verification dialogs.

### 2.2 Privilege Escalation Defense
Public registration endpoints (`/api/auth/register`) explicitly enforce `role: 'customer'`, discarding any `role`, `isAdmin`, or permission overrides provided in the client request body.

---

## 3. Cryptographic Password Reset Architecture

Account recovery utilizes a hardened 3-step OTP flow:

### 3.1 Step 1: Request OTP (`POST /api/auth/send-otp`)
- Generates a cryptographically strong 6-digit numeric code (`100000 - 999999`) using `crypto.randomInt()`.
- Calculates an HMAC-SHA256 signature binding the normalized email and OTP with an internal server secret.
- Enforces a 60-second cooldown per email to prevent spamming.
- In production, sends the reset code via configured transactional email service (or logs cleanly in development mode without leaking code to the API JSON response).

### 3.2 Step 2: Verify OTP (`POST /api/auth/verify-otp`)
- Validates OTP against HMAC signature using constant-time `crypto.timingSafeEqual()` to mitigate timing side-channel attacks.
- Enforces an expiration window of 10 minutes.
- Limits incorrect guesses to 5 attempts before invalidating the OTP session.
- Once verified, marks the record to prevent OTP replay attacks.
- Issues a scoped `resetToken` containing the user's current password hash fingerprint:
  ```typescript
  const pwdFp = crypto.createHash('sha256').update(user.password).digest('hex').slice(0, 16);
  ```

### 3.3 Step 3: Reset Password (`POST /api/auth/reset-password`)
- Validates the `resetToken` JWT.
- Computes the user's current password fingerprint and verifies it strictly matches the token's `pwdFp`.
- Updates the password hash using `bcryptjs`.
- **Single-Use Invalidation:** Because the password hash changes, the computed fingerprint changes immediately, rendering the `resetToken` permanently unusable for any subsequent requests.

---

## 4. Automated Security Verification

Automated tests in `src/utils/security.test.ts` verify:
1. 6-digit numeric OTP generation within bounds.
2. Timing-safe comparison defense.
3. 60-second cooldown enforcement.
4. 5-attempt brute-force threshold lockout.
5. Replay attack prevention.
6. Privilege escalation blocking during public registration.
7. Single-use token invalidation via `pwdFp` fingerprint mutation.
