/**
 * Specialty Text Parser
 * Parses specialty text values and maps them to structured specialty types
 */

import type { Specialty } from './schedule-types';

/**
 * Parse a specialty text value and return structured Specialty object(s)
 * Handles comma-separated values and various text formats
 */
export function parseSpecialtyText(text: string | null | undefined): Specialty[] {
  if (!text || typeof text !== 'string') return [];

  const normalized = text.toLowerCase().trim();
  if (!normalized) return [];

  const specialties: Specialty[] = [];

  // Detection patterns with specific types
  const detectionPatterns = [
    { pattern: /narcotics?\s*detection|drug\s*detection|narc/i, type: 'Narcotics' },
    { pattern: /explosives?\s*detection|bomb\s*detection|explosive/i, type: 'Explosives' },
    { pattern: /contraband\s*inspection|contraband/i, type: 'Contraband' },
    { pattern: /currency\s*detection|money/i, type: 'Currency' },
  ];

  // Check for detection specialties
  for (const { pattern, type } of detectionPatterns) {
    if (pattern.test(normalized)) {
      specialties.push({
        type: 'Detection',
        detectionType: type as 'Narcotics' | 'Explosives',
      });
    }
  }

  // Bite Work patterns (includes patrol, tracking, search and rescue)
  const biteWorkPatterns = [
    /bite\s*work/i,
    /apprehension/i,
    /patrol/i,
    /search\s*and\s*rescue/i,
    /sar/i,
    /tracking/i,
    /trailing/i,
  ];

  for (const pattern of biteWorkPatterns) {
    if (pattern.test(normalized)) {
      // Only add if not already present
      if (!specialties.some(s => s.type === 'Bite Work')) {
        specialties.push({ type: 'Bite Work' });
      }
      break;
    }
  }

  return specialties;
}

/**
 * Parse multiple specialty columns and combine results
 */
export function parseMultipleSpecialtyColumns(values: (string | null | undefined)[]): Specialty[] {
  const allSpecialties: Specialty[] = [];

  for (const value of values) {
    const parsed = parseSpecialtyText(value);

    // Add only unique specialties
    for (const specialty of parsed) {
      const exists = allSpecialties.some(s => {
        if (s.type !== specialty.type) return false;
        if (s.type === 'Detection' && specialty.type === 'Detection') {
          return s.detectionType === specialty.detectionType;
        }
        return true;
      });

      if (!exists) {
        allSpecialties.push(specialty);
      }
    }
  }

  return allSpecialties;
}

/**
 * Find all specialty columns in headers (specialty_1, specialty_2, specialty 1, etc.)
 */
export function findSpecialtyColumns(headers: string[]): string[] {
  const specialtyColumns: string[] = [];

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    // Match patterns like: specialty_1, specialty 1, specialty1, spec_1, etc.
    if (
      /^specialty[\s_-]*\d+$/i.test(normalized) ||
      /^spec[\s_-]*\d+$/i.test(normalized) ||
      /^specialties?$/i.test(normalized)
    ) {
      specialtyColumns.push(header);
    }
  }

  return specialtyColumns;
}
