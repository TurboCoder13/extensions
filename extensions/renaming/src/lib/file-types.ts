/**
 * File type detection using extension-based lookup
 *
 * Pure extension map — no external dependencies (mime-types is NOT used).
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
 * Extensions are lowercase with leading dot.
 */
const EXTENSION_TO_CATEGORY: Record<string, FileCategory> = {
  // Images
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".gif": "image",
  ".bmp": "image",
  ".svg": "image",
  ".webp": "image",
  ".ico": "image",
  ".tiff": "image",
  ".tif": "image",
  ".heic": "image",
  ".heif": "image",
  ".avif": "image",
  ".raw": "image",
  ".cr2": "image",
  ".nef": "image",
  ".arw": "image",
  ".dng": "image",
  ".psd": "image",
  ".ai": "image",
  ".eps": "image",

  // Video
  ".mp4": "video",
  ".mov": "video",
  ".avi": "video",
  ".mkv": "video",
  ".wmv": "video",
  ".flv": "video",
  ".webm": "video",
  ".m4v": "video",
  ".mpg": "video",
  ".mpeg": "video",
  ".3gp": "video",
  ".ogv": "video",
  ".ts": "video", // Note: .ts is ambiguous; we favour video since TypeScript uses code below via override

  // Audio
  ".mp3": "audio",
  ".wav": "audio",
  ".aac": "audio",
  ".flac": "audio",
  ".ogg": "audio",
  ".wma": "audio",
  ".m4a": "audio",
  ".opus": "audio",
  ".aiff": "audio",
  ".aif": "audio",
  ".mid": "audio",
  ".midi": "audio",

  // Documents
  ".pdf": "document",
  ".doc": "document",
  ".docx": "document",
  ".odt": "document",
  ".rtf": "document",
  ".pages": "document",
  ".epub": "document",
  ".mobi": "document",

  // Spreadsheets
  ".xls": "spreadsheet",
  ".xlsx": "spreadsheet",
  ".ods": "spreadsheet",
  ".numbers": "spreadsheet",
  ".csv": "spreadsheet",
  ".tsv": "spreadsheet",

  // Presentations
  ".ppt": "presentation",
  ".pptx": "presentation",
  ".odp": "presentation",
  ".key": "presentation",

  // Archives
  ".zip": "archive",
  ".tar": "archive",
  ".gz": "archive",
  ".bz2": "archive",
  ".xz": "archive",
  ".7z": "archive",
  ".rar": "archive",
  ".tgz": "archive",
  ".tbz2": "archive",
  ".dmg": "archive",
  ".iso": "archive",

  // Code & Config
  ".js": "code",
  ".jsx": "code",
  ".mjs": "code",
  ".cjs": "code",
  ".tsx": "code",
  ".json": "code",
  ".xml": "code",
  ".yaml": "code",
  ".yml": "code",
  ".toml": "code",
  ".html": "code",
  ".htm": "code",
  ".css": "code",
  ".scss": "code",
  ".less": "code",
  ".py": "code",
  ".rb": "code",
  ".java": "code",
  ".kt": "code",
  ".swift": "code",
  ".c": "code",
  ".cpp": "code",
  ".h": "code",
  ".hpp": "code",
  ".cs": "code",
  ".go": "code",
  ".rs": "code",
  ".php": "code",
  ".lua": "code",
  ".r": "code",
  ".m": "code",
  ".mm": "code",
  ".pl": "code",
  ".sh": "code",
  ".bash": "code",
  ".zsh": "code",
  ".fish": "code",
  ".ps1": "code",
  ".bat": "code",
  ".cmd": "code",
  ".sql": "code",
  ".graphql": "code",
  ".gql": "code",
  ".wasm": "code",
  ".vue": "code",
  ".svelte": "code",
  ".astro": "code",

  // Text
  ".txt": "text",
  ".md": "text",
  ".markdown": "text",
  ".rst": "text",
  ".tex": "text",
  ".log": "text",
  ".ini": "text",
  ".cfg": "text",
  ".conf": "text",
  ".env": "text",

  // Fonts
  ".ttf": "font",
  ".otf": "font",
  ".woff": "font",
  ".woff2": "font",
  ".eot": "font",

  // Executables
  ".exe": "executable",
  ".app": "executable",
  ".pkg": "executable",
  ".deb": "executable",
  ".rpm": "executable",
  ".msi": "executable",

  // Data
  ".db": "data",
  ".sqlite": "data",
  ".sqlite3": "data",
};

// TypeScript override: .ts files alongside source code are code, not video.
// Since this extension renames files in macOS Finder, we treat .ts as video
// (MPEG transport stream) by default. Callers working with source code can
// override if needed.  The mapping above already assigns "video" to ".ts".

/**
 * Get the file category for a file path or extension string.
 *
 * Accepts a full file path (e.g., "/Users/a/photo.jpg") or
 * a bare extension (e.g., ".jpg" or "jpg").
 */
export function getFileCategory(filePathOrExt: string): FileCategory | null {
  const extracted = extname(filePathOrExt);
  const ext = extracted || (filePathOrExt.startsWith(".") ? filePathOrExt : `.${filePathOrExt}`);
  return EXTENSION_TO_CATEGORY[ext.toLowerCase()] ?? null;
}

/**
 * Get icon and color for a file based on its type
 */
export function getFileTypeIcon(filePath: string): { source: Icon; tintColor?: Color } {
  const category = getFileCategory(filePath);

  if (category && category in FILE_CATEGORIES) {
    const { icon, color } = FILE_CATEGORIES[category];
    return { source: icon, tintColor: color };
  }

  return { source: Icon.Document, tintColor: Color.Blue };
}

/**
 * Get human-readable label for a file type
 */
export function getFileTypeLabel(filePath: string): string {
  const category = getFileCategory(filePath);

  if (category && category in FILE_CATEGORIES) {
    return FILE_CATEGORIES[category].label;
  }

  const ext = extname(filePath).toLowerCase();
  return ext ? ext.slice(1).toUpperCase() : "File";
}

/**
 * Check if a file is an image (by extension)
 */
export function isImage(filePath: string): boolean {
  return getFileCategory(filePath) === "image";
}

/**
 * Check if a file is a video (by extension)
 */
export function isVideo(filePath: string): boolean {
  return getFileCategory(filePath) === "video";
}

/**
 * Check if a file is audio (by extension)
 */
export function isAudio(filePath: string): boolean {
  return getFileCategory(filePath) === "audio";
}

/**
 * Check if a file is a media file (image, video, or audio)
 */
export function isMedia(filePath: string): boolean {
  return isImage(filePath) || isVideo(filePath) || isAudio(filePath);
}

/**
 * Check if a file can be previewed as an image in Raycast
 */
export function isPreviewableImage(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return osIsPreviewable(ext);
}
