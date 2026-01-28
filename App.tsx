import React, { useState } from 'react';
import { ConfigForm } from './components/ConfigForm';
import { Dashboard } from './components/Dashboard';
import { GoogleSheetService } from './services/googleSheets';
import { readFileAsBuffer } from './services/excelReader'; // Updated import
import { processFileInWorker } from './services/parsingWorker'; // Updated import
import { AppConfig, DataStatus, ParsedRecord } from './types';
import { processSheetData } from './services/parser'; // Keep for cloud fallback

function App() {
  const [status, setStatus] = useState<DataStatus>(DataStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [sheetTitle, setSheetTitle] = useState<string>('Unknown Sheet');

  const handleConnect = async (config: AppConfig) => {
    setStatus(DataStatus.FETCHING_META);
    setError(null);

    try {
      let title = "Unknown Sheet";
      const allRecords: ParsedRecord[] = [];

      // --- LOGIC BRANCHING ---
      if (config.mode === 'local' && config.files && config.files.length > 0) {
         setStatus(DataStatus.FETCHING_ROWS);
         
         const successfulFiles: string[] = [];

         // SEQUENTIAL PROCESSING
         // We iterate through files one by one to prevent spawning 50+ workers at once (which crashes browsers).
         // This also allows the UI to remain responsive between file loads.
         for (const file of config.files) {
            try {
              // 1. Read binary (Main Thread - Fast/Async)
              const { title: fTitle, buffer } = await readFileAsBuffer(file);
              
              // 2. Parse Excel & Keys (Worker Thread - Heavy)
              // We transfer the buffer to the worker, keeping main thread completely free.
              const fileRecords = await processFileInWorker(fTitle, buffer);
              
              allRecords.push(...fileRecords);
              successfulFiles.push(fTitle);

            } catch (err: any) {
              console.error(`Failed to process file ${file.name}:`, err);
              // We continue to next file even if one fails
            }
         }

         if (successfulFiles.length === 0) throw new Error("Failed to read all uploaded files.");
         title = successfulFiles.length === 1 ? successfulFiles[0] : `${successfulFiles.length} Local Files`;
         
         // Local mode logic ends here, we already have parsed records
         if (allRecords.length === 0) throw new Error("No valid keys found in the source data.");
         
         setSheetTitle(title);
         setRecords(allRecords);
         setStatus(DataStatus.READY);

      } 
      else if (config.mode === 'cloud' && config.apiKey && config.spreadsheetId) {
         // --- CLOUD MODE (Legacy Logic) ---
         const service = new GoogleSheetService(config.apiKey, config.spreadsheetId);
         const metadata = await service.fetchMetadata();
         title = metadata.properties.title;
         const sheetNames = metadata.sheets.map(s => s.properties.title);

         if (sheetNames.length === 0) throw new Error('No sheets found in this spreadsheet.');

         setStatus(DataStatus.FETCHING_ROWS);
         const rawDataMap = await service.fetchAllSheetValues(sheetNames);
         
         setSheetTitle(title);
         setStatus(DataStatus.PARSING);

         // Use setTimeout to allow UI render cycle before blocking task (Cloud parsing is still sync for now)
         setTimeout(() => {
            try {
              Object.entries(rawDataMap).forEach(([sheetName, rows]) => {
                const sheetRecords = processSheetData(sheetName, rows);
                allRecords.push(...sheetRecords);
              });

              if (allRecords.length === 0) throw new Error("No valid keys found.");
              setRecords(allRecords);
              setStatus(DataStatus.READY);
            } catch (e: any) {
              setError(e.message);
              setStatus(DataStatus.ERROR);
            }
         }, 100);
      } else {
         throw new Error("Invalid Configuration");
      }

    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An unexpected error occurred');
      setStatus(DataStatus.ERROR);
    }
  };

  // --- Render Logic ---

  if (status === DataStatus.READY) {
    return <Dashboard data={records} sheetName={sheetTitle} />;
  }

  // Loading Overlay
  if (status === DataStatus.FETCHING_META || status === DataStatus.FETCHING_ROWS || status === DataStatus.PARSING) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold mb-2">
            {status === DataStatus.FETCHING_META && 'Connecting...'}
            {status === DataStatus.FETCHING_ROWS && 'Processing Files...'}
            {status === DataStatus.PARSING && 'Finalizing Index...'}
        </h2>
        <p className="text-slate-400">
           {status === DataStatus.FETCHING_ROWS ? 'Parsing Excel data in background...' : 'Please wait...'}
        </p>
      </div>
    );
  }

  return (
    <ConfigForm 
      onConnect={handleConnect} 
      loading={status !== DataStatus.IDLE && status !== DataStatus.ERROR && status !== DataStatus.READY}
      error={error}
    />
  );
}

export default App;