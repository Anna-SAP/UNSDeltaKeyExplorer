import { SheetMetadata } from '../types';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

export class GoogleSheetService {
  private apiKey: string;
  private spreadsheetId: string;

  constructor(apiKey: string, spreadsheetId: string) {
    this.apiKey = apiKey;
    this.spreadsheetId = spreadsheetId;
  }

  async fetchMetadata(): Promise<SheetMetadata> {
    const url = `${BASE_URL}/${this.spreadsheetId}?key=${this.apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch spreadsheet metadata');
    }
    return response.json();
  }

  async fetchAllSheetValues(sheetNames: string[]): Promise<Record<string, string[][]>> {
    // We use batchGet to fetch multiple ranges at once to minimize HTTP round trips.
    // Ranges formatted as "SheetName!A:B" (We only strictly need B, but fetching A:B helps context if needed later)
    
    // Batch size limit exists, but usually URL length is the bottleneck. 
    // Let's chunk if there are many sheets, but for <50 sheets, one call is usually fine.
    
    const ranges = sheetNames.map(name => `ranges=${encodeURIComponent(name + '!A:C')}`).join('&');
    const url = `${BASE_URL}/${this.spreadsheetId}/values:batchGet?${ranges}&key=${this.apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch cell data');
    }
    
    const data = await response.json();
    const result: Record<string, string[][]> = {};
    
    if (data.valueRanges) {
        data.valueRanges.forEach((range: any, index: number) => {
            // valueRanges order matches the requested ranges order
            const sheetName = sheetNames[index];
            result[sheetName] = range.values || [];
        });
    }

    return result;
  }
}