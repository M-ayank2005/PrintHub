import {
  PrintCatalogKey,
  PaperSize,
  ColorMode,
  Sides,
  DocumentKind,
} from './constants';
import { DocumentOptions, BusinessPricing } from './schemas';
import { DocPriceBreakdown, JobTotals } from './types';

/**
 * Parses a page range string (e.g. "1-3, 5, 8-10") against the document's total pages.
 * Returns a sorted, deduplicated array of 1-based page numbers.
 */
export function parsePageRange(rangeStr: string | undefined | null, totalPages: number): number[] {
  if (totalPages <= 0) {
    return [];
  }

  if (!rangeStr || !rangeStr.trim()) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const selected = new Set<number>();
  const parts = rangeStr.split(',');

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr?.trim() || '', 10);
      const end = parseInt(endStr?.trim() || '', 10);

      if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
        const clampedStart = Math.max(1, start);
        const clampedEnd = Math.min(totalPages, end);
        for (let p = clampedStart; p <= clampedEnd; p++) {
          selected.add(p);
        }
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        selected.add(page);
      }
    }
  }

  const result = Array.from(selected).sort((a, b) => a - b);
  return result.length > 0 ? result : Array.from({ length: totalPages }, (_, i) => i + 1);
}

/**
 * Generates the catalog key for pricing from document print options.
 */
export function getCatalogKey(paperSize: PaperSize, colorMode: ColorMode, sides: Sides): PrintCatalogKey {
  return `${paperSize}_${colorMode}_${sides}` as PrintCatalogKey;
}

export interface CalculateDocPriceInput {
  docId: string;
  kind: DocumentKind;
  totalPages: number;
  options: DocumentOptions;
}

/**
 * Computes price breakdown for a single document based on shop pricing.
 * Throws an error if the requested print type is not enabled.
 */
export function calculateDocPrice(
  input: CalculateDocPriceInput,
  pricing: BusinessPricing['pricing'],
  extras?: BusinessPricing['extras']
): DocPriceBreakdown {
  const { docId, kind, totalPages, options } = input;
  const catalogKey = getCatalogKey(options.paperSize, options.colorMode, options.sides);
  const catalogItem = pricing[catalogKey];

  if (!catalogItem || !catalogItem.enabled) {
    throw new Error(`Print type "${catalogKey}" is not enabled by this shop.`);
  }

  const selectedPagesList = parsePageRange(options.pageRange, totalPages);
  const selectedPages = selectedPagesList.length;

  if (selectedPages <= 0) {
    throw new Error(`Document has no valid pages selected.`);
  }

  // N-up imposition: sides per document copy
  const printedSides = Math.ceil(selectedPages / options.pagesPerSheet);
  const isDuplex = options.sides === 'DOUBLE';
  const printedSheets = isDuplex ? Math.ceil(printedSides / 2) : printedSides;

  // Billable units: per sheet for duplex, per side for single
  const billableUnitsPerCopy = isDuplex ? printedSheets : printedSides;
  const unitPricePaise = catalogItem.pricePaise;

  // Scan fee extra if applicable
  let extrasPaise = 0;
  if (kind === 'SCAN' && extras?.scanFeePerPage) {
    extrasPaise = selectedPages * extras.scanFeePerPage * options.copies;
  }

  const subtotalPaise = (options.copies * billableUnitsPerCopy * unitPricePaise) + extrasPaise;

  return {
    docId,
    selectedPages,
    printedSides,
    printedSheets,
    catalogKey,
    unitPricePaise,
    extrasPaise,
    subtotalPaise,
  };
}

/**
 * Computes job totals across all documents, applying shop minimum order limits.
 */
export function calculateJobTotals(
  docBreakdowns: DocPriceBreakdown[],
  docCopies: number[],
  docColorModes: ColorMode[],
  extras?: BusinessPricing['extras']
): JobTotals {
  let totalSelectedPages = 0;
  let totalSheets = 0;
  let bwSheets = 0;
  let colorSheets = 0;
  let rawSubtotalPaise = 0;

  docBreakdowns.forEach((breakdown, index) => {
    const copies = docCopies[index] ?? 1;
    const colorMode = docColorModes[index] ?? 'BW';
    const sheetsForDoc = breakdown.printedSheets * copies;

    totalSelectedPages += breakdown.selectedPages * copies;
    totalSheets += sheetsForDoc;

    if (colorMode === 'COLOR') {
      colorSheets += sheetsForDoc;
    } else {
      bwSheets += sheetsForDoc;
    }

    rawSubtotalPaise += breakdown.subtotalPaise;
  });

  const minimumOrder = extras?.minimumOrder || 0;
  const pricePaise = Math.max(rawSubtotalPaise, minimumOrder);

  return {
    documents: docBreakdowns.length,
    pages: totalSelectedPages,
    sheets: totalSheets,
    bwSheets,
    colorSheets,
    pricePaise,
  };
}
