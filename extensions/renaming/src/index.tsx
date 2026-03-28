import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Form,
  ActionPanel,
  Action,
  closeMainWindow,
  popToRoot,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  getSelectedFinderItems,
} from "@raycast/api";
import path, { dirname } from "path";
import { getFileInfo, checkConflicts } from "./lib/files";
import { saveToHistory, undoLastRename } from "./lib/history";
import { withProgress } from "./lib/progress";
import { transformCase, CASE_STYLES, getCaseStyleLabel } from "./lib/case-transform";
import { PREVIEW_LIMIT } from "./lib/constants";
import { UndoAction } from "./components/undo-action";
import { ResultsView } from "./components/results-view";
import { getUserFriendlyErrorMessage } from "./lib/errors";
import { CaseStyle, type RenameOperation, type FileInfo, type RenameResult } from "./types";

export default function Command() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState<string>("");
  const [prefix, setPrefix] = useState<string>("");
  const [suffix, setSuffix] = useState<string>("");
  const [preserveName, setPreserveName] = useState<boolean>(false);
  const [separator, setSeparator] = useState<string>("_");
  const [indexSeparator, setIndexSeparator] = useState<string>("-");
  const [caseStyle, setCaseStyle] = useState<CaseStyle>(CaseStyle.UNCHANGED);
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

  const handleSeparatorChange = async (separatorType: "separator" | "indexSeparator", value: string) => {
    if (value.includes("/")) {
      if (separatorType === "separator") {
        setSeparator("");
      } else {
        setIndexSeparator("");
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid separator",
        message: "The separator cannot be a forward slash (/)",
      });
    } else {
      if (separatorType === "separator") {
        setSeparator(value);
      } else {
        setIndexSeparator(value);
      }
    }
  };

  const generateNewName = useCallback(
    (file: FileInfo, index: number): string => {
      const prefixWithSep = prefix ? `${prefix}${separator}` : "";
      const suffixWithSep = suffix ? `${separator}${suffix}` : "";

      let newBaseName: string;
      if (preserveName) {
        newBaseName = `${prefixWithSep}${file.baseName}${suffixWithSep}`;
      } else {
        newBaseName = `${prefixWithSep}${newName}${indexSeparator}${index + 1}${suffixWithSep}`;
      }

      // Apply case transformation
      newBaseName = transformCase(newBaseName, caseStyle);

      return file.isDirectory || !file.extension ? newBaseName : `${newBaseName}${file.extension}`;
    },
    [newName, prefix, suffix, preserveName, separator, indexSeparator, caseStyle],
  );

  // Preview
  const preview = useMemo(() => {
    if (files.length === 0) return "";
    const count = Math.min(files.length, PREVIEW_LIMIT);
    const lines: string[] = [];
    for (let i = 0; i < count; i++) {
      const file = files[i]!;
      const newFileName = generateNewName(file, i);
      lines.push(`${file.name} → ${newFileName}`);
    }
    if (files.length > count) {
      lines.push(`...and ${files.length - count} more files`);
    }
    return lines.join("\n");
  }, [files, generateNewName]);

  const renameFiles = async () => {
    if (files.length === 0) return;

    // Build operations
    const operations: RenameOperation[] = files.map((file, index) => {
      const newFileName = generateNewName(file, index);
      return {
        oldPath: file.path,
        newName: newFileName,
        newPath: path.join(dirname(file.path), newFileName),
      };
    });

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
      const confirmed = await confirmAlert({
        title: `Rename ${operations.length} Files?`,
        message: preview,
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
    setPendingOperations(operations);

    try {
      const description = preserveName
        ? `Added prefix/suffix to ${operations.length} file${operations.length !== 1 ? "s" : ""}`
        : `Renamed ${operations.length} file${operations.length !== 1 ? "s" : ""} to "${newName}"`;

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
          <Action.SubmitForm title="Rename" onSubmit={renameFiles} />
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

          {files.length > 1 && (
            <Form.Checkbox
              id="preserveName"
              label="Preserve base name"
              value={preserveName}
              onChange={setPreserveName}
            />
          )}

          {!preserveName && (
            <Form.TextField
              id="newName"
              title="New Name"
              value={newName}
              onChange={setNewName}
              placeholder="Enter new name"
            />
          )}

          <Form.TextField id="prefix" title="Prefix" value={prefix} onChange={setPrefix} placeholder="Enter prefix" />
          <Form.TextField id="suffix" title="Suffix" value={suffix} onChange={setSuffix} placeholder="Enter suffix" />
          <Form.TextField
            id="separator"
            title="Separator"
            value={separator}
            onChange={(newValue) => handleSeparatorChange("separator", newValue)}
            placeholder="Enter separator"
          />

          {!preserveName && (
            <Form.TextField
              id="indexSeparator"
              title="Index Separator"
              value={indexSeparator}
              onChange={(newValue) => handleSeparatorChange("indexSeparator", newValue)}
              placeholder="Enter Index separator"
            />
          )}

          <Form.Dropdown
            id="caseStyle"
            title="Case Style"
            value={caseStyle}
            onChange={(v) => setCaseStyle(v as CaseStyle)}
          >
            {CASE_STYLES.map((style) => (
              <Form.Dropdown.Item key={style} value={style} title={getCaseStyleLabel(style)} />
            ))}
          </Form.Dropdown>

          <Form.Separator />
          <Form.Description title="Preview" text={preview || "Configure rename options above"} />
        </>
      )}
    </Form>
  );
}
