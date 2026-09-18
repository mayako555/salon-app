export const DEFAULT_WORDING_DICTIONARY = {
  value_appeal: ["お得", "限定", "今だけ", "off", "割引"],
  natural: ["ナチュラル", "自然", "自まつげ風"],
  bundle_style: ["束感", "韓国風束感"],
  serum_finish: ["美容液仕上げ", "美容液"],
  popular: ["人気no.1", "人気no1", "人気1位", "人気ナンバー1"],
} as const;

export type WordingCategory = keyof typeof DEFAULT_WORDING_DICTIONARY;

const normalize = (value: string): string => value.normalize("NFKC").toLowerCase();

export function extractWordingCategories(
  text: string,
  dictionary: Record<string, readonly string[]> = DEFAULT_WORDING_DICTIONARY,
): string[] {
  const normalized = normalize(text);
  return Object.entries(dictionary)
    .filter(([, keywords]) => keywords.some((keyword) => normalized.includes(normalize(keyword))))
    .map(([category]) => category);
}
