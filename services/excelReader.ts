import { read, utils } from 'xlsx';

/**
 * Reads a local Excel file and returns data in the same structure 
 * as the Google Sheets API (Record<SheetName, Rows[]>).
 */
export const readExcelFile = async (file: File): Promise<{ title: string, data: Record<string, string[][]> }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("File is empty");

        const workbook = read(data, { type: 'array' });
        
        const result: Record<string, string[][]> = {};
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          // Convert sheet to JSON array of arrays (header: 1 gives us a 2D array like Google API)
          // range: 0 ensures we start from the beginning, raw: false ensures we get strings
          const json: string[][] = utils.sheet_to_json(worksheet, { 
            header: 1, 
            defval: "",
            raw: false 
          }) as string[][];
          
          result[sheetName] = json;
        });

        resolve({
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for title
          data: result
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsArrayBuffer(file);
  });
};