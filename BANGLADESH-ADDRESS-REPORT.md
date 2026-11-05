# Bangladesh 4-Tier Administrative Address Hierarchy Report
**Application:** NOVARA COMMERCE / ShopMax  
**Standard:** Bangladesh Bureau of Statistics (BBS) & Local Government Division (LGD)  
**Hierarchy Depth:** Division (8) ➔ District (64) ➔ Upazila / Thana ➔ Union / City Corporation Ward  
**Status:** Canonical & Dual-Layer Verified  
**Date:** November 2026  

---

## 1. Executive Summary

International country selectors, foreign state fields, and postal-code-only lookups have been replaced with the official **4-tier administrative hierarchy of Bangladesh**. Both the customer-facing storefront (Checkout, Customer Account Address Book) and administrative order management validate locations against canonical BBS geocodes.

---

## 2. Dataset Structure & Geographic Coverage

The dataset is shared between frontend (`src/data/bangladeshLocations.ts`) and backend (`server/data/bangladeshLocations.ts`):

```typescript
export interface BdLocationHierarchy {
  [division: string]: {
    [district: string]: {
      [upazila: string]: string[]; // list of unions or wards
    };
  };
}
```

### 2.1 The 8 Administrative Divisions Covered
1. **Dhaka Division:** Dhaka, Gazipur, Narayanganj, Tangail, Kishoreganj, Manikganj, Munshiganj, Narsingdi, Faridpur, Gopalganj, Madaripur, Rajbari, Shariatpur.
2. **Chattogram Division:** Chattogram, Cox's Bazar, Cumilla, Feni, Brahmanbaria, Noakhali, Chandpur, Lakshmipur, Rangamati, Bandarban, Khagrachhari.
3. **Rajshahi Division:** Rajshahi, Bogura, Pabna, Sirajganj, Naogaon, Natore, Chapainawabganj, Joypurhat.
4. **Khulna Division:** Khulna, Jashore, Kushtia, Satkhira, Bagerhat, Jhenaidah, Chuadanga, Magura, Meherpur, Narail.
5. **Barishal Division:** Barishal, Bhola, Patuakhali, Pirojpur, Barguna, Jhalokati.
6. **Sylhet Division:** Sylhet, Moulvibazar, Habiganj, Sunamganj.
7. **Rangpur Division:** Rangpur, Dinajpur, Gaibandha, Kurigram, Lalmonirhat, Nilphamari, Panchagarh, Thakurgaon.
8. **Mymensingh Division:** Mymensingh, Jamalpur, Netrokona, Sherpur.

---

## 3. Dynamic Cascading Selection Workflow

In `CheckoutPage.tsx` and `CustomerAccountPage.tsx`:
1. **Division Selection:** Populates available districts dynamically via `getDistricts(selectedDivision)`. Auto-selects the headquarters district.
2. **District Selection:** Populates upazilas and metropolitan thanas dynamically via `getUpazilas(division, district)`.
3. **Upazila / Thana Selection:** Populates unions or city corporation wards dynamically via `getUnionsOrWards(division, district, upazila)`.
4. **Union / Ward Selection:** Ensures granular routing for courier last-mile delivery riders.
5. **Street Address:** Freeform input for house, road, block, sector, or village landmarks.
6. **Postal Code:** Optional 4-digit post code input.

---

## 4. Backend Validation Authority (`validateBdLocation`)

Before any order is placed or saved to a user profile, `server/data/bangladeshLocations.ts` executes independent server-side validation:
- Verifies `division` exists in the 8 official divisions.
- Verifies `district` belongs strictly to the specified division.
- Verifies `upazila` belongs to the specified district (with case-insensitive matching for metropolitan thanas).
- Rejects missing or corrupted entries with clear error descriptions.

---

## 5. Address Management API Endpoints

- `POST /api/auth/address`: Adds a new 4-tier address to the authenticated user's profile.
- `PUT /api/auth/address/:id`: Edits an existing address with full re-validation against BBS data.
- `PUT /api/auth/address/:id/default`: Toggles the designated default shipping address for 1-click checkout.
- `DELETE /api/auth/address/:id`: Removes an address from the user's profile.
