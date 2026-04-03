export const DOCUMENT_TAG_SUGGESTIONS = [
  "biên bản",
  "hợp đồng",
  "bản vẽ",
  "nghiệm thu",
  "hồ sơ",
  "vật tư",
];

export function parseTags(raw: string) {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function hasTag(raw: string, tag: string) {
  const normalized = parseTags(raw).map((item) => item.toLowerCase());
  return normalized.includes(tag.toLowerCase());
}

export function toggleTag(raw: string, tag: string) {
  const current = parseTags(raw);
  const exists = current.some((item) => item.toLowerCase() === tag.toLowerCase());
  const next = exists
    ? current.filter((item) => item.toLowerCase() !== tag.toLowerCase())
    : [...current, tag];
  return next.join(", ");
}
