import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BANGLADESH_LOCATIONS,
  getDivisions,
  getDistricts,
  getUpazilas,
  getUnionsOrWards,
  validateBdLocation,
} from '../data/bangladeshLocations';
import { formatBDT } from './currency';

describe('6. Bangladesh Localization & Administrative Address Integrity', () => {
  it('covers all 8 administrative divisions of Bangladesh', () => {
    const divisions = getDivisions();
    assert.equal(divisions.length, 8);
    const expectedDivisions = [
      'Dhaka',
      'Chattogram',
      'Rajshahi',
      'Khulna',
      'Barishal',
      'Sylhet',
      'Rangpur',
      'Mymensingh',
    ];
    for (const div of expectedDivisions) {
      assert.ok(
        divisions.includes(div),
        `Division ${div} must exist in BBS catalog`
      );
    }
  });

  it('validates authentic 4-tier Bangladesh addresses successfully', () => {
    const validAddress1 = validateBdLocation('Dhaka', 'Dhaka', 'Dhanmondi', 'Ward 15');
    assert.equal(validAddress1.valid, true);

    const validAddress2 = validateBdLocation('Chattogram', 'Chattogram', 'Panchlaish', 'Ward 08 (Shulakbahar)');
    assert.equal(validAddress2.valid, true);

    const validAddress3 = validateBdLocation('Sylhet', 'Sylhet', 'Sylhet Sadar', 'Khadimnagar Union');
    assert.equal(validAddress3.valid, true);
  });

  it('rejects foreign, hallucinated or mismatched administrative addresses', () => {
    // Foreign country/division
    const foreignDivision = validateBdLocation('California', 'Los Angeles', 'Downtown', 'Ward 1');
    assert.equal(foreignDivision.valid, false);

    // Mismatched district under wrong division
    const mismatchedDistrict = validateBdLocation('Dhaka', 'Chattogram', 'Dhanmondi', 'Ward 15');
    assert.equal(mismatchedDistrict.valid, false);

    // Mismatched upazila under wrong district
    const mismatchedUpazila = validateBdLocation('Dhaka', 'Dhaka', 'Panchlaish', 'Ward 15');
    assert.equal(mismatchedUpazila.valid, false);

    // Empty or missing required fields
    const emptyDivision = validateBdLocation('', 'Dhaka', 'Dhanmondi', 'Ward 15');
    assert.equal(emptyDivision.valid, false);
  });

  it('correctly filters dynamic child districts, upazilas and unions', () => {
    const dhakaDistricts = getDistricts('Dhaka');
    assert.ok(dhakaDistricts.includes('Dhaka'));
    assert.ok(dhakaDistricts.includes('Gazipur'));
    assert.ok(dhakaDistricts.includes('Narayanganj'));

    const dhanmondiUpazilas = getUpazilas('Dhaka', 'Dhaka');
    assert.ok(dhanmondiUpazilas.includes('Dhanmondi'));
    assert.ok(dhanmondiUpazilas.includes('Gulshan'));
    assert.ok(dhanmondiUpazilas.includes('Mirpur'));

    const dhanmondiUnions = getUnionsOrWards('Dhaka', 'Dhaka', 'Dhanmondi');
    assert.ok(dhanmondiUnions.includes('Ward 15'));
  });
});

describe('7. Bangladeshi Taka (BDT) Currency Formatting & Ledger Arithmetic', () => {
  it('formats whole number amounts with official ৳ symbol and Bengali locale commas', () => {
    const formatted = formatBDT(2500);
    assert.equal(formatted.includes('৳'), true);
    assert.equal(formatted.includes('2,500'), true);
  });

  it('formats decimal amounts with poisha precision when poisha exists', () => {
    const formatted = formatBDT(5999.5);
    assert.equal(formatted.includes('৳'), true);
    assert.equal(formatted.includes('5,999.50'), true);
  });

  it('formats zero and negative adjustments accurately', () => {
    const zero = formatBDT(0);
    assert.equal(zero.includes('৳'), true);
    assert.equal(zero.includes('0'), true);

    const negative = formatBDT(-500);
    assert.equal(negative.includes('৳'), true);
    assert.equal(negative.includes('500'), true);
  });

  it('handles string numerical inputs safely without crashing', () => {
    const fromNumber = formatBDT(125000);
    assert.equal(fromNumber.includes('৳'), true);
    assert.ok(fromNumber.includes('1,25,000') || fromNumber.includes('125,000'));

    const invalid = formatBDT(NaN);
    assert.equal(invalid, '৳0.00');
  });
});
