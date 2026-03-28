/**
 * Case transformation utilities
 */

import { CaseStyle } from "../types/enums";
import { CASE_STYLE_LABELS } from "./constants";

/**
 * All available case styles for dropdown
 */
export const CASE_STYLES: CaseStyle[] = Object.values(CaseStyle);

/**
 * Transform a string to the specified case style
 */
export function transformCase(str: string, style: CaseStyle): string {
  if (!str || style === CaseStyle.UNCHANGED) return str;

  switch (style) {
    case CaseStyle.UPPERCASE:
      return str.toUpperCase();

    case CaseStyle.LOWERCASE:
      return str.toLowerCase();

    case CaseStyle.TITLE_CASE:
      return toTitleCase(str);

    case CaseStyle.SENTENCE_CASE:
      return toSentenceCase(str);

    case CaseStyle.CAMEL_CASE:
      return toCamelCase(str);

    case CaseStyle.PASCAL_CASE:
      return toPascalCase(str);

    case CaseStyle.SNAKE_CASE:
      return toSnakeCase(str);

    case CaseStyle.KEBAB_CASE:
      return toKebabCase(str);

    default:
      return str;
  }
}

/**
 * Title Case: Each Word Is Capitalized
 * Uses unicode-aware word boundary matching.
 */
function toTitleCase(str: string): string {
  return str.replace(/[\p{L}\p{N}]+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

/**
 * Sentence case: Only first letter is capitalized
 */
function toSentenceCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * camelCase: firstWordLowerRestCapitalized
 */
function toCamelCase(str: string): string {
  const words = splitIntoWords(str);
  if (words.length === 0) return str;

  return words
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * PascalCase: EachWordCapitalized
 */
function toPascalCase(str: string): string {
  const words = splitIntoWords(str);
  if (words.length === 0) return str;
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
}

/**
 * snake_case: words_separated_by_underscores
 */
function toSnakeCase(str: string): string {
  const words = splitIntoWords(str);
  if (words.length === 0) return str;
  return words.map((word) => word.toLowerCase()).join("_");
}

/**
 * kebab-case: words-separated-by-hyphens
 */
function toKebabCase(str: string): string {
  const words = splitIntoWords(str);
  if (words.length === 0) return str;
  return words.map((word) => word.toLowerCase()).join("-");
}

/**
 * Split a string into words, handling various formats.
 * Uses unicode-aware patterns so accented/international characters are preserved.
 */
function splitIntoWords(str: string): string[] {
  // Handle camelCase/PascalCase by inserting spaces before capitals
  const withSpaces = str.replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2");

  // Split on characters that are not letters, digits, or combining marks
  const words = withSpaces.split(/[^\p{L}\p{N}\p{M}]+/u).filter((word) => word.length > 0);

  return words;
}

/**
 * Get human-readable label for case style
 */
export function getCaseStyleLabel(style: CaseStyle): string {
  return CASE_STYLE_LABELS[style];
}
