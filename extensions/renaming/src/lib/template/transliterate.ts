/**
 * Unicode to ASCII transliteration
 *
 * Uses native string methods (normalize('NFD') + diacritics removal) for
 * accent handling.  A small lookup table covers common non-decomposable
 * characters (ligatures, special Latin letters, common symbols).
 *
 * No external dependencies.
 */

export interface TransliterateOptions {
  /** Remove characters that can't be mapped to ASCII (default: false) */
  removeUnmapped?: boolean;
}

export interface SanitizeOptions {
  /** Apply full transliteration (default: true) */
  transliterate?: boolean;
  /** Remove accents only, without full transliteration (default: true) */
  removeAccents?: boolean;
  /** Replace spaces with a character (default: false) */
  replaceSpaces?: boolean;
  /** Character to use when replacing spaces (default: "_") */
  spaceReplacement?: string;
}

export interface TransliterationPreview {
  original: string;
  transliterated: string;
  changed: boolean;
  changedChars: Array<{ original: string; replacement: string }>;
}

/**
 * Lookup table for characters that don't decompose via NFD into
 * base + combining marks.  Covers the most common ligatures, special
 * Latin letters, and a handful of non-Latin characters users are
 * likely to encounter in filenames.
 */
const CHAR_MAP: Record<string, string> = {
  // Ligatures
  "\u00C6": "AE", // Æ
  "\u00E6": "ae", // æ
  "\u0152": "OE", // Œ
  "\u0153": "oe", // œ
  "\u00DF": "ss", // ß
  "\u1E9E": "SS", // ẞ (capital sharp s)
  "\uFB01": "fi", // ﬁ
  "\uFB02": "fl", // ﬂ

  // Special Latin
  "\u00D0": "D", // Ð
  "\u00F0": "d", // ð
  "\u00D8": "O", // Ø
  "\u00F8": "o", // ø
  "\u0110": "D", // Đ
  "\u0111": "d", // đ
  "\u0126": "H", // Ħ
  "\u0127": "h", // ħ
  "\u0131": "i", // ı (dotless i)
  "\u0141": "L", // Ł
  "\u0142": "l", // ł
  "\u014A": "N", // Ŋ
  "\u014B": "n", // ŋ
  "\u0166": "T", // Ŧ
  "\u0167": "t", // ŧ
  "\u00DE": "Th", // Þ
  "\u00FE": "th", // þ

  // Common symbols
  "\u00A9": "(c)",
  "\u00AE": "(r)",
  "\u2122": "(tm)",
  "\u00AB": "<<",
  "\u00BB": ">>",
  "\u2013": "-", // en dash
  "\u2014": "-", // em dash
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u201E": '"',
  "\u2026": "...",
  "\u00B7": ".",
  "\u2022": "*",
  "\u00D7": "x",
};

/**
 * Transliterate a single character to ASCII.
 * 1. If it's already ASCII, return as-is.
 * 2. Check the manual lookup table.
 * 3. Try NFD decomposition (strips combining marks).
 * 4. If still non-ASCII, return the character unchanged (or "" if removeUnmapped).
 */
function transliterateChar(char: string, removeUnmapped: boolean): string {
  const code = char.codePointAt(0) ?? 0;
  if (code < 128) return char;

  // Manual lookup
  if (char in CHAR_MAP) return CHAR_MAP[char]!;

  // NFD decomposition: e.g., "é" → "e" + combining accent
  const decomposed = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (decomposed.length > 0 && decomposed !== char) {
    // Check that we actually got something ASCII-ish
    // eslint-disable-next-line no-control-regex
    if (/^[\x00-\x7F]+$/.test(decomposed)) return decomposed;
  }

  return removeUnmapped ? "" : char;
}

/**
 * Transliterate a string from Unicode to ASCII
 *
 * @param str - Input string with possible Unicode characters
 * @param options - Transliteration options
 * @returns ASCII-safe string
 *
 * @example
 * transliterate("café naïve") // "cafe naive"
 * transliterate("Ångström") // "Angstrom"
 * transliterate("日本語", { removeUnmapped: true }) // ""
 */
export function transliterate(str: string, options: TransliterateOptions = {}): string {
  const { removeUnmapped = false } = options;

  let result = "";
  for (const char of str) {
    result += transliterateChar(char, removeUnmapped);
  }
  return result;
}

/**
 * Remove diacritics (accents) from a string
 *
 * Uses Unicode normalization to decompose characters and then
 * strips the combining diacritical marks.
 *
 * @param str - Input string
 * @returns String with diacritics removed
 *
 * @example
 * removeAccents("café") // "cafe"
 * removeAccents("naïve") // "naive"
 */
export function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Check if a string contains non-ASCII characters
 *
 * @param str - String to check
 * @returns true if string contains non-ASCII characters
 */
export function hasNonAscii(str: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[^\x00-\x7F]/.test(str);
}

/**
 * Check if a string contains accented characters
 *
 * @param str - String to check
 * @returns true if string contains accented characters
 */
export function hasAccents(str: string): boolean {
  const normalized = str.normalize("NFD");
  return /[\u0300-\u036f]/.test(normalized);
}

/**
 * Sanitize a filename by transliterating and removing invalid characters
 *
 * @param filename - Filename to sanitize
 * @param options - Sanitization options
 * @returns Sanitized filename safe for most filesystems
 */
export function sanitizeFilename(filename: string, options: SanitizeOptions = {}): string {
  const {
    transliterate: doTransliterate = true,
    removeAccents: doRemoveAccents = true,
    replaceSpaces = false,
    spaceReplacement = "_",
  } = options;

  let result = filename;

  // First, transliterate if requested
  if (doTransliterate) {
    result = transliterate(result, { removeUnmapped: false });
  } else if (doRemoveAccents) {
    result = removeAccents(result);
  }

  // Remove characters that are invalid in filenames
  // Windows: \ / : * ? " < > |
  // macOS/Linux: / and null
  // eslint-disable-next-line no-control-regex
  result = result.replace(/[\\/:*?"<>|\x00]/g, "");

  // Replace spaces if requested
  if (replaceSpaces) {
    result = result.replace(/\s+/g, spaceReplacement);
    // Re-sanitize in case spaceReplacement introduced invalid characters
    // eslint-disable-next-line no-control-regex
    result = result.replace(/[\\/:*?"<>|\x00]/g, "");
  }

  // Remove leading/trailing spaces and dots
  result = result.replace(/^[\s.]+|[\s.]+$/g, "");

  // Ensure we have something left
  if (result.length === 0) {
    result = "unnamed";
  }

  return result;
}

/**
 * Get a preview of what transliteration will do to a string
 *
 * Compares input and output character-by-character to identify changes.
 *
 * @param str - Input string
 * @returns Object with original, transliterated, and changes info
 */
export function getTransliterationPreview(str: string): TransliterationPreview {
  const transliterated = transliterate(str);
  const changed = str !== transliterated;
  const changedChars: Array<{ original: string; replacement: string }> = [];

  if (changed) {
    // Walk through original string and find characters that changed
    const seen = new Set<string>();
    for (const original of str) {
      if ((original.codePointAt(0) ?? 0) >= 128 && !seen.has(original)) {
        seen.add(original);
        const replacement = transliterateChar(original, false);
        if (replacement !== original) {
          changedChars.push({ original, replacement });
        }
      }
    }
  }

  return {
    original: str,
    transliterated,
    changed,
    changedChars,
  };
}
