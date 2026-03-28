import { useEffect, useState, useCallback } from "react";
import {
  Form,
  ActionPanel,
  Action,
  popToRoot,
  showToast,
  Toast,
  getSelectedFinderItems,
  Icon,
  useNavigation,
} from "@raycast/api";
import { basename, dirname, join } from "path";
import { getFileInfo, batchRename } from "./lib/files";
import { validateRegexPattern } from "./lib/regex-safety";
import { ResultsView } from "./components/results-view";
import { log } from "./lib/logger";
import type { FileInfo, RenameOperation } from "./types";

export default function Command() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [replaceCharacter, setReplaceCharacter] = useState<string>("");
  const [newCharacter, setNewCharacter] = useState<string>("");
  const [useRegex, setUseRegex] = useState<boolean>(false);
  const [regexError, setRegexError] = useState<string | undefined>(undefined);
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
      log.rename.error("Failed to fetch selected files", error);
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

  // Validate regex pattern when it changes
  useEffect(() => {
    if (useRegex && replaceCharacter) {
      const error = validateRegexPattern(replaceCharacter);
      setRegexError(error ?? undefined);
    } else {
      setRegexError(undefined);
    }
  }, [useRegex, replaceCharacter]);

  const computeNewName = useCallback(
    (file: FileInfo): string => {
      if (!replaceCharacter) return file.name;

      let newBaseName: string;
      if (useRegex) {
        try {
          const regex = new RegExp(replaceCharacter, "g");
          newBaseName = file.baseName.replace(regex, newCharacter);
        } catch {
          // Invalid regex - return unchanged
          return file.name;
        }
      } else {
        newBaseName = file.baseName.replaceAll(replaceCharacter, newCharacter);
      }

      return file.isDirectory || !file.extension ? newBaseName : `${newBaseName}${file.extension}`;
    },
    [replaceCharacter, newCharacter, useRegex],
  );

  const renameFiles = useCallback(async () => {
    if (regexError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid regex pattern",
        message: regexError,
      });
      return;
    }

    try {
      const operations: RenameOperation[] = files.map((file) => {
        const generatedName = computeNewName(file);
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
          title: `Replaced in ${successCount} file${successCount !== 1 ? "s" : ""} successfully`,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: `${successCount} replaced, ${failCount} failed`,
        });
      }

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
      log.rename.error("Failed to replace file characters", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to replace file characters",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [files, computeNewName, regexError, push, pop]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Replace" icon={Icon.Pencil} onSubmit={renameFiles} />
        </ActionPanel>
      }
    >
      {files.length > 0 && (
        <>
          <Form.TextField
            id="replaceCharacter"
            title={useRegex ? "Regex Pattern" : "Character to Replace"}
            value={replaceCharacter}
            onChange={setReplaceCharacter}
            placeholder={useRegex ? "Enter regex pattern" : "Enter character to replace"}
            error={regexError}
          />
          <Form.TextField
            id="newCharacter"
            title={useRegex ? "Replacement" : "New Character"}
            value={newCharacter}
            onChange={setNewCharacter}
            placeholder={useRegex ? "Enter replacement (supports $1, $2...)" : "Enter new character"}
          />
          <Form.Checkbox id="useRegex" label="Use Regular Expression" value={useRegex} onChange={setUseRegex} />
        </>
      )}
      <Form.Separator />
    </Form>
  );
}
