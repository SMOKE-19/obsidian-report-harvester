import { firstReportSchema, loadSchemaDocument } from "./schema";
import { ReportSchema } from "./types";

export function buildBlankMarkdown(schemaText: string, reportKey?: string): string {
  const [firstKey, firstSchema] = firstReportSchema(schemaText);
  const schema = reportKey ? selectReportSchema(schemaText, reportKey) : firstSchema;
  const headingLevel = Number(schema.heading_level ?? 3);
  const lines: string[] = [];

  for (const headerSpec of schema.headers ?? []) {
    if (lines.length > 0) lines.push("");
    lines.push(`${"#".repeat(Math.max(headingLevel, 1))} ${headerSpec.header}`, "");

    for (const exportSpec of headerSpec.export ?? []) {
      if (exportSpec.key) {
        lines.push(`- ${exportSpec.key}: `);
        if (exportSpec.include_children) lines.push("  - ");
      } else if (exportSpec.content === "all") {
        lines.push("- ");
      }
    }
  }

  if (!firstKey) throw new Error("Schema YAML is empty.");
  return `${lines.join("\n").replace(/\s+$/g, "")}\n`;
}

function selectReportSchema(schemaText: string, reportKey: string): ReportSchema {
  const doc = loadSchemaDocument(schemaText);
  if (!doc[reportKey]) throw new Error(`Report key not found: ${reportKey}`);
  return doc[reportKey];
}
