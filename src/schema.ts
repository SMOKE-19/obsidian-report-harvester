import * as yaml from "js-yaml";
import { cleanBasicText, splitSections } from "./markdownParser";
import { HeaderSchema, ReportSchema, SchemaDocument } from "./types";

export function loadSchemaDocument(schemaText: string): SchemaDocument {
  const parsed = yaml.load(schemaText);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Schema YAML must be an object.");
  }
  return parsed as SchemaDocument;
}

export function firstReportSchema(schemaText: string): [string, ReportSchema] {
  const doc = loadSchemaDocument(schemaText);
  const key = Object.keys(doc)[0];
  if (!key) throw new Error("Schema YAML is empty.");
  return [key, doc[key]];
}

export function buildSchemaFromTemplate(templateText: string, reportKey: string): SchemaDocument {
  const sections = splitSections(templateText, 3);
  const headers: HeaderSchema[] = Object.entries(sections).map(([header, lines], index) =>
    buildHeaderExport(header, lines, index === 0)
  );

  return {
    [reportKey]: {
      heading_level: 3,
      headers
    }
  };
}

export function dumpSchema(schema: SchemaDocument): string {
  return [
    "# Markdown 보고서에서 Excel로 내보낼 컬럼 규칙입니다.",
    "# 불필요한 export 항목은 지우고, 통째로 내보낼 헤더는 content: all을 유지합니다.",
    yaml.dump(schema, {
      noRefs: true,
      lineWidth: 1000,
      sortKeys: false
    })
  ].join("\n");
}

function buildHeaderExport(header: string, lines: string[], firstHeader: boolean): HeaderSchema {
  const bullets = topLevelBullets(lines);
  if (firstHeader && bullets.length > 0) {
    return {
      header,
      export: bullets.map((bullet) => ({
        column: bullet.key,
        key: bullet.key,
        ...(bullet.hasChildren ? { include_children: true } : {})
      }))
    };
  }

  return {
    header,
    export: [
      {
        column: header,
        content: "all"
      }
    ]
  };
}

function topLevelBullets(lines: string[]): Array<{ key: string; hasChildren: boolean }> {
  const bullets: Array<{ key: string; hasChildren: boolean }> = [];
  let current: { key: string; hasChildren: boolean } | null = null;

  for (const line of lines) {
    const match = line.match(/^(\s*)-\s+(.*)$/);
    if (!match) continue;
    const indent = match[1].length;
    const value = cleanBasicText(match[2]);
    if (indent === 0) {
      current = { key: value.split(":", 1)[0].trim(), hasChildren: false };
      bullets.push(current);
    } else if (current) {
      current.hasChildren = true;
    }
  }

  return bullets;
}
