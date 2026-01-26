import React, { useState, useMemo } from 'react';
import { ParsedRecord, Stats } from '../types';
import { Search, Filter, Layers, LayoutGrid, FileText, Hash, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  data: ParsedRecord[];
  sheetName: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, sheetName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('All');
  const [selectedTask, setSelectedTask] = useState<string>('All');

  // --- Statistics Calculation ---
  const stats: Stats = useMemo(() => {
    const brands = new Set(data.map(d => d.brandId));
    const templates = new Set(data.map(d => d.templateName));
    const tasks = new Set(data.map(d => d.taskName));
    return {
      totalKeys: data.length,
      totalTasks: tasks.size,
      uniqueBrands: brands.size,
      uniqueTemplates: templates.size
    };
  }, [data]);

  const uniqueBrands = useMemo(() => Array.from(new Set(data.map(d => d.brandId))).sort(), [data]);
  const uniqueTasks = useMemo(() => Array.from(new Set(data.map(d => d.taskName))).sort(), [data]);

  // --- Filtering Logic (The Search Engine) ---
  const filteredData = useMemo(() => {
    const lowerTerm = searchTerm.toLowerCase();
    return data.filter(item => {
      const matchesSearch = item.templateName.toLowerCase().includes(lowerTerm) || 
                            item.originalKey.toLowerCase().includes(lowerTerm);
      const matchesBrand = brandFilter === 'All' || item.brandId === brandFilter;
      const matchesTask = selectedTask === 'All' || item.taskName === selectedTask;
      return matchesSearch && matchesBrand && matchesTask;
    });
  }, [data, searchTerm, brandFilter, selectedTask]);

  // --- Grouping for View ---
  const groupedResults = useMemo(() => {
    const groups: Record<string, ParsedRecord[]> = {};
    filteredData.forEach(item => {
        // Group by Template Name + Brand Combination
        const key = `${item.templateName}__${item.brandId}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });
    return groups;
  }, [filteredData]);

  // --- Chart Data ---
  const chartData = useMemo(() => {
     const counts: Record<string, number> = {};
     data.forEach(d => {
         counts[d.brandId] = (counts[d.brandId] || 0) + 1;
     });
     return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
  }, [data]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="text-blue-500" />
            {sheetName}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Delta Information Indexer</p>
        </div>
        <div className="flex gap-4 text-sm">
             <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                <span className="text-slate-400">Total Keys</span>
                <div className="text-xl font-bold text-white">{stats.totalKeys.toLocaleString()}</div>
             </div>
             <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                <span className="text-slate-400">Unique Templates</span>
                <div className="text-xl font-bold text-blue-400">{stats.uniqueTemplates.toLocaleString()}</div>
             </div>
             <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 hidden sm:block">
                <span className="text-slate-400">Brands</span>
                <div className="text-xl font-bold text-purple-400">{stats.uniqueBrands}</div>
             </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Search & Controls */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-sm sticky top-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Filter className="w-5 h-5 text-blue-500" /> Filters
                </h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Template Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search template name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-white placeholder-slate-600"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Brand ID</label>
                        <select 
                            value={brandFilter}
                            onChange={(e) => setBrandFilter(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-white"
                        >
                            <option value="All">All Brands</option>
                            {uniqueBrands.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">Task (Sheet)</label>
                        <select 
                            value={selectedTask}
                            onChange={(e) => setSelectedTask(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-white"
                        >
                            <option value="All">All Tasks</option>
                            {uniqueTasks.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-700">
                    <h3 className="text-xs uppercase font-bold text-slate-500 mb-4">Top Brands</h3>
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <XAxis dataKey="name" hide />
                                <YAxis hide />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-3">
             <div className="flex items-center justify-between mb-4">
                 <h2 className="text-xl font-semibold text-slate-200">
                     Results 
                     <span className="ml-2 text-sm font-normal text-slate-500">
                         {Object.keys(groupedResults).length} templates found across {filteredData.length} records
                     </span>
                 </h2>
             </div>

             <div className="space-y-4">
                 {Object.keys(groupedResults).length === 0 ? (
                     <div className="text-center py-20 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
                         <div className="text-slate-500 text-lg">No matching records found</div>
                         <p className="text-slate-600 text-sm">Try adjusting your filters</p>
                     </div>
                 ) : (
                     Object.entries(groupedResults).map(([groupKey, rawItems]) => {
                         const items = rawItems as ParsedRecord[];
                         const head = items[0];
                         return (
                            <div key={groupKey} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-sm transition-all hover:border-slate-600">
                                {/* Card Header */}
                                <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg leading-tight">{head.templateName}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-mono bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                                                    Brand: {head.brandId}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Frequency</div>
                                        <div className="text-2xl font-mono text-slate-300">{items.length}</div>
                                    </div>
                                </div>
                                
                                {/* Card Body: Usage instances */}
                                <div className="bg-slate-900/50 p-3 max-h-64 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-sm">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-900/50 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">Task / Sheet Name</th>
                                                <th className="px-3 py-2 font-medium">Full Key</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {items.map(item => (
                                                <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-3 py-2 text-blue-400 font-medium whitespace-nowrap align-top w-1/4">
                                                        <div className="flex items-center gap-2">
                                                            <Layers className="w-3 h-3 opacity-50" />
                                                            {item.taskName}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-400 font-mono text-xs break-all align-top">
                                                        {item.originalKey}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                         );
                     })
                 )}
             </div>
        </div>
      </div>
    </div>
  );
};