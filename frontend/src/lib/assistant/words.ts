// Turning a sentence (English or Arabic) into comparable words.

export const isArabic = (text: string) => /[؀-ۿ]/.test(text);

/** Lower case, one spelling per Arabic letter, Western digits, no signs. Numbers stay whole. */
export function clean(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[ً-ْـ]/g, "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/(\d)[,،٬](?=\d{3})/g, "$1")
    .replace(/sq\.?\s?m(?:et(?:er|re)s?)?\b|m2\b|م2/g, " sqm ")
    .replace(/a\/c/g, " ac ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9ء-ي.\-]+/g, " ")
    .replace(/\.(?!\d)/g, " ")
    .trim();
}

/** The common part of "warehouse" and "warehouses", or of "مستودع" and "المستودعات". */
export function stem(word: string): string {
  if (isArabic(word)) {
    let w = word.replace(/^(وال|بال|فال|كال|لل|ال)(?=.{3})/, "");
    if (w === word) w = w.replace(/^[وبل](?=.{4})/, "");
    return w
      .replace(/(ات|ين|ون|يه)$/, (end) => (w.length - end.length >= 3 ? "" : end))
      .replace(/[هاي]$/, (end) => (w.length > 3 ? "" : end));
  }
  let w = word.replace(/^al-?(?=[a-z]{4})/, "");
  if (w.length > 4) w = w.replace(/ies$/, "y");
  if (w.length > 3 && !w.endsWith("ss")) w = w.replace(/s$/, "");
  return w;
}

export const words = (text: string): string[] =>
  clean(text)
    .split(/[\s\-]+/)
    .filter(Boolean)
    .map(stem);

/** How many letters must change to turn one word into the other, up to 2. */
function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return row[b.length];
}

/** Same word, or a small typing mistake in a long one ("wearhouse"). */
export function same(a: string, b: string): boolean {
  if (a === b) return true;
  const short = Math.min(a.length, b.length);
  if (short < 5 || a[0] !== b[0] || /\d/.test(a + b)) return false;
  return distance(a, b) <= (short >= 8 ? 2 : 1);
}

export const hasAny = (list: string[], wanted: Set<string>) => list.some((w) => wanted.has(w));

/** A set of words, ready to compare. */
export const set = (text: string) => new Set(words(text));
