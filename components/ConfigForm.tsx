import React, { useState, useRef } from 'react';
import { AppConfig } from '../types';
import { Key, Database, ArrowRight, AlertCircle, UploadCloud, FileSpreadsheet, X, Cloud, Plus } from 'lucide-react';

interface ConfigFormProps {
  onConnect: (config: AppConfig) => void;
  loading: boolean;
  error: string | null;
}

type TabMode = 'cloud' | 'local';

export const ConfigForm: React.FC<ConfigFormProps> = ({ onConnect, loading, error }) => {
  const [mode, setMode] = useState<TabMode>('cloud');
  
  // Cloud State
  const [sheetInput, setSheetInput] = useState('');
  const [apiKey, setApiKey] = useState('');

  // Local State
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractId = (input: string) => {
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'cloud') {
      onConnect({
        mode: 'cloud',
        spreadsheetId: extractId(sheetInput),
        apiKey: apiKey
      });
    } else {
      if (files.length === 0) return;
      onConnect({
        mode: 'local',
        files: files
      });
    }
  };

  // --- Drag & Drop Handlers ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndAddFiles = (newFiles: FileList | File[]) => {
    const validFiles: File[] = [];
    Array.from(newFiles).forEach(file => {
      // Check for duplicates
      const isDuplicate = files.some(f => f.name === file.name && f.size === file.size);
      
      if ((file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) && !isDuplicate) {
         validFiles.push(file);
      }
    });
    
    if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles]);
    } else if (Array.from(newFiles).length > 0 && files.length > 0) {
        // If user tried to add files but all were duplicates or invalid
        // logic handled silently or add toast here if needed
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
    // Reset input so same file can be selected again if needed (after delete)
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
        
        {/* Header */}
        <div className="pt-8 px-8 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <Database className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">DeltaKey Explorer</h1>
          <p className="text-slate-400">Sync, Parse, and Search Translation Keys</p>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 px-8 flex border-b border-slate-700">
            <button 
                onClick={() => setMode('cloud')}
                className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${mode === 'cloud' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <div className="flex items-center justify-center gap-2">
                    <Cloud className="w-4 h-4" /> Cloud Sync
                </div>
                {mode === 'cloud' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>}
            </button>
            <button 
                onClick={() => setMode('local')}
                className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${mode === 'local' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <div className="flex items-center justify-center gap-2">
                    <UploadCloud className="w-4 h-4" /> Local Upload
                </div>
                {mode === 'local' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>}
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-6">
          
          {mode === 'cloud' ? (
            <>
                {/* Cloud Mode Inputs */}
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                    Google Sheet URL or ID
                    </label>
                    <div className="relative mb-6">
                    <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        required
                        value={sheetInput}
                        onChange={(e) => setSheetInput(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-slate-600"
                    />
                    </div>

                    <label className="block text-sm font-medium text-slate-300 mb-2">
                    Google Cloud API Key
                    </label>
                    <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="password"
                        required
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-slate-600"
                    />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                    Key must have "Google Sheets API" enabled.
                    </p>
                </div>
            </>
          ) : (
            <>
                {/* Local Mode Input */}
                <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Upload .xlsx Files
                        </label>
                        
                        <div 
                            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer 
                            ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Plus className="w-5 h-5 text-slate-300" />
                            </div>
                            <p className="text-slate-200 font-medium mb-1 text-sm">Add files or drag & drop</p>
                            <p className="text-slate-500 text-xs">Excel Files (.xlsx) only</p>
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept=".xlsx, .xls"
                                className="hidden"
                                multiple
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                            {files.map((file, index) => (
                                <div key={`${file.name}-${index}`} className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between border border-slate-600 animate-in fade-in slide-in-from-top-2 duration-200">
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-green-900/30 rounded-lg flex items-center justify-center border border-green-500/20 shrink-0">
                                            <FileSpreadsheet className="w-4 h-4 text-green-400" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-medium text-slate-200 truncate max-w-[180px]">{file.name}</p>
                                            <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                     </div>
                                     <button 
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="p-1.5 hover:bg-slate-600 rounded-full transition-colors text-slate-400 hover:text-red-400"
                                     >
                                        <X className="w-4 h-4" />
                                     </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'local' && files.length === 0)}
            className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 ${
              loading || (mode === 'local' && files.length === 0) ? 'opacity-75 cursor-not-allowed grayscale' : ''
            }`}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Start Indexing <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};