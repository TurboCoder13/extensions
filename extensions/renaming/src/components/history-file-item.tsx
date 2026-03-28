/**
 * Individual file item in history detail view (simplified -- no metadata dependencies)
 */

import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { basename, extname, dirname } from "path";

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
function getSimpleFileIcon(filePath: string): Icon {
  const ext = extname(filePath).toLowerCase();
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".heic", ".tiff"];
  const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".webm"];
  const audioExts = [".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"];
  const docExts = [".pdf", ".doc", ".docx", ".txt", ".rtf", ".md"];
  const codeExts = [".js", ".ts", ".jsx", ".tsx", ".py", ".rb", ".go", ".rs", ".swift", ".java", ".c", ".cpp", ".h"];

  if (imageExts.includes(ext)) return Icon.Image;
  if (videoExts.includes(ext)) return Icon.Video;
  if (audioExts.includes(ext)) return Icon.Music;
  if (docExts.includes(ext)) return Icon.Document;
  if (codeExts.includes(ext)) return Icon.Code;
  return Icon.Document;
}

export function HistoryFileItem({ operation, showDetail, onToggleDetail, onUndo, undoTitle }: HistoryFileItemProps) {
  const oldName = basename(operation.oldPath);
  const newName = basename(operation.newPath);
  const directory = dirname(operation.newPath);

  return (
    <List.Item
      icon={getSimpleFileIcon(operation.newPath)}
      title={oldName}
      subtitle={showDetail ? undefined : `\u2192 ${newName}`}
      accessories={showDetail ? undefined : [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green } }]}
      detail={
        <List.Item.Detail
          markdown={`## Rename Details\n\n**Original:** \`${oldName}\`\n\n**Renamed to:** \`${newName}\`\n\n**Directory:** \`${directory}\`\n\n**Old path:** \`${operation.oldPath}\`\n\n**New path:** \`${operation.newPath}\``}
        />
      }
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
