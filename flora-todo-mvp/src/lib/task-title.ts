const DEFAULT_TITLE = "Untitled task";
const MAX_TITLE_LENGTH = 80;

const leadingNoisePatterns = [
  /^(?:메모|회의 메모|미팅 메모|정리|할 일|업무)\s*[:：-]\s+/,
  /^(오늘|내일|모레)\s+(?:할 일|일정|업무|체크리스트)\s*[:：-]\s+/,
  /^(이번주|다음주|이번주말|다음주말|주말)\s+(?:할 일|일정|업무|체크리스트)\s*[:：-]\s+/,
  /^(?:이번주|다음주)?\s*(월요일|화요일|수요일|목요일|금요일|토요일|일요일)\s+(?:할 일|일정|업무)\s*[:：-]\s+/,
  /^(오늘|내일|모레)\s+/,
  /^(이번주말|다음주말|주말)\s+/,
  /^(이번주|다음주)\s+/,
  /^(?:이번주|다음주)?\s*(월요일|화요일|수요일|목요일|금요일|토요일|일요일)\s*(전까지|까지|전에)\s+/,
  /^(이번주|다음주)\s+(월요일|화요일|수요일|목요일|금요일|토요일|일요일)\s+/,
  /^(월요일|화요일|수요일|목요일|금요일|토요일|일요일)\s+/,
  /^(?:(\d{4})년\s*)?\d{1,2}월\s*\d{1,2}일\s+/,
  /^\d{4}-\d{1,2}-\d{1,2}\s+/,
  /^\d{1,2}\.\d{1,2}\s+/,
  /^\d{1,2}\/\d{1,2}\s+/,
  /^(오전|오후)\s*\d{1,2}시(?:\s*\d{1,2}분?)?\s+/,
  /^(오전 중|오후 중|오전에|오후에|점심|저녁|밤)\s+/,
  /^(전까지|까지|안에|전에)\s+/,
  /^(까지|안에|전에)\s+/,
];

function normalizeText(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripLeadingNoise(text: string) {
  let stripped = text;
  let changed = true;

  while (changed) {
    changed = false;

    for (const pattern of leadingNoisePatterns) {
      const next = stripped.replace(pattern, "").trim();
      if (next !== stripped) {
        stripped = next;
        changed = true;
      }
    }
  }

  return stripped;
}

export function deriveTaskTitle(text: string) {
  const normalized = normalizeText(text);

  if (!normalized) {
    return DEFAULT_TITLE;
  }

  const cleaned = stripLeadingNoise(normalized);
  const title = cleaned.length >= 4 ? cleaned : normalized;

  return title.slice(0, MAX_TITLE_LENGTH);
}
