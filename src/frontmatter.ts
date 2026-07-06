import * as yaml from "js-yaml";
import { buildRows } from "./extractor";
import { ExportSpec, MarkdownReportInput } from "./types";

export function applyFrontmatter(file: MarkdownReportInput, exportSpecs: ExportSpec[]): string {
  const { data, body } = splitFrontmatter(file.text);
  const row = buildRows([file], exportSpecs)[0];
  const harvested: Record<string, string> = {};

  for (const spec of exportSpecs) {
    const value = row[spec.column];
    if (value !== "" && value !== undefined) harvested[spec.column] = value;
  }

  return `${dumpFrontmatter({ ...data, ...harvested })}${body.replace(/^\ufeff/, "")}`;
}

export function splitFrontmatter(text: string): { data: Record<string, unknown>; body: string } {
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) {
    return { data: {}, body: text };
  }

  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: text };

  const parsed = yaml.load(match[1]);
  return {
    data: parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {},
    body: text.slice(match[0].length)
  };
}

export function dumpFrontmatter(data: Record<string, unknown>): string {
  const content = yaml.dump(data, {
    noRefs: true,
    lineWidth: 1000,
    sortKeys: false
  }).trim();
  return `---\n${content}\n---\n\n`;
}
