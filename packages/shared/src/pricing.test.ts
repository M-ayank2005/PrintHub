import { describe, it, expect } from 'vitest';
import { parsePageRange, calculateDocPrice, calculateJobTotals, getCatalogKey } from './pricing';
import { DEFAULT_PRICING } from './constants';
import { DocumentOptions } from './schemas';

describe('Pricing Engine', () => {
  describe('parsePageRange', () => {
    it('handles null/undefined/empty by selecting all pages', () => {
      expect(parsePageRange(undefined, 5)).toEqual([1, 2, 3, 4, 5]);
      expect(parsePageRange('', 3)).toEqual([1, 2, 3]);
    });

    it('parses comma-separated values and ranges correctly', () => {
      expect(parsePageRange('1-3, 5', 10)).toEqual([1, 2, 3, 5]);
    });

    it('deduplicates and clamps to document page limits', () => {
      expect(parsePageRange('2, 2, 5-8', 6)).toEqual([2, 5, 6]);
    });
  });

  describe('getCatalogKey', () => {
    it('constructs correct catalog keys', () => {
      expect(getCatalogKey('A4', 'BW', 'SINGLE')).toBe('A4_BW_SINGLE');
      expect(getCatalogKey('A4', 'COLOR', 'DOUBLE')).toBe('A4_COLOR_DOUBLE');
    });
  });

  describe('calculateDocPrice', () => {
    const baseOptions: DocumentOptions = {
      copies: 1,
      colorMode: 'BW',
      sides: 'SINGLE',
      paperSize: 'A4',
      pagesPerSheet: 1,
      orientation: 'AUTO',
      fitMode: 'FIT',
    };

    it('calculates single-sided A4 B&W correctly', () => {
      // 5 pages, A4_BW_SINGLE is ₹2.00 (200 paise) per side
      const breakdown = calculateDocPrice(
        { docId: 'doc-1', kind: 'PDF', totalPages: 5, options: baseOptions },
        DEFAULT_PRICING
      );

      expect(breakdown.selectedPages).toBe(5);
      expect(breakdown.printedSides).toBe(5);
      expect(breakdown.printedSheets).toBe(5);
      expect(breakdown.unitPricePaise).toBe(200);
      expect(breakdown.subtotalPaise).toBe(1000); // 5 * 200 = 1000 paise (₹10)
    });

    it('handles duplex with odd page counts (ceil rounding)', () => {
      // 5 pages duplex: 5 sides -> ceil(5/2) = 3 sheets
      // A4_BW_DOUBLE is ₹3.00 (300 paise) per sheet
      const duplexOptions: DocumentOptions = {
        ...baseOptions,
        sides: 'DOUBLE',
      };

      const breakdown = calculateDocPrice(
        { docId: 'doc-2', kind: 'PDF', totalPages: 5, options: duplexOptions },
        DEFAULT_PRICING
      );

      expect(breakdown.selectedPages).toBe(5);
      expect(breakdown.printedSides).toBe(5);
      expect(breakdown.printedSheets).toBe(3); // 3 sheets
      expect(breakdown.unitPricePaise).toBe(300);
      expect(breakdown.subtotalPaise).toBe(900); // 3 sheets * 300 = 900 paise (₹9)
    });

    it('handles N-up imposition math (2-up and 4-up)', () => {
      // 5 pages with 2-up: ceil(5/2) = 3 printed sides
      const twoUpOptions: DocumentOptions = {
        ...baseOptions,
        pagesPerSheet: 2,
      };

      const breakdown = calculateDocPrice(
        { docId: 'doc-3', kind: 'PDF', totalPages: 5, options: twoUpOptions },
        DEFAULT_PRICING
      );

      expect(breakdown.printedSides).toBe(3);
      expect(breakdown.printedSheets).toBe(3);
      expect(breakdown.subtotalPaise).toBe(600); // 3 sides * 200 paise = 600 paise
    });

    it('multiplies by copies accurately', () => {
      const copiesOptions: DocumentOptions = {
        ...baseOptions,
        copies: 3,
      };

      const breakdown = calculateDocPrice(
        { docId: 'doc-4', kind: 'PDF', totalPages: 4, options: copiesOptions },
        DEFAULT_PRICING
      );

      expect(breakdown.selectedPages).toBe(4);
      expect(breakdown.subtotalPaise).toBe(3 * 4 * 200); // 2400 paise
    });

    it('rejects disabled print types with an informative error', () => {
      const a3Options: DocumentOptions = {
        ...baseOptions,
        paperSize: 'A3', // disabled in DEFAULT_PRICING
      };

      expect(() =>
        calculateDocPrice(
          { docId: 'doc-5', kind: 'PDF', totalPages: 2, options: a3Options },
          DEFAULT_PRICING
        )
      ).toThrowError(/not enabled/);
    });

    it('applies scan fee for camera scan documents', () => {
      const breakdown = calculateDocPrice(
        { docId: 'scan-1', kind: 'SCAN', totalPages: 3, options: baseOptions },
        DEFAULT_PRICING,
        { scanFeePerPage: 100 } // ₹1.00 per scan page
      );

      expect(breakdown.extrasPaise).toBe(300); // 3 pages * 100
      expect(breakdown.subtotalPaise).toBe(3 * 200 + 300); // 900 paise
    });
  });

  describe('calculateJobTotals and minimum order', () => {
    it('enforces minimum order threshold when applicable', () => {
      const breakdown = calculateDocPrice(
        {
          docId: 'doc-1',
          kind: 'PDF',
          totalPages: 1,
          options: {
            copies: 1,
            colorMode: 'BW',
            sides: 'SINGLE',
            paperSize: 'A4',
            pagesPerSheet: 1,
            orientation: 'AUTO',
          },
        },
        DEFAULT_PRICING
      );

      expect(breakdown.subtotalPaise).toBe(200); // ₹2

      // Minimum order ₹10 (1000 paise)
      const totals = calculateJobTotals([breakdown], [1], ['BW'], { minimumOrder: 1000 });
      expect(totals.pricePaise).toBe(1000);
      expect(totals.documents).toBe(1);
      expect(totals.sheets).toBe(1);
    });
  });
});
