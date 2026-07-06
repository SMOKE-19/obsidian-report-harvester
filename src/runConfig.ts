import * as yaml from "js-yaml";
import { SchemaDocument } from "./types";

export type RunAction = "export_xlsx" | "sync_frontmatter";

export interface RunTarget {
  folder: string;
  include: string[];
  exclude: string[];
}

export interface RunConfig {
  action: RunAction;
  target: RunTarget;
  schema: SchemaDocument;
  output_xlsx?: string;
  backup?: boolean;
}

export function parseRunConfigFromMarkdown(markdown: string): RunConfig {
  const blocks = yamlCodeBlocks(markdown);
  for (const block of blocks) {
    const parsed = yaml.load(block);
    if (!isRecord(parsed) || !isRecord(parsed.report_harvester)) continue;
    return normalizeRunConfig(parsed.report_harvester);
  }
  throw new Error("No report_harvester YAML code block found.");
}

export function dumpRunConfig(config: RunConfig): string {
  return yaml.dump(
    { report_harvester: config },
    {
      noRefs: true,
      lineWidth: 1000,
      sortKeys: false
    }
  );
}

function yamlCodeBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  const pattern = /```(?:ya?ml)\s*\r?\n([\s\S]*?)\r?\n```/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

function normalizeRunConfig(raw: Record<string, unknown>): RunConfig {
  const action = raw.action;
  if (action !== "export_xlsx" && action !== "sync_frontmatter") {
    throw new Error("report_harvester.action must be export_xlsx or sync_frontmatter.");
  }

  if (!isRecord(raw.target)) {
    throw new Error("report_harvester.target is required.");
  }
  if (typeof raw.target.folder !== "string" || !raw.target.folder.trim()) {
    throw new Error("report_harvester.target.folder is required.");
  }
  if (!isRecord(raw.schema)) {
    throw new Error("report_harvester.schema is required.");
  }

  const include = stringArray(raw.target.include, ["*.md"]);
  const exclude = stringArray(raw.target.exclude, []);
  const outputXlsx = typeof raw.output_xlsx === "string" ? raw.output_xlsx : undefined;
  if (action === "export_xlsx" && !outputXlsx) {
    throw new Error("report_harvester.output_xlsx is required for export_xlsx.");
  }

  return {
    action,
    target: {
      folder: raw.target.folder,
      include,
      exclude
    },
    output_xlsx: outputXlsx,
    backup: typeof raw.backup === "boolean" ? raw.backup : true,
    schema: raw.schema as SchemaDocument
  };
}

function stringArray(value: unknown, fallback: string[]): string[] {
  if (value === undefined) return fallback;
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error("target.include and target.exclude must be string arrays.");
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
