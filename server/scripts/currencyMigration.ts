/**
 * Automated, Idempotent Database Currency Migration Script
 * Migrates USD monetary records to BDT using an approved exchange rate (1 USD = 120 BDT)
 * 
 * Supports:
 * --dry-run (preview mode, no database writes)
 * --execute (commits migration safely to MongoDB)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ProductModel } from '../models/Product';
import { OrderModel } from '../models/Order';
import { CouponModel } from '../models/Coupon';

dotenv.config();

export const MIGRATION_CONFIG = {
  version: '2026.11.BDT_STANDARDIZATION_V1',
  approvedExchangeRate: 120, // 1 USD = 120 BDT
  sourceCurrency: 'USD',
  targetCurrency: 'BDT',
  timestamp: new Date().toISOString(),
};

export interface MigrationSummary {
  version: string;
  exchangeRate: number;
  mode: 'dry-run' | 'execute';
  productsExamined: number;
  productsMigrated: number;
  productsAlreadyBdt: number;
  ordersExamined: number;
  historicalOrdersPreserved: number;
  couponsExamined: number;
  couponsMigrated: number;
  errors: string[];
}

export async function runCurrencyMigration(isDryRun: boolean = true): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    version: MIGRATION_CONFIG.version,
    exchangeRate: MIGRATION_CONFIG.approvedExchangeRate,
    mode: isDryRun ? 'dry-run' : 'execute',
    productsExamined: 0,
    productsMigrated: 0,
    productsAlreadyBdt: 0,
    ordersExamined: 0,
    historicalOrdersPreserved: 0,
    couponsExamined: 0,
    couponsMigrated: 0,
    errors: [],
  };

  const rate = MIGRATION_CONFIG.approvedExchangeRate;
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri || mongoUri.trim() === '') {
    summary.errors.push('MONGODB_URI not configured. Skipping persistent database writes.');
    return summary;
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    }

    // 1. PRODUCTS MIGRATION
    const products = await ProductModel.find({});
    summary.productsExamined = products.length;

    for (const prod of products) {
      // Check idempotency: if already migrated or price indicates BDT (> 1500)
      const doc = prod.toObject();
      if ((doc as any).migratedToBdt || (doc as any).currency === 'BDT' || prod.price > 1500) {
        summary.productsAlreadyBdt++;
        continue;
      }

      const originalPrice = prod.price;
      const originalSalePrice = prod.salePrice;

      const newPrice = Math.round(originalPrice * rate);
      const newSalePrice = originalSalePrice ? Math.round(originalSalePrice * rate) : undefined;

      const convertedVariants = (prod.variants || []).map((v: any) => ({
        ...v,
        price: Math.round(v.price * rate),
        salePrice: v.salePrice ? Math.round(v.salePrice * rate) : undefined,
      }));

      if (!isDryRun) {
        await ProductModel.updateOne(
          { _id: prod._id },
          {
            $set: {
              price: newPrice,
              salePrice: newSalePrice,
              variants: convertedVariants,
              currency: 'BDT',
              migratedToBdt: true,
              originalUsdPrice: originalPrice,
              originalUsdSalePrice: originalSalePrice,
              migrationVersion: MIGRATION_CONFIG.version,
              migrationTimestamp: new Date(),
            },
          }
        );
      }

      summary.productsMigrated++;
    }

    // 2. HISTORICAL ORDERS AUDIT
    const orders = await OrderModel.find({});
    summary.ordersExamined = orders.length;

    for (const order of orders) {
      // Strict Rule: Historical orders must preserve original audit records
      summary.historicalOrdersPreserved++;
      if (!isDryRun && !(order as any).currency) {
        // Tag with currency indicator without mutating finalTotal
        await OrderModel.updateOne(
          { _id: order._id },
          {
            $set: {
              currency: (order as any).currency || 'BDT',
              historicalAuditVerified: true,
            },
          }
        );
      }
    }

    // 3. COUPONS MIGRATION
    const coupons = await CouponModel.find({});
    summary.couponsExamined = coupons.length;

    for (const coupon of coupons) {
      if ((coupon as any).migratedToBdt) {
        continue;
      }

      if (coupon.discountType === 'fixed' && coupon.discountValue < 100) {
        const newDiscount = Math.round(coupon.discountValue * rate);
        const newMinOrder = coupon.minOrderAmount ? Math.round(coupon.minOrderAmount * rate) : 0;

        if (!isDryRun) {
          await CouponModel.updateOne(
            { _id: coupon._id },
            {
              $set: {
                discountValue: newDiscount,
                minOrderAmount: newMinOrder,
                migratedToBdt: true,
                migrationVersion: MIGRATION_CONFIG.version,
              },
            }
          );
        }
        summary.couponsMigrated++;
      }
    }
  } catch (err: any) {
    summary.errors.push(err.message || 'Database migration exception');
  }

  return summary;
}

// Direct execution from CLI
if (process.argv[1] && process.argv[1].includes('currencyMigration')) {
  const isExecute = process.argv.includes('--execute');
  runCurrencyMigration(!isExecute).then((report) => {
    console.log('\n======================================================');
    console.log(`NOVARA COMMERCE CURRENCY MIGRATION REPORT (${report.mode.toUpperCase()})`);
    console.log('======================================================');
    console.log(`Version:           ${report.version}`);
    console.log(`Exchange Rate:     1 USD = ${report.exchangeRate} BDT`);
    console.log(`Products Examined: ${report.productsExamined}`);
    console.log(`Products Migrated: ${report.productsMigrated}`);
    console.log(`Already BDT:       ${report.productsAlreadyBdt}`);
    console.log(`Orders Preserved:  ${report.historicalOrdersPreserved}`);
    console.log(`Coupons Migrated:  ${report.couponsMigrated}`);
    if (report.errors.length > 0) {
      console.log(`Errors / Warnings: ${report.errors.join(', ')}`);
    }
    console.log('======================================================\n');
    process.exit(0);
  });
}
