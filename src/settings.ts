import { App, PluginSettingTab, Setting } from "obsidian";
import type ReportHarvesterPlugin from "../main";
import { label, SETTINGS_TEXT } from "./i18n";

export interface ReportHarvesterSettings {
  createBackups: boolean;
  defaultTargetInclude: string;
  defaultTargetExclude: string;
  defaultOutputFolder: string;
}

export const DEFAULT_SETTINGS: ReportHarvesterSettings = {
  createBackups: true,
  defaultTargetInclude: "*.md",
  defaultTargetExclude: "readme*.md\n*_실행.md",
  defaultOutputFolder: "exports"
};

export class ReportHarvesterSettingTab extends PluginSettingTab {
  plugin: ReportHarvesterPlugin;

  constructor(app: App, plugin: ReportHarvesterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: label(SETTINGS_TEXT.title) });

    new Setting(containerEl)
      .setName(label(SETTINGS_TEXT.defaultTargetIncludeName))
      .setDesc(label(SETTINGS_TEXT.defaultTargetIncludeDesc))
      .addText((text) => text
        .setPlaceholder("*.md")
        .setValue(this.plugin.settings.defaultTargetInclude)
        .onChange(async (value) => {
          this.plugin.settings.defaultTargetInclude = value.trim() || DEFAULT_SETTINGS.defaultTargetInclude;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(label(SETTINGS_TEXT.defaultTargetExcludeName))
      .setDesc(label(SETTINGS_TEXT.defaultTargetExcludeDesc))
      .addTextArea((text) => text
        .setPlaceholder("readme*.md\n*_실행.md")
        .setValue(this.plugin.settings.defaultTargetExclude)
        .onChange(async (value) => {
          this.plugin.settings.defaultTargetExclude = value.trim() || DEFAULT_SETTINGS.defaultTargetExclude;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(label(SETTINGS_TEXT.defaultOutputFolderName))
      .setDesc(label(SETTINGS_TEXT.defaultOutputFolderDesc))
      .addText((text) => text
        .setPlaceholder("exports")
        .setValue(this.plugin.settings.defaultOutputFolder)
        .onChange(async (value) => {
          this.plugin.settings.defaultOutputFolder = value.trim().replace(/\/+$/g, "") || DEFAULT_SETTINGS.defaultOutputFolder;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(label(SETTINGS_TEXT.defaultBackupsName))
      .setDesc(label(SETTINGS_TEXT.defaultBackupsDesc))
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.createBackups)
        .onChange(async (value) => {
          this.plugin.settings.createBackups = value;
          await this.plugin.saveSettings();
        }));
  }
}
