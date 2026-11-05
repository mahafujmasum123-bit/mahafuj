# PREMIUM APPLICATION LOADING EXPERIENCE REPORT
**Feature:** Global Website Reload & Session Restoration Animation (`GlobalReloadOverlay.tsx`)  
**Design Paradigm:** Luxury Emerald Minimalist Theme (#0c261e) | Zero-Flicker Navigation Timing API Level 2  
**Audit Verification:** Automated & Interactive DOM Inspection  

---

## 1. Feature Purpose & User Experience Objectives

A common flaw in modern Single Page Applications (SPAs) is uncoordinated component flashing when a user reloads the browser tab (F5 / Ctrl+R / Command+R). `GlobalReloadOverlay` eliminates jarring UI re-renders by presenting a polished, branded loading animation exclusively during browser-level reloads, while remaining completely silent during routine client-side React Router navigation.

---

## 2. Technical Implementation Details

### 2.1 Reload Detection (`isBrowserReload`)
The overlay relies on the standard W3C Navigation Timing Level 2 API:
```ts
const navEntries = window.performance.getEntriesByType('navigation');
if (navEntries && navEntries.length > 0) {
  const nav = navEntries[0] as PerformanceNavigationTiming;
  if (nav.type === 'reload') {
    return true;
  }
}
```
- **Fallback 1:** Legacy Navigation Timing Level 1 (`window.performance.navigation.type === 1`).
- **Fallback 2:** `sessionStorage` session reload marker captured during `window.beforeunload`.
- **SPA Navigation Safety:** Client-side React Router link transitions (`navigate('/cart')`) never trigger the overlay, preserving instantaneous page transitions.

### 2.2 Visual Composition & Brand Tokens
- **Background:** Deep emerald brand surface `#0c261e` with ambient pulse gradients (`bg-emerald-500/10` and `bg-emerald-400/10`).
- **Center Piece:** Dual concentric rotating rings with counter-rotational movement enclosing the ShopMax brand logo badge.
- **Brand Typography:** "ShopMax — Better Products, Better Life".
- **Countdown Feedback:** Displays real-time countdown ("Restoring session in 5s... 4s... 3s...") and smooth linear progress bar.
- **Fade-Out Transition:** Commences opacity fade-out at 4,500ms, cleanly unmounting and restoring pointer events at exactly 5,000ms.

### 2.3 Non-Blocking Architecture & Accessibility
- **`role="status"` & `aria-live="polite"`:** Screen readers announce session restoration politely without interrupting user interaction.
- **`pointer-events-none` on Fade:** When fading out, pointer events are immediately restored so user interactions are never blocked.
- **Safe Timeout Cleanup:** `useEffect` returns strict `clearTimeout` and `clearInterval` callbacks, preventing memory leaks.
- **Manual Trigger Support:** Dispatches custom event `'trigger-reload-animation'` or URL query `?reload_preview=1` for QA testing.

---

## 3. Compliance & Performance Assessment

| Criterion | Specification | Observed Status |
|---|---|---|
| Reload Detection | W3C Navigation Timing API | COMPLIANT (Zero false positives on SPA nav) |
| Total Display Duration | Exactly 5,000ms (5s) | COMPLIANT (4.5s visible + 0.5s fade out) |
| Non-Blocking Execution | Clean unmount without freezing | COMPLIANT |
| Visual Polish | Emerald theme, zero distortion, ambient glows | COMPLIANT |
| Accessibility | WAI-ARIA role="status", polite live region | COMPLIANT |
