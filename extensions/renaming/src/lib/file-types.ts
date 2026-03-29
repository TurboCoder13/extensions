/**
 * File type detection using extension mapping
 * Uses a Map<string, FileCategory> instead of mime-types package
 */

import { Icon, Color } from "@raycast/api";
import { extname } from "path";
import { isPreviewableImage as osIsPreviewable } from "./os-capabilities";

/**
 * File categories with their display properties
 */
export const FILE_CATEGORIES = {
  image: { icon: Icon.Image, color: Color.Purple, label: "Image" },
  video: { icon: Icon.Video, color: Color.Red, label: "Video" },
  audio: { icon: Icon.Music, color: Color.Orange, label: "Audio" },
  document: { icon: Icon.Document, color: Color.Blue, label: "Document" },
  spreadsheet: { icon: Icon.Document, color: Color.Green, label: "Spreadsheet" },
  presentation: { icon: Icon.Document, color: Color.Orange, label: "Presentation" },
  archive: { icon: Icon.Box, color: Color.Yellow, label: "Archive" },
  code: { icon: Icon.Code, color: Color.Green, label: "Code" },
  text: { icon: Icon.Text, color: Color.SecondaryText, label: "Text" },
  font: { icon: Icon.Text, color: Color.Purple, label: "Font" },
  executable: { icon: Icon.Terminal, color: Color.Red, label: "Executable" },
  data: { icon: Icon.Document, color: Color.Blue, label: "Data" },
} as const;

export type FileCategory = keyof typeof FILE_CATEGORIES;

/**
 * Extension-to-category mapping.
 * Extensions are stored without the leading dot, all lowercase.
 */
const EXTENSION_TO_CATEGORY = new Map<string, FileCategory>([
  // Images
  ["jpg", "image"],
  ["jpeg", "image"],
  ["png", "image"],
  ["gif", "image"],
  ["webp", "image"],
  ["bmp", "image"],
  ["svg", "image"],
  ["ico", "image"],
  ["heic", "image"],
  ["heif", "image"],
  ["tiff", "image"],
  ["tif", "image"],
  ["avif", "image"],
  ["raw", "image"],
  ["cr2", "image"],
  ["nef", "image"],
  ["arw", "image"],
  ["dng", "image"],
  ["psd", "image"],

  // Video
  ["mp4", "video"],
  ["mov", "video"],
  ["avi", "video"],
  ["mkv", "video"],
  ["webm", "video"],
  ["wmv", "video"],
  ["flv", "video"],
  ["m4v", "video"],
  ["mpg", "video"],
  ["mpeg", "video"],
  ["3gp", "video"],
  ["ogv", "video"],
  ["ts", "video"],

  // Audio
  ["mp3", "audio"],
  ["wav", "audio"],
  ["ogg", "audio"],
  ["flac", "audio"],
  ["aac", "audio"],
  ["m4a", "audio"],
  ["wma", "audio"],
  ["aiff", "audio"],
  ["alac", "audio"],
  ["opus", "audio"],
  ["mid", "audio"],
  ["midi", "audio"],

  // Documents
  ["pdf", "document"],
  ["doc", "document"],
  ["docx", "document"],
  ["odt", "document"],
  ["rtf", "document"],
  ["pages", "document"],
  ["epub", "document"],

  // Spreadsheets
  ["xls", "spreadsheet"],
  ["xlsx", "spreadsheet"],
  ["ods", "spreadsheet"],
  ["numbers", "spreadsheet"],
  ["csv", "spreadsheet"],
  ["tsv", "spreadsheet"],

  // Presentations
  ["ppt", "presentation"],
  ["pptx", "presentation"],
  ["odp", "presentation"],
  ["key", "presentation"],

  // Archives
  ["zip", "archive"],
  ["tar", "archive"],
  ["gz", "archive"],
  ["bz2", "archive"],
  ["xz", "archive"],
  ["7z", "archive"],
  ["rar", "archive"],
  ["dmg", "archive"],
  ["iso", "archive"],

  // Code & Config
  ["js", "code"],
  ["jsx", "code"],
  ["mjs", "code"],
  ["cjs", "code"],
  ["json", "code"],
  ["xml", "code"],
  ["yaml", "code"],
  ["yml", "code"],
  ["toml", "code"],
  ["py", "code"],
  ["rb", "code"],
  ["java", "code"],
  ["kt", "code"],
  ["swift", "code"],
  ["go", "code"],
  ["rs", "code"],
  ["c", "code"],
  ["cpp", "code"],
  ["h", "code"],
  ["hpp", "code"],
  ["cs", "code"],
  ["php", "code"],
  ["lua", "code"],
  ["r", "code"],
  ["scala", "code"],
  ["html", "code"],
  ["htm", "code"],
  ["css", "code"],
  ["scss", "code"],
  ["sass", "code"],
  ["less", "code"],
  ["sh", "code"],
  ["bash", "code"],
  ["zsh", "code"],
  ["fish", "code"],
  ["ps1", "code"],
  ["bat", "code"],
  ["cmd", "code"],
  ["sql", "code"],
  ["graphql", "code"],
  ["proto", "code"],
  ["vue", "code"],
  ["svelte", "code"],

  // Text
  ["txt", "text"],
  ["md", "text"],
  ["markdown", "text"],
  ["rst", "text"],
  ["log", "text"],
  ["ini", "text"],
  ["cfg", "text"],
  ["conf", "text"],
  ["env", "text"],

  // Fonts
  ["ttf", "font"],
  ["otf", "font"],
  ["woff", "font"],
  ["woff2", "font"],
  ["eot", "font"],

  // Executables
  ["exe", "executable"],
  ["msi", "executable"],
  ["app", "executable"],
  ["pkg", "executable"],
  ["deb", "executable"],
  ["rpm", "executable"],
  ["appimage", "executable"],

  // Data
  ["sqlite", "data"],
  ["sqlite3", "data"],
  ["db", "data"],
  ["parquet", "data"],
  ["arrow", "data"],
  ["avro", "data"],
]);

