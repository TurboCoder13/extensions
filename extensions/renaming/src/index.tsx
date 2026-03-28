import RenameCommand from "./commands/rename";
import { SelectionMode } from "./types";

export default function Command() {
  return <RenameCommand mode={SelectionMode.FILES} />;
}
