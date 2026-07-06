import writeExcelFile from "write-excel-file/browser";
import type { Cell, SheetData } from "write-excel-file/browser";
import { Row } from "./types";

export async function writeXlsx(rows: Row[], columns: string[]): Promise<ArrayBuffer> {
  const sheetData: SheetData = [
    columns.map((column): Cell => ({
      value: column,
      fontWeight: "bold",
      backgroundColor: "#D9EAF7",
      align: "center",
      alignVertical: "center"
    })),
    ...rows.map((row) =>
      columns.map((column): Cell => ({
        value: row[column] ?? "",
        wrap: true,
        alignVertical: "top"
      }))
    )
  ];

  const blob = await writeExcelFile(sheetData, {
    sheet: "reports",
    columns: columns.map((column) => ({ width: estimateColumnWidth(column, rows) })),
    stickyRowsCount: 1,
    stickyColumnsCount: 1
  }).toBlob();

  return blob.arrayBuffer();
}

function estimateColumnWidth(column: string, rows: Row[]): number {
  const maxLength = rows.reduce((max, row) => {
    const value = row[column] ?? "";
    const lineMax = String(value).split(/\r?\n/).reduce((lineLength, line) => Math.max(lineLength, line.length), 0);
    return Math.max(max, lineMax);
  }, column.length);
  return Math.min(Math.max(maxLength + 2, 12), 45);
}
