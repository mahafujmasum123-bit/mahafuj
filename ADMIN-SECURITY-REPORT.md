# Administrative Security & Protection Report

**Executive Summary**  
This document outlines the security architecture, credential management standards, hidden administrative entry point, and role-based access control (RBAC) implemented for Novara Commerce / ShopMax.

---

## 1. Security Architecture & Threat Model

### 1.1 Remediation of Pre-Existing Vulnerabilities
During initial system audit, several critical administrative security flaws were identified and completely eradicated:
1. **Public Navigation Exposure**: The customer navigation header previously included a public "Staff & Admin Access →" link. This link has been permanently removed from customer menus.
2. **Hardcoded In-App Credentials**: The admin gate previously displayed plaintext credentials (`admin@novara.com` / `Admin@123`) with a 1-click bypass button that authenticated anyone without verification. All instances of hardcoded credentials and 1-click bypasses have been eradicated.
3. **Registration Privilege Escalation**: The registration endpoint previously accepted client-supplied role parameters. Public registration now forces `role: 'customer'` unconditionally.

---

## 2. Discreet Entry Point & Hidden Modal Architecture

### 2.1 Footer Placement & Design
To prevent unauthorized discovery, the administrative entry point is hidden as a discreet, unlabelled icon (`Shield`, 14x14px) embedded alongside the copyright statement in the storefront footer (`Footer.tsx`):
```tsx
<div className="flex items-center gap-2">
  <span>© {new Date().getFullYear()} Novara Commerce / ShopMax. All rights reserved.</span>
  <button
    type="button"
    onClick={() => dispatch(openAdminLoginModal())}
    className="text-white/20 hover:text-white/70 p-0.5 rounded transition cursor-pointer"
    aria-label="Staff Access Portal"
  >
    <Shield className="w-3.5 h-3.5" />
  </button>
</div>
```
- **Visual Footprint**: 20% opacity white icon on deep forest-green background (`#0a1e17`).
- **No Marketing Labels**: Contains zero text labels ("Admin", "Login", "Staff") in the rendered DOM text.
- **Dedicated Modal State**: Triggers `openAdminLoginModal()`, which displays `AdminLoginModal.tsx` directly over the storefront without page navigation.

### 2.2 Dedicated `AdminLoginModal` Features
- Clean slate/slate-900 security aesthetic.
- Password input with Eye/EyeOff toggle.
- Submits strictly to `/api/auth/admin-login`.
- Displays real-time server error alerts for invalid credentials or locked accounts.
- Closes cleanly via Escape key, close button, or backdrop click.

---

## 3. Server-Side Verification Route (`POST /api/auth/admin-login`)

The backend route `POST /api/auth/admin-login` provides isolated, hardened authentication for administrative staff.

### 3.1 Security Controls Enforced:
1. **Rate Limiting (`authLimiter`)**: Blocks brute-force attacks by restricting authentication attempts per IP address window.
2. **Environment Credential Matching**:
   - `process.env.ADMIN_EMAIL`: Verified against lowercase input email.
   - `process.env.ADMIN_PASSWORD_HASH`: Verified using `bcrypt.compare(password, hash)`.
   - Dynamic dev fallback with salt rounds of 10 if hash is not yet configured in `.env`.
3. **Database Staff Matching**:
   - Queries User model for matching email.
   - Verifies user role belongs to staff whitelist: `['super_admin', 'admin', 'order_manager', 'catalog_manager', 'inventory_manager', 'finance', 'customer_support']`.
4. **Audit Logging Without Data Leakage**:
   - Records client IP, user agent, timestamp, and success/failure outcome to security logs.
   - **Zero Password Logging**: Passwords and partial credentials are systematically redacted and never output to console or logs.
5. **Privilege Hardening**:
   - Issues high-entropy JWT with standard expiration.
   - Sets secure HTTP-only cookies where applicable.

---

## 4. Protected Route & API Enforcement
- **Client Route Guard (`AdminLayout.tsx`)**: Unauthenticated or non-admin users attempting to visit `/admin` directly are intercepted by a secure Administrative Control Gate requiring email and password authentication.
- **Server Middleware Guard (`requireAdmin`)**: Every `/api/admin/*` endpoint validates JWT signature, checks `req.user.role !== 'customer'`, and rejects unauthorized callers with `HTTP 403 Forbidden`.
