import { ParsedRecord } from '../types';

// We inline the worker code to avoid bundler complexity.
// This worker now loads the XLSX library via CDN and handles the entire ETL process.
const workerCode = `
  // Load SheetJS (xlsx) from CDN synchronously inside the worker
  importScripts('https://cdn.sheetjs.com/xlsx-0.18.5/package/dist/xlsx.full.min.js');

  self.onmessage = function(e) {
    try {
      const { buffer, fileTitle } = e.data;
      const records = [];

      // 1. Parse Excel File (Heavy CPU task, now off-main-thread)
      // type: 'array' works with ArrayBuffer
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Helper function for Key Parsing
      const parseKey = (rawKey, sheetTitle, index) => {
        if (!rawKey || typeof rawKey !== 'string') return null;
        const parts = rawKey.split('.');
        if (parts.length < 3) {
          return {
            id: sheetTitle + '-' + index,
            originalKey: rawKey,
            taskName: sheetTitle,
            templateName: rawKey,
            brandId: 'Unknown',
            locale: null,
            rawParts: parts,
          };
        }
        let corePart = parts.find(p => p.includes('__'));
        if (!corePart) {
          corePart = parts[3] || parts[parts.length - 1];
        }
        const segmentParts = corePart.split('__');
        const templateName = segmentParts[0];
        const brandIdMatch = segmentParts.find(s => /^\\d{4}$/.test(s));
        const brandId = brandIdMatch || 'Unknown';
        const possibleLocale = segmentParts[segmentParts.length - 1];
        const locale = possibleLocale !== brandId && possibleLocale !== templateName ? possibleLocale : null;

        return {
          id: sheetTitle + '-' + index,
          originalKey: rawKey,
          taskName: sheetTitle,
          templateName: templateName,
          brandId: brandId,
          locale: locale,
          rawParts: parts
        };
      };

      // 2. Iterate Sheets and Parse Rows
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        
        // Use sheet_to_json with header:1 to get raw arrays [[A1, B1], [A2, B2]]
        const rows = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: "",
          raw: false 
        });

        // 3. Extract Keys
        rows.forEach((row, idx) => {
            // Column B is index 1
            const keyCell = row[1];
            if (keyCell) {
                // Prefix sheet name with file title to ensure uniqueness across multiple files
                const uniqueTaskName = fileTitle + ' :: ' + sheetName;
                const parsed = parseKey(keyCell, uniqueTaskName, idx);
                if (parsed) records.push(parsed);
            }
        });
      });

      // Send back the fully parsed records
      // We transfer ownership of the data to avoid cloning overhead if possible, 
      // but simple postMessage is fine for Objects.
      self.postMessage({ success: true, records: records });

    } catch (err) {
      self.postMessage({ success: false, error: err.message });
    }
  };
`;

/**
 * Creates a worker instance and processes a raw file buffer.
 * Returns parsed records directly.
 */
export const processFileInWorker = (fileTitle: string, buffer: ArrayBuffer): Promise<ParsedRecord[]> => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([workerCode], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = (e) => {
      const { success, records, error } = e.data;
      if (success) {
        resolve(records);
      } else {
        reject(new Error(error));
      }
      worker.terminate(); // Clean up immediately after job is done
      URL.revokeObjectURL(worker.onerror as any); // Cleanup Blob URL
    };

    worker.onerror = (e) => {
      reject(new Error("Worker error: " + e.message));
      worker.terminate();
    };

    // We pass the buffer. In advanced scenarios, we could use [buffer] as the second argument 
    // to transfer ownership, but that clears the buffer in the main thread.
    worker.postMessage({ buffer, fileTitle }, [buffer]); 
  });
};