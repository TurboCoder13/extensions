import AISuggestCommand from "./commands/ai-suggest";
import { SelectionMode } from "./types";

export default function Command() {
  return <AISuggestCommand mode={SelectionMode.FILES} />;
}
