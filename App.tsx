import React, { useState } from 'react';
import { ConfigForm } from './components/ConfigForm';
import { Dashboard } from './components/Dashboard';
import { GoogleSheetService } from './services/googleSheets';
import { readExcelFile } from './services/excelReader';
import { processSheetData } from './services/parser';
import { AppConfig, DataStatus, ParsedRecord } from './types';

function App() {
  const [status, setStatus] = useState<DataStatus>(DataStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [sheetTitle, setSheetTitle] = useState<string>('Unknown Sheet');

  const handleConnect = async (config: AppConfig) => {
    setStatus(DataStatus.FETCHING_META);
    setError(null);

    try {
      let rawDataMap: Record<string, string[][]> = {};
      let title = "Unknown Sheet";

      // --- LOGIC BRANCHING ---
      if (config.mode === 'local' && config.file) {
         // Local Mode
         setStatus(DataStatus.FETCHING_ROWS); // Simulate fetching
         const result = await readExcelFile(config.file);
         rawDataMap = result.data;
         title = result.title;
      } 
      else if (config.mode === 'cloud' && config.apiKey && config.spreadsheetId) {
         // Cloud Mode
         const service = new GoogleSheetService(config.apiKey, config.spreadsheetId);
         
         // 1. Fetch Metadata
         const metadata = await service.fetchMetadata();
         title = metadata.properties.title;
         const sheetNames = metadata.sheets.map(s => s.properties.title);

         if (sheetNames.length === 0) throw new Error('No sheets found in this spreadsheet.');

         // 2. Fetch All Data
         setStatus(DataStatus.FETCHING_ROWS);
         rawDataMap = await service.fetchAllSheetValues(sheetNames);
      } else {
         throw new Error("Invalid Configuration");
      }

      setSheetTitle(title);

      // 3. Parse Data (Common Pipeline)
      setStatus(DataStatus.PARSING);
      
      // Use setTimeout to allow UI to update to "Parsing" state before heavy synchronous JS op
      setTimeout(() => {
        try {
          const allRecords: ParsedRecord[] = [];
          
          Object.entries(rawDataMap).forEach(([sheetName, rows]) => {
            const sheetRecords = processSheetData(sheetName, rows);
            allRecords.push(...sheetRecords);
          });

          setRecords(allRecords);
          setStatus(DataStatus.READY);
        } catch (e: any) {
           setError('Parsing error: ' + e.message);
           setStatus(DataStatus.ERROR);
        }
      }, 100);

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

  // Loading Overlay for intermediate states
  if (status === DataStatus.FETCHING_META || status === DataStatus.FETCHING_ROWS || status === DataStatus.PARSING) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold mb-2">
            {status === DataStatus.FETCHING_META && 'Connecting...'}
            {status === DataStatus.FETCHING_ROWS && 'Reading Data...'}
            {status === DataStatus.PARSING && 'Indexing Keys...'}
        </h2>
        <p className="text-slate-400">Please wait while we process the Delta Information.</p>
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