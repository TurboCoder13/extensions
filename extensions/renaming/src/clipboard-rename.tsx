import ClipboardRenameCommand from "./commands/clipboard-rename";
import { SelectionMode } from "./types";

export default function Command() {
  return <ClipboardRenameCommand mode={SelectionMode.FILES} />;
}
