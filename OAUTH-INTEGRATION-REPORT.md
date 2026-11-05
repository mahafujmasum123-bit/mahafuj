# OAuth Integration Report — Google & Facebook Social Authentication

**Executive Summary**  
This document outlines the architecture, security compliance, popup orchestration, and backend token verification mechanisms implemented for Google and Facebook OAuth across Novara Commerce / ShopMax.

---

## 1. Architecture Overview & Iframe Constraints

In modern sandboxed and preview web environments (including Google Cloud Run and iframe embeds), full-page OAuth redirect loops cause loss of local state, session desynchronization, and broken user experience. Novara Commerce utilizes a hardened **Popup-Based OAuth Architecture** combined with secure cross-window messaging (`window.postMessage`).

```
+-------------------------------------------------------------+
|                       Customer Browser                      |
|                                                             |
|  [AuthModal]                                                |
|       |                                                     |
|       v                                                     |
|  Opens window.open('/api/auth/google/login' or facebook)    |
|       |                                                     |
|       +--------------------------------------------+        |
|                                                    |        |
|                                            [Popup Window]   |
|                                            User authenticates|
|                                            with Provider    |
|                                                    |        |
|                                            Redirects to:    |
|                                            /auth/callback   |
|                                                    |        |
|  Receives window.addEventListener('message') <-----+        |
|  Extracts { token, user } via postMessage(..., origin)      |
|  Closes popup window safely                                 |
|  Dispatches setCredentials & restores pending cart          |
+-------------------------------------------------------------+
```

---

## 2. Environment Variables & URL Resolution

All OAuth configurations leverage environment-aware dynamic resolution to ensure consistent behavior across development (`ais-dev-*.run.app`), pre-production (`ais-pre-*.run.app`), and custom production domains.

### 2.1 Configuration Keys in `.env.example`
- `GOOGLE_CLIENT_ID`: OAuth 2.0 Client ID generated in Google Cloud Console.
- `GOOGLE_CLIENT_SECRET`: Client Secret used server-side for code exchange.
- `GOOGLE_CALLBACK_URL`: Defaults dynamically to `${APP_URL}/api/auth/google/callback`.
- `FACEBOOK_APP_ID`: Meta App ID from Meta Developers Console.
- `FACEBOOK_APP_SECRET`: Meta App Secret for access token exchange.
- `FACEBOOK_CALLBACK_URL`: Defaults dynamically to `${APP_URL}/api/auth/facebook/callback`.
- `APP_URL`: Base URL of the deployment environment (e.g., `https://ais-dev-vqam6qfveiawni74do6k7q-824151983681.asia-southeast1.run.app`).

---

## 3. Server-Side Token Verification & Account Linking

### 3.1 Google Authentication (`POST /api/auth/google` & `/api/auth/google/callback`)
- **Direct Token Verification**: The backend validates Google Identity tokens (`id_token`) using Google API endpoints or verified OAuth tokeninfo verification.
- **Payload Extraction**:
  - `sub`: Unique immutable Google user identifier.
  - `email`: Normalized lowercase email address.
  - `name`: User display name.
  - `picture`: Profile avatar image URL.
- **Account Linking & Idempotency**:
  - If a user already exists with matching `email`, their account is automatically linked with `googleId`, preserving order history and saved addresses.
  - If no account exists, a new user document is created with `role: 'customer'`, and their verified Google identity details.

### 3.2 Facebook Authentication (`POST /api/auth/facebook` & `/api/auth/facebook/callback`)
- **Graph API Verification**: The backend queries `https://graph.facebook.com/me?fields=id,name,email,picture` with `appsecret_proof` to prevent spoofing.
- **Fallback Email Generation**: For Facebook accounts lacking public emails (e.g., phone-only registrations), the server derives an isolated pseudo-address `${facebookId}@facebook.user.novara.internal` with a randomly generated hash password.

---

## 4. Popup Blocker Handling & Fault Tolerance
1. **Window Opener Check**: If `window.open` returns `null` (due to aggressive browser popup blockers), the UI immediately prompts the user with an in-modal notification and fallback click-through button.
2. **Strict Origin Validation**: Messages received via `window.addEventListener('message')` explicitly verify `event.origin === window.location.origin` before processing any authorization payload, guarding against cross-site scripting (XSS) and message injection.
3. **Timer-Based Polling Fallback**: If `postMessage` fails due to browser cross-origin policy changes, an interval monitor watches `popup.closed` and safely queries `/api/auth/me` to detect completed authorization.

---

## 5. Seamless Pending Cart Fulfillment on Social Auth
Because social OAuth runs via popups, the customer's active window retains its Redux store and `localStorage` snapshot. As soon as the popup signals authorization success:
1. `AuthModal` detects the updated session.
2. The customer's uppercase initials avatar (`getUserInitials`) immediately renders in the header.
3. Any item held in `pendingCartAction` or `novara_pending_cart_v1` is automatically dispatched into the user's cart without requiring re-selection.
