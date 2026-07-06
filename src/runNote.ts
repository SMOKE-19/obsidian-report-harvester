import { buildSchemaFromTemplate } from "./schema";
import { dumpRunConfig, RunAction, RunConfig } from "./runConfig";

export function buildRunNoteMarkdown(params: {
  action: RunAction;
  reportText: string;
  reportBasename: string;
  targetFolder: string;
  includePatterns: string[];
  excludePatterns: string[];
  outputFolder: string;
  backup: boolean;
}): string {
  const schema = buildSchemaFromTemplate(params.reportText, params.reportBasename);
  const config: RunConfig = {
    action: params.action,
    target: {
      folder: params.targetFolder || "/",
      include: params.includePatterns.length > 0 ? params.includePatterns : ["*.md"],
      exclude: params.excludePatterns
    },
    schema,
    ...(params.action === "export_xlsx"
      ? { output_xlsx: outputPathFor(params.reportBasename, params.outputFolder) }
      : { backup: params.backup })
  };

  return [
    `# ${titleFor(params.action)}`,
    "",
    "```yaml",
    dumpRunConfig(config).trimEnd(),
    "```",
    ""
  ].join("\n");
}

export function runNotePathFor(reportPath: string, reportBasename: string, action: RunAction): string {
  const folder = reportPath.split("/").slice(0, -1).join("/");
  const suffix = action === "export_xlsx" ? "엑셀_추출_실행" : "frontmatter_동기화_실행";
  return [folder, `${reportBasename}_${suffix}.md`].filter(Boolean).join("/");
}

function titleFor(action: RunAction): string {
  return action === "export_xlsx" ? "보고서 Excel 추출 실행" : "보고서 Front Matter 동기화 실행";
}

function outputPathFor(reportBasename: string, outputFolder: string): string {
  return [outputFolder || "exports", `${reportBasename}_report_table.xlsx`].filter(Boolean).join("/");
}