/**
 * Get the file category for a file path or extension.
 * Accepts a full path (e.g., "/tmp/photo.jpg") or a bare extension (e.g., ".jpg").
 */
export function getFileCategory(filePathOrExt: string): FileCategory | null {
  // Extract extension: if the string already looks like an extension, use it directly
  const extracted = extname(filePathOrExt);
  const ext = extracted || filePathOrExt;
  const normalized = ext.startsWith(".") ? ext.slice(1).toLowerCase() : ext.toLowerCase();
  return EXTENSION_TO_CATEGORY.get(normalized) ?? null;
}

/**
 * Get icon and color for a file based on its type
 */
export function getFileTypeIcon(filePathOrExt: string): { source: Icon; tintColor?: Color } {
  const category = getFileCategory(filePathOrExt);

  if (category && category in FILE_CATEGORIES) {
    const { icon, color } = FILE_CATEGORIES[category];
    return { source: icon, tintColor: color };
  }

  return { source: Icon.Document, tintColor: Color.Blue };
}

/**
 * Get human-readable label for a file type
 */
export function getFileTypeLabel(filePathOrExt: string): string {
  const category = getFileCategory(filePathOrExt);

  if (category && category in FILE_CATEGORIES) {
    return FILE_CATEGORIES[category].label;
  }

  const extracted = extname(filePathOrExt);
  if (!extracted) return "File";
  const normalized = extracted.slice(1);
  return normalized ? normalized.toUpperCase() : "File";
}

/**
 * Check if a file is an image (by extension)
 */
export function isImage(filePathOrExt: string): boolean {
  return getFileCategory(filePathOrExt) === "image";
}

/**
 * Check if a file is a video (by extension)
 */
export function isVideo(filePathOrExt: string): boolean {
  return getFileCategory(filePathOrExt) === "video";
}

/**
 * Check if a file is audio (by extension)
 */
export function isAudio(filePathOrExt: string): boolean {
  return getFileCategory(filePathOrExt) === "audio";
}

/**
 * Check if a file is a media file (image, video, or audio)
 */
export function isMedia(filePathOrExt: string): boolean {
  return isImage(filePathOrExt) || isVideo(filePathOrExt) || isAudio(filePathOrExt);
}

/**
 * Check if a file can be previewed as an image in Raycast
 */
export function isPreviewableImage(filePathOrExt: string): boolean {
  const ext = extname(filePathOrExt).toLowerCase();
  return osIsPreviewable(ext || filePathOrExt);
}
