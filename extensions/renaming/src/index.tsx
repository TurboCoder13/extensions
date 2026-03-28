import { useEffect, useState, useCallback } from "react";
import { useCachedState } from "@raycast/utils";
import {
  Form,
  ActionPanel,
  Action,
  popToRoot,
  showToast,
  Toast,
  getSelectedFinderItems,
  useNavigation,
} from "@raycast/api";
import { basename, dirname, extname, join } from "path";
import { getFileInfo, batchRename } from "./lib/files";
import { validateSeparator } from "./lib/validation";
import { CaseStyle } from "./types/enums";
import { CASE_STYLE_LABELS } from "./lib/constants";
import { transformCase } from "./lib/case-transform";
import { ResultsView } from "./components/results-view";
import type { FileInfo, RenameOperation, RenameResult } from "./types";

export default function Command() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [newName, setNewName] = useState<string>("");
  const [prefix, setPrefix] = useState<string>("");
  const [suffix, setSuffix] = useState<string>("");
  const [preserveName, setPreserveName] = useCachedState<boolean>("preserveName", false);
  const [preview, setPreview] = useState<string>("");
  const [separator, setSeparator] = useState<string>("_");
  const [indexSeparator, setIndexSeparator] = useState<string>("-");
  const [caseStyle, setCaseStyle] = useState<CaseStyle>(CaseStyle.UNCHANGED);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { push, pop } = useNavigation();

  const getSelectedFiles = useCallback(async () => {
    try {
      const items = await getSelectedFinderItems();
      const paths = items.map((item) => item.path);

      if (paths.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Please select at least one file or open a Finder window",
        });
        popToRoot();
        return;
      }

      const fileInfos = await Promise.all(paths.map(getFileInfo));
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

  const handleSeparatorChange = useCallback(
    async (separatorType: "separator" | "indexSeparator", value: string) => {
      const validation = validateSeparator(value);
      if (!validation.valid) {
        if (separatorType === "separator") {
          setSeparator("");
        } else {
          setIndexSeparator("");
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid separator",
          message: validation.error,
        });
      } else {
        if (separatorType === "separator") {
          setSeparator(value);
        } else {
          setIndexSeparator(value);
        }
      }
    },
    [],
  );

  useEffect(() => {
    getSelectedFiles();
  }, [getSelectedFiles]);

  const generateNewName = useCallback(
    (index: number): string => {
      const file = files[index];
      if (!file) return "";

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
    [files, newName, prefix, suffix, preserveName, separator, indexSeparator, caseStyle],
  );

  const renameFiles = useCallback(async () => {
    try {
      const operations: RenameOperation[] = files.map((file, index) => {
        const generatedName = generateNewName(index);
        return {
          oldPath: file.path,
          newName: generatedName,
          newPath: join(dirname(file.path), generatedName),
        };
      });

      const results = await batchRename(operations);
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: `Renamed ${successCount} file${successCount !== 1 ? "s" : ""} successfully`,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: `${successCount} renamed, ${failCount} failed`,
        });
      }

      setPreserveName(false);

      push(
        <ResultsView
          results={results}
          onClose={() => {
            pop();
            popToRoot();
          }}
          onUndo={async () => {
            const undoOps: RenameOperation[] = results
              .filter((r) => r.success)
              .map((r) => ({
                oldPath: r.newPath,
                newName: basename(r.oldPath),
                newPath: r.oldPath,
              }));
            await batchRename(undoOps);
            await showToast({ style: Toast.Style.Success, title: "Undo complete" });
          }}
        />,
      );
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to rename files",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [files, generateNewName, push, pop, setPreserveName]);

  useEffect(() => {
    setPreview(generateNewName(0));
  }, [generateNewName]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={renameFiles} />
        </ActionPanel>
      }
    >
      {files.length > 1 && (
        <>
          <Form.Checkbox
            id="preserveName"
            label="Preserve base name"
            value={preserveName}
            onChange={setPreserveName}
          />
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
            onChange={(value) => handleSeparatorChange("separator", value)}
            placeholder="Enter separator"
          />
          {!preserveName && (
            <Form.TextField
              id="indexSeparator"
              title="Index Separator"
              value={indexSeparator}
              onChange={(value) => handleSeparatorChange("indexSeparator", value)}
              placeholder="Enter Index separator"
            />
          )}
          <Form.Dropdown id="caseStyle" title="Case Style" value={caseStyle} onChange={(v) => setCaseStyle(v as CaseStyle)}>
            {Object.values(CaseStyle).map((style) => (
              <Form.Dropdown.Item key={style} value={style} title={CASE_STYLE_LABELS[style]} />
            ))}
          </Form.Dropdown>
          <Form.Description title="Preview" text={preview} />
        </>
      )}
      <Form.Separator />
    </Form>
  );
}
