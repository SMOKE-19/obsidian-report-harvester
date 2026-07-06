import { Notice, Plugin, TFile, TFolder } from "obsidian";
import { DEFAULT_SETTINGS, ReportHarvesterSettingTab, ReportHarvesterSettings } from "./src/settings";
import { buildRows, exportSpecsFromSchemaDocument, getColumns } from "./src/extractor";
import { applyFrontmatter } from "./src/frontmatter";
import { writeXlsx } from "./src/xlsxExport";
import { COMMANDS, label, message } from "./src/i18n";
import { parseRunConfigFromMarkdown, RunConfig, RunTarget } from "./src/runConfig";
import { buildRunNoteMarkdown, runNotePathFor } from "./src/runNote";
import { ExportSpec } from "./src/types";

export default class ReportHarvesterPlugin extends Plugin {
  settings: ReportHarvesterSettings;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new ReportHarvesterSettingTab(this.app, this));

    this.addCommand({
      id: "run-current-execution-note",
      name: label(COMMANDS.runCurrentNote),
      checkCallback: (checking) => {
        const file = this.getActiveMarkdownFile();
        if (!file) return false;
        if (!checking) void this.runExecutionNote(file);
        return true;
      }
    });

    this.addCommand({
      id: "create-xlsx-execution-note-from-current-report",
      name: label(COMMANDS.createXlsxRunNote),
      checkCallback: (checking) => {
        const file = this.getActiveMarkdownFile();
        if (!file) return false;
        if (!checking) void this.createRunNoteFromReport(file, "export_xlsx");
        return true;
      }
    });

    this.addCommand({
      id: "create-frontmatter-execution-note-from-current-report",
      name: label(COMMANDS.createFrontmatterRunNote),
      checkCallback: (checking) => {
        const file = this.getActiveMarkdownFile();
        if (!file) return false;
        if (!checking) void this.createRunNoteFromReport(file, "sync_frontmatter");
        return true;
      }
    });
  }

  onunload(): void {}

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private getActiveMarkdownFile(): TFile | null {
    const file = this.app.workspace.getActiveFile();
    return file?.extension === "md" ? file : null;
  }

  private async runExecutionNote(file: TFile): Promise<void> {
    try {
      const config = parseRunConfigFromMarkdown(await this.app.vault.read(file));
      if (config.action === "export_xlsx") {
        await this.exportFromRunConfig(config);
      } else {
        await this.syncFrontmatterFromRunConfig(config);
      }
    } catch (error) {
      new Notice(`${message({ en: "Execution note failed", ko: "실행 노트 실행 실패" })}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createRunNoteFromReport(file: TFile, action: "export_xlsx" | "sync_frontmatter"): Promise<void> {
    try {
      const markdown = buildRunNoteMarkdown({
        action,
        reportText: await this.app.vault.read(file),
        reportBasename: file.basename,
        targetFolder: file.parent?.path ?? "/",
        includePatterns: splitSettingPatterns(this.settings.defaultTargetInclude),
        excludePatterns: splitSettingPatterns(this.settings.defaultTargetExclude),
        outputFolder: this.settings.defaultOutputFolder,
        backup: this.settings.createBackups
      });
      const outputPath = await this.nextAvailablePath(runNotePathFor(file.path, file.basename, action));
      await this.writeTextFile(outputPath, markdown);
      await this.app.workspace.openLinkText(outputPath, "", true);
      new Notice(`${message({ en: "Created execution note", ko: "실행 노트 생성 완료" })}: ${outputPath}`);
    } catch (error) {
      new Notice(`${message({ en: "Execution note creation failed", ko: "실행 노트 생성 실패" })}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async exportFromRunConfig(config: RunConfig): Promise<void> {
    if (!config.output_xlsx) throw new Error("output_xlsx is required.");
    const exportSpecs = exportSpecsFromSchemaDocument(config.schema);
    const files = await this.getTargetMarkdownFiles(config.target);
    const inputs = await Promise.all(files.map(async (file) => ({
      path: file.path,
      name: file.name,
      createdAt: new Date(file.stat.ctime),
      text: await this.app.vault.read(file)
    })));
    const rows = buildRows(inputs, exportSpecs);
    const buffer = await writeXlsx(rows, getColumns(exportSpecs));
    await this.writeBinaryFile(config.output_xlsx, buffer);
    new Notice(`${message({ en: `Exported ${rows.length} reports`, ko: `${rows.length}개 보고서 내보내기 완료` })}: ${config.output_xlsx}`);
  }

  private async syncFrontmatterFromRunConfig(config: RunConfig): Promise<void> {
    const exportSpecs = exportSpecsFromSchemaDocument(config.schema);
    const files = await this.getTargetMarkdownFiles(config.target);
    await this.syncFrontmatter(files, exportSpecs, config.backup ?? true);
  }

  private async syncFrontmatter(files: TFile[], exportSpecs: ExportSpec[], backup: boolean): Promise<void> {
    for (const file of files) {
      const original = await this.app.vault.read(file);
      if (backup) {
        const backupPath = `${file.path}.bak`;
        if (!this.app.vault.getAbstractFileByPath(backupPath)) {
          await this.writeTextFile(backupPath, original);
        }
      }
      const updated = applyFrontmatter({
        path: file.path,
        name: file.name,
        createdAt: new Date(file.stat.ctime),
        text: original
      }, exportSpecs);
      if (updated !== original) await this.app.vault.modify(file, updated);
    }
    new Notice(message({ en: `Synced front matter for ${files.length} report(s).`, ko: `${files.length}개 보고서 front matter 동기화 완료.` }));
  }

  private async getTargetMarkdownFiles(target: RunTarget): Promise<TFile[]> {
    const folder = target.folder === "/" ? this.app.vault.getRoot() : this.app.vault.getAbstractFileByPath(target.folder);
    if (!(folder instanceof TFolder)) {
      throw new Error(`Target folder not found: ${target.folder}`);
    }
    const files = this.collectMarkdownFiles(folder);
    return files
      .filter((file) => matchesTarget(file, folder.path, target))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  private collectMarkdownFiles(folder: TFolder): TFile[] {
    const files: TFile[] = [];
    for (const child of folder.children) {
      if (child instanceof TFile && child.extension === "md") {
        files.push(child);
      } else if (child instanceof TFolder) {
        files.push(...this.collectMarkdownFiles(child));
      }
    }
    return files;
  }

  private async writeTextFile(path: string, content: string): Promise<void> {
    await this.ensureParentFolder(path);
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, content);
    } else {
      await this.app.vault.create(path, content);
    }
  }

  private async writeBinaryFile(path: string, buffer: ArrayBuffer): Promise<void> {
    await this.ensureParentFolder(path);
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      await this.app.vault.modifyBinary(existing, buffer);
    } else {
      await this.app.vault.createBinary(path, buffer);
    }
  }

  private async ensureParentFolder(path: string): Promise<void> {
    const parent = path.split("/").slice(0, -1).join("/");
    if (parent) await this.app.vault.adapter.mkdir(parent);
  }

  private async nextAvailablePath(path: string): Promise<string> {
    if (!this.app.vault.getAbstractFileByPath(path)) return path;
    const dot = path.lastIndexOf(".");
    const stem = dot >= 0 ? path.slice(0, dot) : path;
    const ext = dot >= 0 ? path.slice(dot) : "";
    let index = 2;
    while (this.app.vault.getAbstractFileByPath(`${stem} ${index}${ext}`)) index += 1;
    return `${stem} ${index}${ext}`;
  }
}

function matchesTarget(file: TFile, rootPath: string, target: RunTarget): boolean {
  const relativePath = rootPath ? file.path.slice(rootPath.length + 1) : file.path;
  const include = target.include.length > 0 ? target.include : ["*.md"];
  return include.some((pattern) => globMatches(pattern, file.name, relativePath))
    && !target.exclude.some((pattern) => globMatches(pattern, file.name, relativePath));
}

function globMatches(pattern: string, basename: string, relativePath: string): boolean {
  const value = pattern.includes("/") ? relativePath : basename;
  return globToRegExp(pattern).test(value);
}

function globToRegExp(pattern: string): RegExp {
  let source = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];
    if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += escapeRegExp(char);
    }
  }
  return new RegExp(`^${source}$`, "i");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitSettingPatterns(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((pattern) => pattern.trim())
    .filter(Boolean);
}
