import ReplaceCommand from "./commands/replace";
import { SelectionMode } from "./types";

export default function Command() {
  return <ReplaceCommand mode={SelectionMode.FILES} />;
}
