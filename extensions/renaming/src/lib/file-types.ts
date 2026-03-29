/**
 * File type detection using file extensions
 * No external dependencies — uses a built-in extension map.
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
 * Extension-to-category mapping
 */
const EXTENSION_TO_CATEGORY: Record<string, FileCategory> = {
  // Images
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".gif": "image",
  ".bmp": "image",
  ".webp": "image",
  ".svg": "image",
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

  // Video
  ".mp4": "video",
  ".mov": "video",
  ".avi": "video",
  ".mkv": "video",
  ".webm": "video",
  ".flv": "video",
  ".wmv": "video",
  ".m4v": "video",
  ".mpg": "video",
  ".mpeg": "video",
  ".3gp": "video",
  ".ogv": "video",

  // Audio
  ".mp3": "audio",
  ".wav": "audio",
  ".flac": "audio",
  ".aac": "audio",
  ".ogg": "audio",
  ".wma": "audio",
  ".m4a": "audio",
  ".aiff": "audio",
  ".aif": "audio",
  ".opus": "audio",
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

  // Spreadsheets
  ".xls": "spreadsheet",
  ".xlsx": "spreadsheet",
  ".ods": "spreadsheet",
  ".csv": "spreadsheet",
  ".numbers": "spreadsheet",
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
  ".dmg": "archive",
  ".iso": "archive",

  // Code
  ".js": "code",
  ".jsx": "code",
  ".ts": "code",
  ".tsx": "code",
  ".py": "code",
  ".rb": "code",
  ".java": "code",
  ".c": "code",
  ".cpp": "code",
  ".h": "code",
  ".hpp": "code",
  ".cs": "code",
  ".go": "code",
  ".rs": "code",
  ".swift": "code",
  ".kt": "code",
  ".scala": "code",
  ".php": "code",
  ".r": "code",
  ".lua": "code",
  ".sh": "code",
  ".bash": "code",
  ".zsh": "code",
  ".fish": "code",
  ".html": "code",
  ".htm": "code",
  ".css": "code",
  ".scss": "code",
  ".sass": "code",
  ".less": "code",
  ".json": "code",
  ".xml": "code",
  ".yaml": "code",
  ".yml": "code",
  ".toml": "code",
  ".ini": "code",
  ".cfg": "code",
  ".conf": "code",
  ".vue": "code",
  ".svelte": "code",

  // Text
  ".txt": "text",
  ".md": "text",
  ".markdown": "text",
  ".log": "text",
  ".rst": "text",

  // Fonts
  ".ttf": "font",
  ".otf": "font",
  ".woff": "font",
  ".woff2": "font",
  ".eot": "font",

  // Executables
  ".exe": "executable",
  ".msi": "executable",
  ".app": "executable",
  ".pkg": "executable",
  ".deb": "executable",
  ".rpm": "executable",
  ".bin": "executable",

  // Data
  ".db": "data",
  ".sqlite": "data",
  ".sqlite3": "data",
  ".sql": "data",
};

/**
 * Get file category from a file path or extension string
 */
export function getFileCategory(filePathOrExt: string): FileCategory | null {
  const extracted = extname(filePathOrExt);
  const ext = extracted || filePathOrExt;
  const normalizedExt = ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return EXTENSION_TO_CATEGORY[normalizedExt] ?? null;
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
export function isPreviewableImage(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return osIsPreviewable(ext);
}
