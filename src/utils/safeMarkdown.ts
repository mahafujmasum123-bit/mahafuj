import React from 'react';

export interface BoldSegment {
  text: string;
  bold: boolean;
}

/**
 * Safely splits markdown-like **bold** markers into plain-text segments
 * without using dangerouslySetInnerHTML or allowing HTML injection.
 */
export function parseBoldSegments(input: string): BoldSegment[] {
  if (!input) return [];
  const parts = input.split(/(\*\*.*?\*\*)/g);
  const segments: BoldSegment[] = [];

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      segments.push({ text: part.slice(2, -2), bold: true });
    } else {
      segments.push({ text: part, bold: false });
    }
  }

  return segments;
}

export const FALLBACK_PRODUCT_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'%3E%3Crect width='600' height='600' fill='%23f3f4f6'/%3E%3Cg fill='none' stroke='%239ca3af' stroke-width='16' stroke-linecap='round' stroke-linejoin='round' transform='translate(220,210)'%3E%3Crect x='0' y='20' width='160' height='130' rx='16'/%3E%3Ccircle cx='52' cy='68' r='14'/%3E%3Cpath d='M160 116l-42-42L36 150'/%3E%3C/g%3E%3Ctext x='300' y='390' text-anchor='middle' font-family='Inter,system-ui,sans-serif' font-size='20' font-weight='600' fill='%236b7280'%3EShopMax Image%3C/text%3E%3C/svg%3E";

export function handleImageFallback(e: React.SyntheticEvent<HTMLImageElement>): void {
  const target = e.currentTarget;
  if (target.src !== FALLBACK_PRODUCT_IMAGE) {
    target.src = FALLBACK_PRODUCT_IMAGE;
  }
}
