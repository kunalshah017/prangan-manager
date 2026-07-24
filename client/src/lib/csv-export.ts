export type CsvRow = Record<
  string,
  string | number | boolean | null | undefined
>;

type SpreadsheetStyle = Record<string, unknown>;

type SpreadsheetCell = {
  v?: string | number | boolean;
  s?: SpreadsheetStyle;
};

type CsvWorksheet = Record<string, unknown>;

type CsvWorkbook = {
  sheets: Array<{ name: string; worksheet: CsvWorksheet }>;
};

const escapeCsvValue = (value: CsvRow[string]): string => {
  const rawText = value == null ? "" : String(value);
  const text = /^[=+\-@]/.test(rawText) ? `'${rawText}` : rawText;

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const buildCsv = (rows: CsvRow[]): string => {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvValue(row[header])).join(","));
  }

  return `\uFEFF${lines.join("\r\n")}\r\n`;
};

export const createCsvDownload = (rows: CsvRow[], basename: string) => ({
  content: buildCsv(rows),
  filename: `${basename}.csv`,
  type: "text/csv;charset=utf-8",
});

export const downloadCsv = (rows: CsvRow[], basename: string): void => {
  const download = createCsvDownload(rows, basename);
  downloadCsvContent(download.content, download.filename, download.type);
};

const downloadCsvContent = (
  content: string,
  filename: string,
  type = "text/csv;charset=utf-8",
): void => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const columnName = (index: number): string => {
  let value = index + 1;
  let name = "";

  while (value > 0) {
    value--;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }

  return name;
};

const parseCellAddress = (address: string) => {
  const match = /^([A-Z]+)(\d+)$/.exec(address);
  if (!match) {
    return { column: 0, row: 0 };
  }

  const column = [...match[1]].reduce(
    (value, character) => value * 26 + character.charCodeAt(0) - 64,
    0,
  );

  return { column: column - 1, row: Number(match[2]) - 1 };
};

const escapeCsvText = (value: unknown): string =>
  escapeCsvValue(value == null ? "" : String(value));

const getCellValue = (value: unknown): unknown =>
  typeof value === "object" && value !== null && "v" in value
    ? (value as SpreadsheetCell).v
    : undefined;

export const createCsvWorkbook = () => {
  const sheets: CsvWorkbook["sheets"] = [];

  return {
    utils: {
      book_new: () => ({ sheets }),
      json_to_sheet: (rows: CsvRow[]) => {
        const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
        const worksheet: CsvWorksheet = {};

        headers.forEach((header, column) => {
          worksheet[`${columnName(column)}1`] = { v: header };
        });
        rows.forEach((row, rowIndex) => {
          headers.forEach((header, column) => {
            worksheet[`${columnName(column)}${rowIndex + 2}`] = {
              v: row[header] ?? "",
            };
          });
        });

        worksheet["!ref"] =
          `A1:${columnName(Math.max(headers.length - 1, 0))}${Math.max(rows.length + 1, 1)}`;
        return worksheet;
      },
      book_append_sheet: (
        workbook: CsvWorkbook,
        worksheet: CsvWorksheet,
        name: string,
      ) => {
        workbook.sheets.push({ name, worksheet });
      },
      decode_range: (reference: string) => {
        const [start, end = start] = reference.split(":");
        const startCell = parseCellAddress(start);
        const endCell = parseCellAddress(end);

        return {
          s: { c: startCell.column, r: startCell.row },
          e: { c: endCell.column, r: endCell.row },
        };
      },
      encode_cell: ({ c, r }: { c: number; r: number }) =>
        `${columnName(c)}${r + 1}`,
    },
    writeFile: (workbook: CsvWorkbook, filename: string) => {
      const basename = filename.replace(/\.xlsx$/i, "");

      workbook.sheets.forEach(({ name, worksheet }, index) => {
        const reference =
          typeof worksheet["!ref"] === "string" ? worksheet["!ref"] : "A1:A1";
        const range = parseCellAddress(String(reference).split(":").at(-1)!);
        const rows = Array.from({ length: range.row + 1 }, (_, row) =>
          Array.from({ length: range.column + 1 }, (_, column) =>
            escapeCsvText(
              getCellValue(worksheet[`${columnName(column)}${row + 1}`]),
            ),
          ).join(","),
        );

        const sheetFilename =
          workbook.sheets.length === 1
            ? `${basename}.csv`
            : `${basename}_${String(index + 1).padStart(2, "0")}_${name.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;

        downloadCsvContent(`\uFEFF${rows.join("\r\n")}\r\n`, sheetFilename);
      });
    },
  };
};
