import { formatNestedLines, normalizeBullet, cleanText, splitSections } from "./markdownParser";
import { firstReportSchema } from "./schema";
import { ExportSpec, MarkdownReportInput, ReportSchema, Row, SchemaDocument } from "./types";

export const CREATED_AT_COLUMN = "파일 생성 시각";
export const FILENAME_COLUMN = "파일명";

export function exportSpecsFromSchema(schemaText: string): ExportSpec[] {
  const [, reportSchema] = firstReportSchema(schemaText);
  return exportSpecsFromReportSchema(reportSchema);
}

export function exportSpecsFromSchemaDocument(schema: SchemaDocument): ExportSpec[] {
  const key = Object.keys(schema)[0];
  if (!key) throw new Error("Schema YAML is empty.");
  return exportSpecsFromReportSchema(schema[key]);
}

function exportSpecsFromReportSchema(reportSchema: ReportSchema): ExportSpec[] {
  if (reportSchema.headers) {
    return reportSchema.headers.flatMap((headerSpec) =>
      (headerSpec.export ?? []).map((exportSpec) => ({
        header: headerSpec.header,
        ...exportSpec
      }))
    );
  }

  if (reportSchema.metadata && reportSchema.sections) {
    const metadataSpecs = reportSchema.metadata.primary_keys.map((key) => ({
      header: reportSchema.metadata!.header,
      column: key,
      key,
      include_children: true
    }));
    const sectionSpecs = reportSchema.sections.map((section) => ({
      header: section,
      column: section,
      content: "all"
    }));
    return [...metadataSpecs, ...sectionSpecs];
  }

  throw new Error("Schema must define headers or legacy metadata/sections.");
}

export function buildRows(markdownFiles: MarkdownReportInput[], exportSpecs: ExportSpec[]): Row[] {
  return markdownFiles.map((file) => {
    const headingLevel = 3;
    const sections = splitSections(file.text, headingLevel);
    const row: Row = {
      [CREATED_AT_COLUMN]: formatDate(file.createdAt),
      [FILENAME_COLUMN]: file.name
    };
    const keyedSpecsByHeader: Record<string, Record<string, ExportSpec>> = {};

    for (const spec of exportSpecs) {
      if (spec.key) {
        keyedSpecsByHeader[spec.header] ??= {};
        keyedSpecsByHeader[spec.header][spec.key] = spec;
      } else if (spec.content === "all") {
        row[spec.column] = parseSectionBody(sections[spec.header] ?? [], shouldPreserveLinks(spec));
      }
    }

    for (const [header, keySpecs] of Object.entries(keyedSpecsByHeader)) {
      Object.assign(row, parseKeyedSection(sections[header] ?? [], keySpecs));
    }

    return row;
  });
}

export function getColumns(exportSpecs: ExportSpec[]): string[] {
  return [CREATED_AT_COLUMN, FILENAME_COLUMN, ...exportSpecs.map((spec) => spec.column)];
}

export function parseSectionBody(lines: string[], preserveLinks = false): string {
  return formatNestedLines(lines, preserveLinks);
}

export function parseKeyedSection(lines: string[], keySpecs: Record<string, ExportSpec>): Row {
  const result: Row = {};
  for (const spec of Object.values(keySpecs)) result[spec.column] = "";

  let currentKey: string | null = null;
  let currentColumn: string | null = null;
  let nested: string[] = [];

  const flush = () => {
    if (!currentKey || !currentColumn || nested.length === 0) {
      nested = [];
      return;
    }
    const spec = keySpecs[currentKey];
    if (spec?.include_children) {
      const nestedText = formatNestedLines(nested, shouldPreserveLinks(spec));
      result[currentColumn] = [result[currentColumn], nestedText].filter(Boolean).join("\n").trim();
    }
    nested = [];
  };

  for (const line of lines) {
    const bullet = normalizeBullet(line, null);
    if (!bullet) continue;
    const keyMatch = bullet.value.match(/^([^:]+):\s*(.*)$/);

    if (bullet.indent === 0 && keyMatch) {
      flush();
      const key = keyMatch[1].trim();
      const spec = keySpecs[key];
      if (spec) {
        currentKey = key;
        currentColumn = spec.column;
        result[currentColumn] = cleanText(keyMatch[2], shouldPreserveLinks(spec));
      } else {
        currentKey = null;
        currentColumn = null;
      }
      continue;
    }

    if (currentKey) nested.push(line);
  }

  flush();
  return result;
}

export function shouldPreserveLinks(spec: Pick<ExportSpec, "column" | "key">): boolean {
  const column = spec.column ?? "";
  const key = spec.key ?? "";
  return column.toLowerCase().includes("link") || key.toLowerCase().includes("link") || column.includes("링크") || key.includes("링크");
}

function formatDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
