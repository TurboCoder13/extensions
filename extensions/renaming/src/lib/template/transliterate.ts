/**
 * Unicode to ASCII transliteration
 *
 * Uses native normalize('NFD') for diacritics removal and a small lookup
 * table for common non-Latin characters. No external dependencies.
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
 * Lookup table for common non-Latin characters that are not handled
 * by NFD decomposition + diacritics stripping.
 */
const TRANSLITERATION_MAP: Record<string, string> = {
  // Typography
  "\u201C": '"', // left double quotation mark
  "\u201D": '"', // right double quotation mark
  "\u2018": "'", // left single quotation mark
  "\u2019": "'", // right single quotation mark
  "\u2014": "--", // em-dash
  "\u2013": "-", // en-dash
  "\u2026": "...", // ellipsis
  "\u00A9": "(c)", // copyright
  "\u2122": "(tm)", // trademark
  "\u00AE": "(r)", // registered
  "\u00B0": "deg", // degree
  "\u00B7": ".", // middle dot
  "\u2022": "*", // bullet

  // German
  "\u00DF": "ss", // ß
  "\u00C6": "AE", // Æ
  "\u00E6": "ae", // æ
  "\u0152": "OE", // Œ
  "\u0153": "oe", // œ
  "\u00D0": "D", // Ð
  "\u00F0": "d", // ð
  "\u00DE": "Th", // Þ
  "\u00FE": "th", // þ
  // Polish
  "\u0141": "L", // Ł
  "\u0142": "l", // ł
  // Scandinavian
  "\u00D8": "O", // Ø
  "\u00F8": "o", // ø
  "\u00C5": "A", // Å (also handled by NFD but included for completeness)
  "\u00E5": "a", // å
  // Cyrillic (basic)
  "\u0410": "A",
  "\u0411": "B",
  "\u0412": "V",
  "\u0413": "G",
  "\u0414": "D",
  "\u0415": "E",
  "\u0416": "Zh",
  "\u0417": "Z",
  "\u0418": "I",
  "\u0419": "Y",
  "\u041A": "K",
  "\u041B": "L",
  "\u041C": "M",
  "\u041D": "N",
  "\u041E": "O",
  "\u041F": "P",
  "\u0420": "R",
  "\u0421": "S",
  "\u0422": "T",
  "\u0423": "U",
  "\u0424": "F",
  "\u0425": "Kh",
  "\u0426": "Ts",
  "\u0427": "Ch",
  "\u0428": "Sh",
  "\u0429": "Shch",
  "\u042A": "",
  "\u042B": "Y",
  "\u042C": "",
  "\u042D": "E",
  "\u042E": "Yu",
  "\u042F": "Ya",
  "\u0430": "a",
  "\u0431": "b",
  "\u0432": "v",
  "\u0433": "g",
  "\u0434": "d",
  "\u0435": "e",
  "\u0436": "zh",
  "\u0437": "z",
  "\u0438": "i",
  "\u0439": "y",
  "\u043A": "k",
  "\u043B": "l",
  "\u043C": "m",
  "\u043D": "n",
  "\u043E": "o",
  "\u043F": "p",
  "\u0440": "r",
  "\u0441": "s",
  "\u0442": "t",
  "\u0443": "u",
  "\u0444": "f",
  "\u0445": "kh",
  "\u0446": "ts",
  "\u0447": "ch",
  "\u0448": "sh",
  "\u0449": "shch",
  "\u044A": "",
  "\u044B": "y",
  "\u044C": "",
  "\u044D": "e",
  "\u044E": "yu",
  "\u044F": "ya",
  "\u0401": "Yo",
  "\u0451": "yo",
  // Greek (basic)
  "\u0391": "A",
  "\u0392": "B",
  "\u0393": "G",
  "\u0394": "D",
  "\u0395": "E",
  "\u0396": "Z",
  "\u0397": "I",
  "\u0398": "Th",
  "\u0399": "I",
  "\u039A": "K",
  "\u039B": "L",
  "\u039C": "M",
  "\u039D": "N",
  "\u039E": "X",
  "\u039F": "O",
  "\u03A0": "P",
  "\u03A1": "R",
  "\u03A3": "S",
  "\u03A4": "T",
  "\u03A5": "Y",
  "\u03A6": "F",
  "\u03A7": "Ch",
  "\u03A8": "Ps",
  "\u03A9": "O",
  "\u03B1": "a",
  "\u03B2": "b",
  "\u03B3": "g",
  "\u03B4": "d",
  "\u03B5": "e",
  "\u03B6": "z",
  "\u03B7": "i",
  "\u03B8": "th",
  "\u03B9": "i",
  "\u03BA": "k",
  "\u03BB": "l",
  "\u03BC": "m",
  "\u03BD": "n",
  "\u03BE": "x",
  "\u03BF": "o",
  "\u03C0": "p",
  "\u03C1": "r",
  "\u03C2": "s",
  "\u03C3": "s",
  "\u03C4": "t",
  "\u03C5": "y",
  "\u03C6": "f",
  "\u03C7": "ch",
  "\u03C8": "ps",
  "\u03C9": "o",
};

/**
 * Transliterate a string from Unicode to ASCII
 *
 * @param str - Input string with possible Unicode characters
 * @param options - Transliteration options
 * @returns ASCII-safe string
 *
 * @example
 * transliterate("cafe naive") // "cafe naive"
 * transliterate("Angstrom") // "Angstrom"
 */
export function transliterate(str: string, options: TransliterateOptions = {}): string {
  const { removeUnmapped = false } = options;

  let result = "";

  for (const char of str) {
    // Check lookup table first
    if (char in TRANSLITERATION_MAP) {
      result += TRANSLITERATION_MAP[char];
      continue;
    }

    // Try NFD decomposition to strip combining marks
    const decomposed = char.normalize("NFD");
    const stripped = decomposed.replace(/[\u0300-\u036f]/g, "");

    // If stripping produced a different, ASCII result, use it
    if (stripped !== decomposed && stripped.length > 0) {
      result += stripped;
      continue;
    }

    // Check if it's already ASCII
    if ((char.codePointAt(0) ?? 0) < 128) {
      result += char;
      continue;
    }

    // Non-ASCII character with no mapping
    if (removeUnmapped) {
      // Skip it
    } else {
      result += char;
    }
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
 * removeAccents("cafe") // "cafe"
 * removeAccents("naive") // "naive"
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
        const replacement = transliterate(original);
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
