const FORMULA_PREFIX = /^[=+\-@\t\r]/u;

export function escapeCsvCell(value: string): string {
  const safeValue = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  if (/[",\r\n]/u.test(safeValue)) {
    return `"${safeValue.replaceAll('"', '""')}"`;
  }
  return safeValue;
}

export function createCsv(rows: readonly (readonly string[])[]): string {
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}`;
}
