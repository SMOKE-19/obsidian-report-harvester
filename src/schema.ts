import { cleanBasicText, splitSections } from "./markdownParser";
import { HeaderSchema, SchemaDocument } from "./types";

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
