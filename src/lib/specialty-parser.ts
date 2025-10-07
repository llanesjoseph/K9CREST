/**
 * Specialty Text Parser
 * Parses specialty text values and maps them to structured specialty types
 */

import type { Specialty } from './schedule-types';

/**
 * Parse a single specialty token (one value, no commas)
 */
function parseSingleSpecialty(text: string): Specialty[] {
  const normalized = text.toLowerCase().trim();
  if (!normalized) return [];

  const specialties: Specialty[] = [];

  // Detection patterns with specific types
  const detectionPatterns = [
    { pattern: /narcotics|drug|narc/i, type: 'Narcotics' },
    { pattern: /explosiv|bomb/i, type: 'Explosives' },
    { pattern: /contraband/i, type: 'Contraband' },
    { pattern: /currency|money/i, type: 'Currency' },
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
    /bite/i,
    /apprehension/i,
    /patrol/i,
    /search.*rescue/i,
    /sar/i,
    /tracking/i,
    /trailing/i,
    /building.*search/i,
    /baggage/i,
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
 * Parse a specialty text value and return structured Specialty object(s)
 * Handles comma-separated values and various text formats
 */
export function parseSpecialtyText(text: string | null | undefined): Specialty[] {
  if (!text || typeof text !== 'string') return [];

  const normalized = text.trim();
  if (!normalized) return [];

  const allSpecialties: Specialty[] = [];

  // Split on commas to handle comma-separated values
  const parts = normalized.split(',').map(p => p.trim()).filter(p => p.length > 0);

  console.log(`🔎 Parsing specialty text: "${text}" → ${parts.length} parts:`, parts);

  for (const part of parts) {
    const parsed = parseSingleSpecialty(part);

    if (parsed.length > 0) {
      console.log(`  ✨ "${part}" → `, parsed);
    }

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
 * Find all specialty columns in headers (Specialty_1, specialty_2, specialty 1, etc.)
 */
export function findSpecialtyColumns(headers: string[]): string[] {
  const specialtyColumns: string[] = [];

  for (const header of headers) {
    const normalized = header.toLowerCase().trim().replace(/\s+/g, '_');

    // Match patterns like: Specialty_1, specialty_2, specialty 1, specialty1, spec_1, etc.
    if (
      normalized.match(/^specialty_?\d+$/) ||
      normalized.match(/^spec_?\d+$/) ||
      normalized.match(/^specialt(y|ies)$/)
    ) {
      specialtyColumns.push(header);
      console.log(`✅ Matched specialty column: "${header}"`);
    }
  }

  console.log(`🔍 Total specialty columns found: ${specialtyColumns.length}`, specialtyColumns);
  return specialtyColumns;
}
