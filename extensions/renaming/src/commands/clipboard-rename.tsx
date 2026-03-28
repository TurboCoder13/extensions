/**
 * Clipboard Rename Command
 *
 * Reads names from the clipboard and maps them to selected Finder files.
 * Supports newline, tab, and comma-separated formats.
 */

import { useEffect, useState, useMemo } from "react";
import {
  Form,
  ActionPanel,
  Action,
  Icon,
  Clipboard,
  showToast,
  Toast,
  closeMainWindow,
  popToRoot,
  confirmAlert,
  Alert,
  getSelectedFinderItems,
} from "@raycast/api";
import path, { dirname } from "path";
import {
  parseClipboard,
  mapClipboardToFiles,
  getClipboardMappingStatus,
  getClipboardFormatHint,
} from "../lib/clipboard";
import { getFileInfo, checkConflicts } from "../lib/files";
import { saveToHistory, undoLastRename } from "../lib/history";
import { withProgress } from "../lib/progress";
import { UndoAction } from "../components/undo-action";
import { ResultsView } from "../components/results-view";
import { getUserFriendlyErrorMessage } from "../lib/errors";
import { log } from "../lib/logger";
import {
  ClipboardFormat,
  type FileInfo,
  type RenameOperation,
  type RenameResult,
  type ClipboardParseResult,
} from "../types";

export default function ClipboardRenameCommand() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [clipboardResult, setClipboardResult] = useState<ClipboardParseResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preserveExtension, setPreserveExtension] = useState(true);
  const [operationResults, setOperationResults] = useState<RenameResult[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load files and clipboard on mount
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        // Load selected files
        const items = await getSelectedFinderItems();
        const fileList = items.map((item) => item.path);

        if (fileList.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No files selected",
            message: "Please select files in Finder first",
          });
          popToRoot();
          return;
        }

        const fileInfos = await Promise.all(fileList.map((f) => getFileInfo(f)));
        setFiles(fileInfos);

        // Load clipboard
        const text = await Clipboard.readText();
        if (text) {
          const parsed = parseClipboard(text);
          setClipboardResult(parsed);
          if (parsed.names.length === 0) {
            await showToast({
              style: Toast.Style.Failure,
              title: "No names in clipboard",
              message: "Copy a list of names to clipboard first",
            });
          }
        } else {
          setClipboardResult({ names: [], format: ClipboardFormat.NEWLINE, hasExtensions: false });
          await showToast({
            style: Toast.Style.Failure,
            title: "Clipboard is empty",
            message: "Copy a list of names to clipboard first",
          });
        }
      } catch (error) {
        log.clipboard.error("Failed to initialize", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load",
          message: getUserFriendlyErrorMessage(error),
        });
        popToRoot();
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Compute mapping
  const mapping = useMemo(() => {
    if (!clipboardResult || files.length === 0) return [];
    return mapClipboardToFiles(files, clipboardResult.names, preserveExtension);
  }, [files, clipboardResult, preserveExtension]);

  // Status message
  const status = useMemo(() => {
    if (!clipboardResult) return null;
    return getClipboardMappingStatus(files.length, clipboardResult.names.length);
  }, [files.length, clipboardResult]);

  // Preview text
  const previewText = useMemo(() => {
    if (mapping.length === 0) return "No mappings available";
    const lines: string[] = [];
    const count = Math.min(mapping.length, 10);
    for (let i = 0; i < count; i++) {
      const m = mapping[i]!;
      if (m.hasMatch && m.newName !== m.file.name) {
        lines.push(`${m.file.name} → ${m.newName}`);
      } else {
        lines.push(`${m.file.name} (no change)`);
      }
    }
    if (mapping.length > count) {
      lines.push(`...and ${mapping.length - count} more`);
    }
    return lines.join("\n");
  }, [mapping]);

  const handleRename = async () => {
    if (mapping.length === 0 || !clipboardResult) return;

    // Build operations (only for files that will change)
    const operations: RenameOperation[] = mapping
      .filter((m) => m.hasMatch && m.newName !== m.file.name)
      .map((m) => ({
        oldPath: m.file.path,
        newName: m.newName,
        newPath: path.join(dirname(m.file.path), m.newName),
      }));

    if (operations.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No changes",
        message: "All files already have the target names",
      });
      return;
    }

    // Check for conflicts
    const conflicts = await checkConflicts(operations);
    if (conflicts.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Conflicts detected",
        message: conflicts.slice(0, 3).join("; "),
      });
      return;
    }

    // Confirm
    if (operations.length > 1) {
      const confirmed = await confirmAlert({
        title: `Rename ${operations.length} Files from Clipboard?`,
        message: previewText,
        primaryAction: {
          title: "Rename All",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
        },
      });

      if (!confirmed) return;
    }

    setIsProcessing(true);

    try {
      const noun = operations.length === 1 ? "file" : "files";
      const description = `Clipboard rename: ${operations.length} ${noun}`;

      const result = await withProgress(operations, {
        actionName: "Renaming",
        itemLabel: "file",
      });

      if (result.successfulOps.length > 0) {
        await saveToHistory(description, result.successfulOps);
      }

      setOperationResults(result.results);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Rename failed",
        message: getUserFriendlyErrorMessage(error),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = async () => {
    await closeMainWindow();
    await popToRoot();
  };

  const handleUndo = async () => {
    try {
      await undoLastRename();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Undo failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Show results view after operation completes
  if (operationResults) {
    return (
      <ResultsView results={operationResults} onClose={handleClose} onUndo={handleUndo} isLoading={isProcessing} />
    );
  }

  return (
    <Form
      isLoading={isLoading || isProcessing}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename From Clipboard" icon={Icon.Clipboard} onSubmit={handleRename} />
          <UndoAction />
        </ActionPanel>
      }
    >
      {files.length > 0 && clipboardResult && (
        <>
          <Form.Description
            title="Selected Files"
            text={`${files.length} file${files.length !== 1 ? "s" : ""} selected`}
          />

          <Form.Description
            title="Clipboard"
            text={
              clipboardResult.names.length > 0
                ? `${clipboardResult.names.length} name${clipboardResult.names.length !== 1 ? "s" : ""} found (${getClipboardFormatHint(clipboardResult.format)})`
                : "No names found in clipboard"
            }
          />

          {status && <Form.Description title="Status" text={status.message} />}

          <Form.Checkbox
            id="preserveExtension"
            label="Preserve original file extensions"
            value={preserveExtension}
            onChange={setPreserveExtension}
          />

          <Form.Separator />

          <Form.Description title="Preview" text={previewText} />
        </>
      )}
    </Form>
  );
}
