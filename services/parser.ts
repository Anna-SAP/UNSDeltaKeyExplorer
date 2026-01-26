import { ParsedRecord } from '../types';

/**
 * Parses a raw key string into structured data based on the business rules.
 * Format: RingCentral.uns.hash_string.TemplateName__type__BrandID__locale
 */
export const parseKey = (rawKey: string, sheetTitle: string, index: number): ParsedRecord | null => {
  if (!rawKey || typeof rawKey !== 'string') return null;

  const parts = rawKey.split('.');
  
  // Basic validation: must have enough dots to likely be a valid key
  if (parts.length < 3) {
    return {
      id: `${sheetTitle}-${index}`,
      originalKey: rawKey,
      taskName: sheetTitle,
      templateName: rawKey, // Fallback
      brandId: 'Unknown',
      locale: null,
      rawParts: parts,
    };
  }

  // According to specs: 3rd part (index 3) or sometimes index 2 depending on prefix contains the core info.
  // Standard: RingCentral(0).uns(1).hash(2).CoreInfo(3)
  // We will try to locate the part containing double underscores '__' which is a strong signal.
  
  let corePart = parts.find(p => p.includes('__'));
  
  // Fallback if no double underscore found, assume last part or 3rd part
  if (!corePart) {
    corePart = parts[3] || parts[parts.length - 1];
  }

  // Parse the core part: TemplateName__type__BrandID__locale
  const segmentParts = corePart.split('__');
  const templateName = segmentParts[0];
  
  // Find BrandID: look for a 4-digit number in the segments
  const brandIdMatch = segmentParts.find(s => /^\d{4}$/.test(s));
  const brandId = brandIdMatch || 'Unknown';

  // Locale is usually the last part of the segments, if it looks like a locale (e.g., en_US, fr_CA)
  // This is a heuristic.
  const possibleLocale = segmentParts[segmentParts.length - 1];
  const locale = possibleLocale !== brandId && possibleLocale !== templateName ? possibleLocale : null;

  return {
    id: `${sheetTitle}-${index}`,
    originalKey: rawKey,
    taskName: sheetTitle, // The Sheet Name maps to Task Name
    templateName: templateName,
    brandId: brandId,
    locale: locale,
    rawParts: parts
  };
};

/**
 * Batch processor for high performance
 */
export const processSheetData = (sheetTitle: string, rows: string[][]): ParsedRecord[] => {
  const records: ParsedRecord[] = [];
  
  rows.forEach((row, idx) => {
    // Assuming Column B is index 1. 
    // If the sheet has a header row, user might see "Key" as a template name, which is acceptable or can be filtered.
    const keyCell = row[1]; 
    if (keyCell) {
      const parsed = parseKey(keyCell, sheetTitle, idx);
      if (parsed) records.push(parsed);
    }
  });

  return records;
};