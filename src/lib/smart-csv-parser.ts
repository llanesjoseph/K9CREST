/**
 * Smart CSV Parser with Intelligent Column Detection
 * Handles various CSV formats and column name variations
 */

export type FieldMapping = {
  name: string | null;
  dogName: string | null;
  agency: string | null;
  specialty_bite_work: string | null;
  specialty_detection_narcotics: string | null;
  specialty_detection_explosives: string | null;
};

type ColumnVariations = {
  [key: string]: string[];
};

// Column name variations for intelligent matching
const COLUMN_VARIATIONS: ColumnVariations = {
  name: [
    'name', 'handler', 'handler name', 'officer', 'officer name',
    'team member', 'competitor', 'competitor name', 'person',
    'first name', 'handler_name', 'officer_name', 'team_member'
  ],
  dogName: [
    'dogname', 'dog name', 'k9', 'k9 name', 'canine', 'canine name',
    'dog', 'k-9', 'k-9 name', 'dog_name', 'k9_name', 'canine_name'
  ],
  agency: [
    'agency', 'department', 'dept', 'organization', 'org',
    'police department', 'department name', 'agency name',
    'dept_name', 'organization_name', 'police_dept'
  ],
  specialty_bite_work: [
    'bite work', 'bite', 'patrol', 'bite_work', 'bitework',
    'specialty bite work', 'specialty_bite_work', 'bite work specialty',
    'apprehension', 'patrol work'
  ],
  specialty_detection_narcotics: [
    'narcotics', 'drugs', 'detection narcotics', 'narc', 'drug detection',
    'specialty_detection_narcotics', 'detection_narcotics', 'narcotics detection',
    'specialty narcotics', 'specialty_narcotics'
  ],
  specialty_detection_explosives: [
    'explosives', 'bomb', 'detection explosives', 'explosive detection',
    'specialty_detection_explosives', 'detection_explosives', 'explosives detection',
    'specialty explosives', 'specialty_explosives', 'bomb detection'
  ],
};

/**
 * Calculate similarity score between two strings (0-1)
 * Uses Levenshtein distance normalized
 */
function similarityScore(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);

  if (maxLen === 0) return 1;

  // Simple substring matching
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }

  // Levenshtein distance
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  return 1 - distance / maxLen;
}

/**
 * Find best matching field for a CSV column header
 */
function findBestMatch(header: string, field: string): number {
  const variations = COLUMN_VARIATIONS[field];
  if (!variations) return 0;

  const normalizedHeader = header.toLowerCase().trim();

  let bestScore = 0;
  for (const variation of variations) {
    const score = similarityScore(normalizedHeader, variation);
    if (score > bestScore) {
      bestScore = score;
    }
  }

  return bestScore;
}

/**
 * Auto-detect column mapping from CSV headers
 * Returns confidence scores for each mapping
 */
export function autoDetectColumns(headers: string[]): {
  mapping: FieldMapping;
  confidence: { [key: string]: number };
  suggestions: { [key: string]: Array<{ header: string; score: number }> };
} {
  const mapping: FieldMapping = {
    name: null,
    dogName: null,
    agency: null,
    specialty_bite_work: null,
    specialty_detection_narcotics: null,
    specialty_detection_explosives: null,
  };

  const confidence: { [key: string]: number } = {};
  const suggestions: { [key: string]: Array<{ header: string; score: number }> } = {};

  // Find best match for each field
  for (const field of Object.keys(mapping)) {
    const scores: Array<{ header: string; score: number }> = [];

    for (const header of headers) {
      const score = findBestMatch(header, field);
      if (score > 0.3) { // Only consider reasonable matches
        scores.push({ header, score });
      }
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    suggestions[field] = scores;

    // Auto-assign if confidence is high enough
    if (scores.length > 0 && scores[0].score > 0.6) {
      mapping[field as keyof FieldMapping] = scores[0].header;
      confidence[field] = scores[0].score;
    } else {
      confidence[field] = 0;
    }
  }

  return { mapping, confidence, suggestions };
}

/**
 * Parse a boolean value from CSV (handles multiple formats)
 */
export function parseBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;

  const normalized = value.toLowerCase().trim();
  return (
    normalized === 'true' ||
    normalized === 'yes' ||
    normalized === 'y' ||
    normalized === '1' ||
    normalized === 'x' ||
    normalized === '✓' ||
    normalized === '✔'
  );
}

/**
 * Validate that required fields are mapped
 */
export function validateMapping(mapping: FieldMapping): {
  valid: boolean;
  missing: string[];
} {
  const required = ['name', 'dogName', 'agency'];
  const missing = required.filter(field => !mapping[field as keyof FieldMapping]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get user-friendly field name
 */
export function getFieldLabel(field: string): string {
  const labels: { [key: string]: string } = {
    name: 'Handler Name',
    dogName: 'K9 Name',
    agency: 'Agency/Department',
    specialty_bite_work: 'Bite Work',
    specialty_detection_narcotics: 'Narcotics Detection',
    specialty_detection_explosives: 'Explosives Detection',
  };

  return labels[field] || field;
}

/**
 * Extract value from row using mapping
 */
export function extractValue(
  row: any,
  mapping: FieldMapping,
  field: keyof FieldMapping
): string | boolean | null {
  const columnName = mapping[field];
  if (!columnName) return null;

  const value = row[columnName];

  // For specialty fields, parse as boolean
  if (field.startsWith('specialty_')) {
    return parseBoolean(value);
  }

  // For text fields, return as string
  return value ? String(value).trim() : null;
}
