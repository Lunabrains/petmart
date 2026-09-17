import { format, isValid, parse } from "date-fns";

/** Cell values as they arrive from spreadsheets and PDF text. */

export function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[$€£,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return undefined;
  return Number(cleaned);
}

export function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

const DATE_FORMATS = [
  "yyyy-MM-dd",
  "yyyy/MM/dd",
  "dd/MM/yyyy",
  "d/M/yyyy",
  "dd-MM-yyyy",
  "d-M-yyyy",
  "dd.MM.yyyy",
  "d.M.yyyy",
  "d MMM yyyy",
  "d MMMM yyyy",
  "MMM d, yyyy",
  "MMMM d, yyyy",
  "MMM d yyyy",
  "yyyy-MM-dd'T'HH:mm:ss",
  "yyyy-MM-dd HH:mm",
  "dd/MM/yyyy HH:mm",
];

/** Excel stores dates as days since 1899-12-30. */
function fromExcelSerial(serial: number): Date {
  return new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86_400_000);
}

/** Returns `YYYY-MM-DD`, or undefined when the value is not a date. */
export function toISODate(value: unknown): string | undefined {
  if (value instanceof Date) return isValid(value) ? format(value, "yyyy-MM-dd") : undefined;
  if (typeof value === "number") {
    if (value < 20_000 || value > 80_000) return undefined;
    const d = fromExcelSerial(value);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text) return undefined;
  for (const pattern of DATE_FORMATS) {
    const parsed = parse(text, pattern, new Date());
    if (isValid(parsed) && parsed.getFullYear() > 2000 && parsed.getFullYear() < 2100) return format(parsed, "yyyy-MM-dd");
  }
  return undefined;
}

/** The first date written anywhere in a block of text. */
export function findDateInText(text: string): string | undefined {
  const candidates = text.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{1,2} [A-Z][a-z]{2,8} \d{4}|[A-Z][a-z]{2,8} \d{1,2}, \d{4})\b/g) ?? [];
  for (const c of candidates) {
    const iso = toISODate(c);
    if (iso) return iso;
  }
  return undefined;
}
