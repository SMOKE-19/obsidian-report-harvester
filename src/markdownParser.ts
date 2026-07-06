export interface Bullet {
  indent: number;
  value: string;
}

export function stripCommentBlocks(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}

export function cleanBasicText(text: string): string {
  let value = text.trim();
  if (value.startsWith("==") && value.endsWith("==")) {
    value = value.slice(2, -2).trim();
  }
  return value.replace(/`/g, "").trim();
}

export function stripLinkMarkup(text: string, preserveLinks = false): string {
  let value = text.replace(/!\[\[[^\]]+\]\]/g, "");
  value = value.replace(/!\[[^\]]*\]\([^)]+\)/g, "");

  if (preserveLinks) {
    value = value.replace(/\[\[[^\]]+\]\]/g, "");
    value = value.replace(/\[[^\]]+\]\(([^)]+)\)/g, "$1");
    return value;
  }

  value = value.replace(/\[\[[^\]]+\]\]/g, "");
  value = value.replace(/\[[^\]]+\]\([^)]+\)/g, "");
  value = value.replace(/https?:\/\/\S+/g, "");
  return value;
}

export function cleanText(text: string, preserveLinks = false): string {
  return stripLinkMarkup(cleanBasicText(text), preserveLinks).replace(/[ \t]+/g, " ").trim();
}

export function splitSections(text: string, headingLevel = 3): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let current: string | null = null;
  const marker = "#".repeat(Math.max(headingLevel, 1));
  const headingPattern = new RegExp(`^${escapeRegExp(marker)}\\s+(.+?)\\s*$`);

  for (const rawLine of stripCommentBlocks(text).split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/g, "");
    const heading = line.match(headingPattern);
    if (heading) {
      current = heading[1].trim();
      sections[current] = [];
      continue;
    }
    if (current !== null) sections[current].push(line);
  }

  return sections;
}

export function normalizeBullet(line: string, preserveLinks: boolean | null = false): Bullet | null {
  const match = line.match(/^(\s*)-\s+(.*)$/);
  if (!match) return null;
  const indent = match[1].length;
  const raw = match[2];
  const value = preserveLinks === null ? cleanBasicText(raw) : cleanText(raw, preserveLinks);
  return { indent, value };
}

export function formatNestedLines(lines: string[], preserveLinks = false): string {
  const bullets = lines
    .map((line) => normalizeBullet(line, preserveLinks))
    .filter((bullet): bullet is Bullet => bullet !== null);
  if (bullets.length === 0) return "";

  const firstContentIndent = Math.min(...bullets.map((bullet) => bullet.indent));
  return bullets
    .map((bullet) => {
      if (!bullet.value) return "";
      const level = Math.max(Math.floor((bullet.indent - firstContentIndent) / 2), 0);
      return `${"  ".repeat(level)}${bullet.value}`;
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
