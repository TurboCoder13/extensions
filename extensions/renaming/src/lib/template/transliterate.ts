/**
 * Unicode to ASCII transliteration
 *
 * Built-in implementation using Unicode normalization and a curated
 * character mapping. Does NOT depend on the `transliteration` npm package.
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
 * Extended character map for characters that Unicode NFD normalization
 * does not decompose into ASCII base + combining mark.
 */
const CHAR_MAP: Record<string, string> = {
  // Latin ligatures & special
  "\u00C6": "AE",
  "\u00E6": "ae",
  "\u0152": "OE",
  "\u0153": "oe",
  "\u00D0": "D",
  "\u00F0": "d",
  "\u00DE": "Th",
  "\u00FE": "th",
  "\u00DF": "ss",
  "\u0141": "L",
  "\u0142": "l",
  "\u0131": "i",
  "\u0110": "D",
  "\u0111": "d",
  // German umlauts (when NFD stripping alone would give wrong result)
  "\u00C4": "Ae",
  "\u00E4": "ae",
  "\u00D6": "Oe",
  "\u00F6": "oe",
  "\u00DC": "Ue",
  "\u00FC": "ue",
  // Nordic
  "\u00D8": "O",
  "\u00F8": "o",
  // Polish
  "\u0104": "A",
  "\u0105": "a",
  "\u0118": "E",
  "\u0119": "e",
  // Vietnamese tone marks that survive NFD
  "\u01A0": "O",
  "\u01A1": "o",
  "\u01AF": "U",
  "\u01B0": "u",
  // Cyrillic (basic Russian alphabet)
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
  // Greek
  "\u0391": "A",
  "\u0392": "B",
  "\u0393": "G",
  "\u0394": "D",
  "\u0395": "E",
  "\u0396": "Z",
  "\u0397": "H",
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
  "\u03B7": "h",
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
  "\u03C3": "s",
  "\u03C2": "s",
  "\u03C4": "t",
  "\u03C5": "y",
  "\u03C6": "f",
  "\u03C7": "ch",
  "\u03C8": "ps",
  "\u03C9": "o",
  // Symbols
  "\u00A9": "(c)",
  "\u00AE": "(r)",
  "\u2122": "(tm)",
  "\u2018": "'",
  "\u2019": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u2013": "-",
  "\u2014": "-",
  "\u2026": "...",
};

/**
 * Transliterate a single character to ASCII.
 * Returns null if no mapping is found.
 */
function transliterateChar(ch: string): string | null {
  // Already ASCII
  if (ch.codePointAt(0)! < 128) return ch;

  // Check explicit map first
  if (ch in CHAR_MAP) return CHAR_MAP[ch]!;

  // Try NFD decomposition: strip combining marks
  const decomposed = ch.normalize("NFD");
  const stripped = decomposed.replace(/[\u0300-\u036f]/g, "");
  if (stripped.length > 0 && stripped !== ch) {
    // Verify the result is ASCII
    const allAscii = [...stripped].every((c) => c.codePointAt(0)! < 128);
    if (allAscii) return stripped;
  }

  return null;
}

/**
 * Transliterate a string from Unicode to ASCII
 *
 * @param str - Input string with possible Unicode characters
 * @param options - Transliteration options
 * @returns ASCII-safe string
 *
 * @example
 * transliterate("cafe\u0301 nai\u0308ve") // "cafe naive"
 * transliterate("\u00C5ngstr\u00F6m") // "Angstroem"
 */
export function transliterate(str: string, options: TransliterateOptions = {}): string {
  const { removeUnmapped = false } = options;

  let result = "";
  for (const ch of str) {
    const mapped = transliterateChar(ch);
    if (mapped !== null) {
      result += mapped;
    } else if (!removeUnmapped) {
      result += ch;
    }
    // If removeUnmapped is true and no mapping, character is dropped
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
 * removeAccents("cafe\u0301") // "cafe"
 * removeAccents("nai\u0308ve") // "naive"
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
        const replacement = transliterateChar(original);
        if (replacement !== null && replacement !== original) {
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
