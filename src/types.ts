export interface ExportSpec {
  header: string;
  column: string;
  key?: string;
  content?: "all" | string;
  include_children?: boolean;
}

export interface HeaderSchema {
  header: string;
  export?: Array<Omit<ExportSpec, "header">>;
}

export interface ReportSchema {
  heading_level?: number;
  headers?: HeaderSchema[];
  metadata?: {
    header: string;
    primary_keys: string[];
  };
  sections?: string[];
}

export type SchemaDocument = Record<string, ReportSchema>;

export interface MarkdownReportInput {
  path: string;
  name: string;
  text: string;
  createdAt: Date;
}

export type Row = Record<string, string>;
