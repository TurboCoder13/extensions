/**
 * Shared Undo action component
 */

import { Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { getUndoCount, undoLastRename } from "../lib/history";

interface UndoActionProps {
  onUndo?: () => void;
}

/**
 * Action that shows undo option with count
 */
export function UndoAction({ onUndo }: UndoActionProps) {
  const [undoCount, setUndoCount] = useState(0);

  useEffect(() => {
    getUndoCount()
      .then(setUndoCount)
      .catch((err) => console.error("Failed to get undo count:", err));
  }, []);

  if (undoCount === 0) return null;

  return (
    <Action
      title={`Undo Last Rename (${undoCount})`}
      icon={Icon.Undo}
      shortcut={{ modifiers: ["cmd"], key: "z" }}
      onAction={async () => {
        try {
          const success = await undoLastRename();
          if (success) {
            // Reload actual count -- partial undos may keep the entry
            const newCount = await getUndoCount();
            setUndoCount(newCount);
            onUndo?.();
          }
        } catch (err) {
          console.error("Undo failed:", err);
        }
      }}
    />
  );
}
