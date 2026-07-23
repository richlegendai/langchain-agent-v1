import { FileSpreadsheet } from "lucide-react";
import { type ChangeEvent, useState } from "react";

import { Button } from "../../components/ui/button";
import { type CsvData, parseCsvText } from "./review-data";

type CsvImportProps = Readonly<{
  onImport: (reviews: string) => void;
}>;

const SELECT_CLASS =
  "min-h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)] outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[#B9DCD8]";

export function CsvImport({ onImport }: CsvImportProps) {
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [csvColumn, setCsvColumn] = useState("");

  async function handleFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (file === undefined) {
      return;
    }
    const parsed = parseCsvText(await file.text());
    setCsvData(parsed);
    setCsvColumn(parsed.headers[0] ?? "");
  }

  function applyColumn() {
    if (csvData === null || csvColumn.length === 0) {
      return;
    }
    const values = csvData.rows
      .map((row) => row[csvColumn]?.trim() ?? "")
      .filter((value) => value.length > 0);
    onImport(values.join("\n"));
  }

  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-[var(--text)]">
        <FileSpreadsheet aria-hidden="true" className="size-5 text-[var(--accent)]" />
        <span>CSV 파일 불러오기</span>
        <input accept=".csv,text/csv" className="sr-only" onChange={handleFile} type="file" />
      </label>
      {csvData === null ? null : (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <select
            aria-label="후기 CSV 열"
            className={SELECT_CLASS}
            onChange={(event) => setCsvColumn(event.target.value)}
            value={csvColumn}
          >
            {csvData.headers.map((header) => (
              <option key={header} value={header}>
                {header}
              </option>
            ))}
          </select>
          <Button onClick={applyColumn} variant="secondary">
            선택한 열 적용
          </Button>
          {csvData.errors.length === 0 ? null : (
            <p className="text-xs text-[var(--danger)] sm:col-span-2">{csvData.errors[0]}</p>
          )}
        </div>
      )}
    </div>
  );
}
