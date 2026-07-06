import { getLanguage } from "obsidian";

export interface LocalizedText {
  en: string;
  ko: string;
}

export function isKoreanLocale(): boolean {
  return getLanguage().toLowerCase().startsWith("ko");
}

export function label(text: LocalizedText): string {
  return isKoreanLocale()
    ? `${text.ko} (${text.en})`
    : `${text.en} (${text.ko})`;
}

export function message(text: LocalizedText): string {
  return isKoreanLocale() ? text.ko : text.en;
}

export const COMMANDS = {
  runCurrentNote: {
    en: "Report Harvester: Run current execution note",
    ko: "Report Harvester: 현재 실행 노트 실행"
  },
  createXlsxRunNote: {
    en: "Report Harvester: Create XLSX execution note from current report",
    ko: "Report Harvester: 현재 보고서에서 XLSX 실행 노트 생성"
  },
  createFrontmatterRunNote: {
    en: "Report Harvester: Create front matter execution note from current report",
    ko: "Report Harvester: 현재 보고서에서 front matter 실행 노트 생성"
  }
} satisfies Record<string, LocalizedText>;

export const SETTINGS_TEXT = {
  title: {
    en: "Report Harvester",
    ko: "Report Harvester"
  },
  defaultTargetIncludeName: {
    en: "Default include patterns",
    ko: "기본 포함 패턴"
  },
  defaultTargetIncludeDesc: {
    en: "Patterns inserted into new execution notes. Separate multiple patterns with new lines.",
    ko: "새 실행 노트에 입력할 포함 패턴입니다. 여러 패턴은 줄바꿈으로 구분합니다."
  },
  defaultTargetExcludeName: {
    en: "Default exclude patterns",
    ko: "기본 제외 패턴"
  },
  defaultTargetExcludeDesc: {
    en: "Patterns inserted into new execution notes to avoid readme or execution notes.",
    ko: "readme나 실행 노트를 피하기 위해 새 실행 노트에 입력할 제외 패턴입니다."
  },
  defaultOutputFolderName: {
    en: "Default XLSX output folder",
    ko: "기본 XLSX 출력 폴더"
  },
  defaultOutputFolderDesc: {
    en: "Folder inserted into generated XLSX execution notes.",
    ko: "XLSX 실행 노트 초안에 입력할 출력 폴더입니다."
  },
  defaultBackupsName: {
    en: "Back up before front matter sync",
    ko: "front matter 동기화 전 백업"
  },
  defaultBackupsDesc: {
    en: "Default backup value inserted into generated front matter execution notes.",
    ko: "front matter 실행 노트 초안에 입력할 기본 백업 값입니다."
  }
} satisfies Record<string, LocalizedText>;
