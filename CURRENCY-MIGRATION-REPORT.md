# Bangladeshi Taka (BDT) Currency Migration Report
**Application:** NOVARA COMMERCE / ShopMax  
**Target Currency:** Bangladeshi Taka (ISO: BDT, Symbol: ৳, Minor Unit: Poisha)  
**Status:** Canonical & Fully Standardized  
**Date:** November 2026  

---

## 1. Executive Summary

All monetary units across the entire stack—database schemas, product catalogs, customer carts, discount engines, shipping tiers, payment verification routines, and admin analytics—have been migrated to **Bangladeshi Taka (BDT, ৳)**. Dual-currency display, currency switchers, and legacy dollar formatting (`$`) have been completely decommissioned.

---

## 2. Mathematical Precision & Integer/Poisha Arithmetic

To eliminate IEEE 754 floating-point rounding errors in discount computations and ledger reconciliations:
1. **Canonical Formatting (`formatBDT`):**
   - Implemented in `src/utils/currency.ts` and `server/utils/currency.ts`.
   - Utilizes `en-BD` locale formatting with Bengali comma grouping (lakh / crore grouping).
   - Prefix: `৳` (Unicode U+09F3).
   - Trailing decimals are omitted for whole numbers or preserved up to 2 decimal places for poisha fractional amounts.
2. **Minor Unit Serialization (`toPoisha`):**
   - 1 Taka = 100 Poisha (`toPoisha(taka) = Math.round(taka * 100)`).
   - MFS and card gateway payloads use exact minor integer values or 2-decimal fixed string representations as mandated by gateway specifications.

---

## 3. Product Catalog Migration Audit

Historical prices were audited and converted at the fixed baseline rate of 1 USD = 120 BDT, aligned with prevailing retail price points in the Bangladeshi market:

| Product Name | Category | Historical Price (USD) | Migrated Price (BDT, ৳) | Migrated Sale Price (BDT, ৳) |
|---|---|---|---|---|
| Ergonomic Wireless Headphones | Electronics | $99.99 | ৳11,999 | ৳8,999 |
| AMOLED Smart Fitness Watch | Electronics | $89.99 | ৳10,799 | ৳8,279 |
| Urban Everyday Laptop Backpack | Accessories | $69.99 | ৳8,399 | ৳5,999 |
| Breathable Lightweight Running Shoes | Footwear | $89.99 | ৳10,799 | ৳8,399 |
| Polarized Classic Sunglasses | Accessories | $29.99 | ৳3,599 | ৳2,299 |
| Stainless Steel Thermal Bottle | Home & Living | $24.99 | ৳2,999 | ৳1,899 |
| Mechanical Gaming Keyboard | Electronics | $129.99 | ৳15,599 | ৳11,999 |
| Ergonomic Wireless Optical Mouse | Electronics | $39.99 | ৳4,799 | ৳3,499 |
| USB-C Fast Charging Hub | Electronics | $49.99 | ৳5,999 | ৳4,299 |
| Ultra-Slim Laptop Stand | Office | $34.99 | ৳4,199 | ৳2,899 |
| High-Performance Laptop Pro 15" | Electronics | $1,299.99 | ৳155,999 | ৳125,000 |

---

## 4. Shipping & Delivery Fees Migration

- **Inside Dhaka Division Standard Courier:** ৳60
- **Outside Dhaka (Inter-District Express):** ৳120
- **Free Delivery Basket Threshold:** ৳2,500 (standardized across announcement banners, checkout logic, and settings)

---

## 5. Administrative Dashboard & Analytics

All admin screens have been updated to report financial metrics exclusively in BDT:
- `AnalyticsAdminPage.tsx`: Gross sales, paid revenue, unpaid orders value, average order value, daily trend visualizer, and CSV export.
- `DashboardOverviewPage.tsx`: Top selling products revenue, recent orders final totals.
- `OrderDetailsModal.tsx`: Subtotal, shipping fee, voucher discounts, and final total.
- `SystemSettingsPage.tsx`: Delivery fees and free shipping threshold configuration fields.

---

## 6. Verification Test Results

Automated tests in `src/utils/bangladeshMigration.test.ts` verify:
- Whole number BDT formatting with official ৳ prefix.
- Poisha decimal precision retention.
- Zero and negative balance formatting.
- Rejection of non-BDT currencies in payment gateway verification.
