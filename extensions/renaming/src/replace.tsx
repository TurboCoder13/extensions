import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Form,
  ActionPanel,
  Action,
  popToRoot,
  closeMainWindow,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Icon,
  getSelectedFinderItems,
} from "@raycast/api";
import path, { dirname } from "path";
import { getFileInfo, checkConflicts } from "./lib/files";
import { saveToHistory, undoLastRename } from "./lib/history";
import { withProgress } from "./lib/progress";
import { PREVIEW_LIMIT } from "./lib/constants";
import { validateRegexPattern } from "./lib/regex-safety";
import { UndoAction } from "./components/undo-action";
import { ResultsView } from "./components/results-view";
import { getUserFriendlyErrorMessage } from "./lib/errors";
import type { RenameOperation, FileInfo, RenameResult } from "./types";

export default function Command() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replacePattern, setReplacePattern] = useState<string>("");
  const [replacement, setReplacement] = useState<string>("");
  const [useRegex, setUseRegex] = useState<boolean>(false);
  const [regexError, setRegexError] = useState<string | null>(null);
  const [operationResults, setOperationResults] = useState<RenameResult[] | null>(null);
  const [pendingOperations, setPendingOperations] = useState<RenameOperation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const getSelectedFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getSelectedFinderItems();
      const fileList = items.map((item) => item.path);

      if (fileList.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Please select at least one file or open a Finder window",
        });
        popToRoot();
        return;
      }

      const fileInfos = await Promise.all(fileList.map((f) => getFileInfo(f)));
      setFiles(fileInfos);
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch files",
        message: "Please make sure a Finder window is open and files are selected",
      });
      popToRoot();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    getSelectedFiles();
  }, [getSelectedFiles]);

  // Validate regex pattern (including ReDoS safety check)
  useEffect(() => {
    if (useRegex && replacePattern) {
      const error = validateRegexPattern(replacePattern);
      setRegexError(error);
    } else {
      setRegexError(null);
    }
  }, [replacePattern, useRegex]);

  // Generate new name with replacement applied
  const generateNewName = useCallback(
    (file: FileInfo): string => {
      if (!replacePattern) return file.name;

      try {
        let newBaseName: string;
        if (useRegex) {
          const regex = new RegExp(replacePattern, "g");
          newBaseName = file.baseName.replace(regex, replacement);
        } else {
          newBaseName = file.baseName.replaceAll(replacePattern, replacement);
        }

        return file.isDirectory ? newBaseName : `${newBaseName}${file.extension}`;
      } catch {
        return file.name;
      }
    },
    [replacePattern, replacement, useRegex],
  );

  // Preview
  const preview = useMemo(() => {
    if (files.length === 0 || !replacePattern) return [];

    const previews: string[] = [];
    const count = Math.min(files.length, PREVIEW_LIMIT);

    for (let i = 0; i < count; i++) {
      const file = files[i]!;
      const newFileName = generateNewName(file);
      if (newFileName === file.name) {
        previews.push(`${file.name} (no change)`);
      } else {
        previews.push(`${file.name} → ${newFileName}`);
      }
    }

    if (files.length > count) {
      previews.push(`...and ${files.length - count} more files`);
    }

    return previews;
  }, [files, generateNewName, replacePattern]);

  // Perform the replace operation
  const replaceCharacters = async () => {
    if (files.length === 0 || !replacePattern) return;

    if (useRegex && replacePattern) {
      const validationError = validateRegexPattern(replacePattern);
      if (validationError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid regex",
          message: validationError,
        });
        return;
      }
    }

    // Build operations list (only for files that will actually change)
    const operations: RenameOperation[] = files
      .map((file) => {
        const newFileName = generateNewName(file);
        return {
          oldPath: file.path,
          newName: newFileName,
          newPath: path.join(dirname(file.path), newFileName),
        };
      })
      .filter((op) => op.oldPath !== op.newPath);

    if (operations.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No changes",
        message: "Pattern not found in any filenames",
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

    // Confirm batch operation for multiple files
    if (operations.length > 1) {
      const previewText = preview
        .filter((p) => !p.includes("(no change)"))
        .slice(0, 5)
        .join("\n");

      const confirmed = await confirmAlert({
        title: `Replace in ${operations.length} Files?`,
        message: previewText,
        primaryAction: {
          title: "Replace All",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
        },
      });

      if (!confirmed) return;
    }

    // Perform rename with progress
    setIsProcessing(true);
    setPendingOperations(operations);

    try {
      const noun = operations.length === 1 ? "file" : "files";
      const description = `Replaced "${replacePattern}" in ${operations.length} ${noun}`;

      const result = await withProgress(operations, {
        actionName: "Replacing",
        itemLabel: "file",
      });

      if (result.successfulOps.length > 0) {
        await saveToHistory(description, result.successfulOps);
      }

      setOperationResults(result.results);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Replace failed",
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

  const handleRetryFailed = async () => {
    if (!operationResults) return;

    const failedOldPaths = new Set(operationResults.filter((r) => !r.success).map((r) => r.oldPath));
    const failedOperations = pendingOperations.filter((op) => failedOldPaths.has(op.oldPath));

    if (failedOperations.length === 0) return;

    setIsProcessing(true);

    try {
      const result = await withProgress(failedOperations, {
        actionName: "Retrying",
        itemLabel: "file",
      });

      if (result.successfulOps.length > 0) {
        await saveToHistory(`Retried ${result.successfulOps.length} file(s)`, result.successfulOps);
      }

      const newResults = operationResults.map((oldResult) => {
        if (oldResult.success) return oldResult;
        const retryResult = result.results.find((r) => r.oldPath === oldResult.oldPath);
        return retryResult || oldResult;
      });

      setOperationResults(newResults);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Retry failed",
        message: getUserFriendlyErrorMessage(error),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Show results view after operation completes
  if (operationResults) {
    const hasFailures = operationResults.some((r) => !r.success);
    return (
      <ResultsView
        results={operationResults}
        onClose={handleClose}
        onUndo={handleUndo}
        onRetryFailed={hasFailures ? handleRetryFailed : undefined}
        isLoading={isProcessing}
      />
    );
  }

  return (
    <Form
      isLoading={isLoading || isProcessing}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Replace" icon={Icon.Pencil} onSubmit={replaceCharacters} />
          <UndoAction />
        </ActionPanel>
      }
    >
      {files.length > 0 && (
        <>
          <Form.Description
            title="Selected Files"
            text={`${files.length} file${files.length !== 1 ? "s" : ""} selected`}
          />

          <Form.TextField
            id="replacePattern"
            title="Find"
            value={replacePattern}
            onChange={setReplacePattern}
            placeholder="Text or pattern to find"
          />

          <Form.TextField
            id="replacement"
            title="Replace With"
            value={replacement}
            onChange={setReplacement}
            placeholder="Replacement text (leave empty to remove)"
          />

          <Form.Checkbox
            id="useRegex"
            label="Use Regular Expression"
            info="Enable regex pattern matching (e.g., \\d+ for numbers)"
            value={useRegex}
            onChange={setUseRegex}
          />

          {regexError && <Form.Description title="Regex Error" text={regexError} />}

          <Form.Separator />

          {preview.length > 0 ? (
            <Form.Description title="Preview" text={preview.join("\n")} />
          ) : (
            <Form.Description title="Preview" text={replacePattern ? "No matches found" : "Enter a pattern to find"} />
          )}
        </>
      )}
    </Form>
  );
}
