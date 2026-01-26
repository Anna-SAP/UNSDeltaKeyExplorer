export interface SheetMetadata {
  spreadsheetId: string;
  properties: {
    title: string;
  };
  sheets: {
    properties: {
      sheetId: number;
      title: string;
    };
  }[];
}

export interface RawRow {
  sheetTitle: string;
  key: string;
}

export interface ParsedRecord {
  id: string; // Unique ID for React keys
  originalKey: string;
  taskName: string; // From Sheet Name
  templateName: string;
  brandId: string; // "2010", "Unspecified", etc.
  locale: string | null;
  rawParts: string[];
}

export interface AppConfig {
  mode: 'cloud' | 'local';
  apiKey?: string;
  spreadsheetId?: string;
  file?: File;
}

export enum DataStatus {
  IDLE = 'IDLE',
  FETCHING_META = 'FETCHING_META',
  FETCHING_ROWS = 'FETCHING_ROWS',
  PARSING = 'PARSING',
  READY = 'READY',
  ERROR = 'ERROR',
}

export interface Stats {
  totalKeys: number;
  totalTasks: number;
  uniqueTemplates: number;
  uniqueBrands: number;
}