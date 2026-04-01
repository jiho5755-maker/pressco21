const DEFAULT_TITLE = "Untitled task";
const MAX_TITLE_LENGTH = 120;

export function deriveTaskTitle(text: string) {
  const normalized = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!normalized) {
    return DEFAULT_TITLE;
  }

  return normalized.slice(0, MAX_TITLE_LENGTH);
}
