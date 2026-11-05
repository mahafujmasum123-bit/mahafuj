/**
 * Canonical Currency & Monetary Formatting Utility for NOVARA COMMERCE / ShopMax
 * Currency: Bangladeshi Taka (BDT)
 * Symbol: ৳
 * Minor Unit: Poisha (1 BDT = 100 Poisha)
 */

export const CURRENCY_CODE = 'BDT';
export const CURRENCY_SYMBOL = '৳';
export const MIGRATION_EXCHANGE_RATE_USD_TO_BDT = 120; // 1 USD = 120 BDT

/**
 * Formats a monetary amount into Bangladeshi Taka string.
 * Example: formatBDT(1250) => "৳1,250.00"
 * Example: formatBDT(1250, false) => "৳1,250"
 */
export function formatBDT(amount: number | null | undefined, showDecimals: boolean = true): string {
  const numeric = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  
  // Format with Bengali/Bangladeshi number grouping or standard comma grouping
  const formattedNumber = numeric.toLocaleString('en-BD', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  return `${CURRENCY_SYMBOL}${formattedNumber}`;
}

/**
 * Shorthand alias for formatBDT
 */
export const formatPrice = formatBDT;

/**
 * Converts decimal Taka to integer minor units (Poisha) to prevent floating point inaccuracies.
 * Example: toPoisha(100.50) => 10050
 */
export function toPoisha(taka: number): number {
  return Math.round((Number(taka) || 0) * 100);
}

/**
 * Converts integer minor units (Poisha) back to decimal Taka.
 * Example: fromPoisha(10050) => 100.50
 */
export function fromPoisha(poisha: number): number {
  return Math.round(Number(poisha) || 0) / 100;
}

/**
 * Safe monetary addition avoiding IEEE 754 float drift (e.g., 0.1 + 0.2)
 */
export function safeMoneyAdd(...amounts: number[]): number {
  const sumPoisha = amounts.reduce((acc, amt) => acc + toPoisha(amt), 0);
  return fromPoisha(sumPoisha);
}

/**
 * Safe monetary multiplication
 */
export function safeMoneyMultiply(amount: number, multiplier: number): number {
  const poisha = toPoisha(amount);
  return fromPoisha(Math.round(poisha * multiplier));
}
