/**
 * Individual file item in history detail view
 * Simplified version without file metadata hooks (PR 5)
 */

import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { basename, dirname, extname } from "path";

interface HistoryFileItemProps {
  operation: { oldPath: string; newPath: string };
  showDetail: boolean;
  onToggleDetail: () => void;
  onUndo: () => Promise<void>;
  undoTitle: string;
}

/**
 * Get a simple icon based on file extension
 */
function getSimpleFileIcon(filePath: string): { source: Icon; tintColor: Color } {
  const ext = extname(filePath).toLowerCase();
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".bmp", ".tiff", ".ico"];
  const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
  const audioExts = [".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a"];
  const docExts = [".pdf", ".doc", ".docx", ".txt", ".md", ".rtf"];

  if (imageExts.includes(ext)) return { source: Icon.Image, tintColor: Color.Green };
  if (videoExts.includes(ext)) return { source: Icon.Video, tintColor: Color.Purple };
  if (audioExts.includes(ext)) return { source: Icon.Music, tintColor: Color.Orange };
  if (docExts.includes(ext)) return { source: Icon.Document, tintColor: Color.Blue };
  return { source: Icon.Finder, tintColor: Color.PrimaryText };
}

export function HistoryFileItem({ operation, showDetail, onToggleDetail, onUndo, undoTitle }: HistoryFileItemProps) {
  const oldName = basename(operation.oldPath);
  const newName = basename(operation.newPath);
  const dir = dirname(operation.newPath);

  const detailMarkdown = [
    `## Rename Details`,
    ``,
    `**Old name:** \`${oldName}\``,
    ``,
    `**New name:** \`${newName}\``,
    ``,
    `**Directory:** \`${dir}\``,
  ].join("\n");

  return (
    <List.Item
      icon={getSimpleFileIcon(operation.newPath)}
      title={oldName}
      subtitle={showDetail ? undefined : `→ ${newName}`}
      accessories={showDetail ? undefined : [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green } }]}
      detail={<List.Item.Detail markdown={detailMarkdown} />}
      actions={
        <ActionPanel>
          <Action
            title={showDetail ? "Hide Details" : "Show Details"}
            icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
            onAction={onToggleDetail}
          />
          <Action title={undoTitle} icon={Icon.Undo} shortcut={{ modifiers: ["cmd"], key: "z" }} onAction={onUndo} />
          <Action.CopyToClipboard
            title="Copy Original Name"
            content={oldName}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy New Name"
            content={newName}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard title="Copy Original Path" content={operation.oldPath} />
          <Action.CopyToClipboard title="Copy New Path" content={operation.newPath} />
          <Action.ShowInFinder path={operation.newPath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
        </ActionPanel>
      }
    />
  );
}
