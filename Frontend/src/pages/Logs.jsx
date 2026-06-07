import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Database, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  FileSpreadsheet,
  FileText,
  Search,
  ArrowUpDown
} from 'lucide-react';

export default function Logs() {
  const hostname = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(12);
  const [offset, setOffset] = useState(0);
  
  // Filtering & Sorting States
  const [classFilter, setClassFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const [isLoading, setIsLoading] = useState(true);

  // Fetch logs from database
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`http://${hostname}:8000/api/logs`, {
        params: {
          limit,
          offset,
          class_filter: classFilter || undefined,
          source_filter: sourceFilter || undefined,
          event_filter: eventFilter || undefined,
          search: searchQuery || undefined,
          sort_by: sortBy,
          sort_order: sortOrder
        }
      });
      if (response.data.success) {
        setLogs(response.data.logs);
        setTotal(response.data.total);
      }
    } catch (err) {
      console.error("Error loading log database", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [offset, classFilter, sourceFilter, eventFilter, searchQuery, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchVal);
    setOffset(0);
  };

  const handleClearSearch = () => {
    setSearchVal('');
    setSearchQuery('');
    setOffset(0);
  };

  const handleClassChange = (e) => {
    setClassFilter(e.target.value);
    setOffset(0);
  };

  const handleEventChange = (e) => {
    setEventFilter(e.target.value);
    setOffset(0);
  };

  // Toggle sort direction
  const handleSortToggle = (column) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setOffset(0);
  };

  // Clear database logs
  const clearDatabase = async () => {
    if (!window.confirm("Are you sure you want to delete ALL logs from the database? This action is permanent.")) {
      return;
    }
    try {
      const response = await axios.delete(`http://${hostname}:8000/api/logs/clear`);
      if (response.data.success) {
        alert("Database log records cleared successfully.");
        setOffset(0);
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
      alert("Error clearing logs.");
    }
  };

  // Pagination bounds
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit) || 1;

  const handlePrevPage = () => {
    if (offset - limit >= 0) {
      setOffset(offset - limit);
    }
  };

  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Title Header Section */}
      <div className="flex items-center justify-between border-b border-brand-border pb-4 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">System Activity Logs</h2>
          <p className="text-slate-400 text-sm mt-1">Detailed history of all tracked and logged objects stored in SQLite database</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export CSV */}
          <a 
            href={`http://${hostname}:8000/api/export/csv`}
            download
            className="glass-panel border border-brand-border hover:bg-white/5 text-slate-200 font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-colors text-sm"
          >
            <FileSpreadsheet className="w-4.5 h-4.5 text-brand-glow" /> Export CSV
          </a>

          {/* Export PDF */}
          <a 
            href={`http://${hostname}:8000/api/export/pdf`}
            download
            className="glass-panel border border-brand-border hover:bg-white/5 text-slate-200 font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-colors text-sm"
          >
            <FileText className="w-4.5 h-4.5 text-brand-purple" /> Export PDF Report
          </a>

          {/* Wipe DB */}
          <button 
            onClick={clearDatabase}
            className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold flex items-center gap-2 border border-rose-500/25 transition-colors cursor-pointer text-sm"
          >
            <Trash2 className="w-4.5 h-4.5" /> Wipe Database
          </button>
        </div>
      </div>

      {/* Search, Filter, Sort Panel */}
      <div className="glass-panel rounded-3xl p-5 border border-brand-border flex flex-col gap-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input 
              type="text" 
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search by class name or video source file name..."
              className="glass-input pl-10 pr-4 py-2.5 rounded-xl text-xs w-full font-medium"
            />
          </div>
          <button 
            type="submit"
            className="btn-neon-cyan px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer font-bold shrink-0"
          >
            Search
          </button>
          {searchQuery && (
            <button 
              type="button"
              onClick={handleClearSearch}
              className="glass-panel border border-brand-border px-4 py-2.5 text-xs text-slate-300 rounded-xl hover:bg-white/5 cursor-pointer font-semibold shrink-0"
            >
              Clear
            </button>
          )}
        </form>

        <div className="flex flex-wrap gap-4 items-center justify-between border-t border-brand-border/40 pt-4 gap-y-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <Filter className="w-4 h-4 text-brand-glow" />
            <span>Filters:</span>
          </div>

          <div className="flex gap-4 flex-wrap flex-1 justify-end">
            {/* Event Filter */}
            <div className="flex flex-col gap-1 min-w-[130px]">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Event Type</span>
              <select 
                value={eventFilter}
                onChange={handleEventChange}
                className="glass-input px-3 py-1.5 rounded-xl text-xs w-full cursor-pointer font-medium"
              >
                <option value="">All Events</option>
                <option value="detection">Detection Only</option>
                <option value="crossing">Crossing Zone Only</option>
              </select>
            </div>

            {/* Class Filter */}
            <div className="flex flex-col gap-1 min-w-[130px]">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Class Filter</span>
              <select 
                value={classFilter}
                onChange={handleClassChange}
                className="glass-input px-3 py-1.5 rounded-xl text-xs w-full cursor-pointer font-medium"
              >
                <option value="">All Classes</option>
                <option value="person">Person</option>
                <option value="car">Car</option>
                <option value="truck">Truck</option>
                <option value="bicycle">Bicycle</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
              </select>
            </div>

            {/* Sorting Columns */}
            <div className="flex flex-col gap-1 min-w-[130px]">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Sort Column</span>
              <select 
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setOffset(0); }}
                className="glass-input px-3 py-1.5 rounded-xl text-xs w-full cursor-pointer font-medium"
              >
                <option value="timestamp">Timestamp</option>
                <option value="confidence">Confidence</option>
                <option value="track_id">Track ID</option>
                <option value="class_name">Class Name</option>
              </select>
            </div>

            {/* Sorting Order */}
            <div className="flex flex-col gap-1 min-w-[110px]">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Sort Order</span>
              <select 
                value={sortOrder}
                onChange={(e) => { setSortOrder(e.target.value); setOffset(0); }}
                className="glass-input px-3 py-1.5 rounded-xl text-xs w-full cursor-pointer font-medium"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Database Table layout */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-brand-border">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 border-4 border-brand-purple/10 border-t-brand-purple rounded-full animate-spin mb-3" />
            <span className="text-slate-500 text-xs font-semibold">Scanning SQLite database entries...</span>
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-border/60 bg-white/2">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Track ID
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Object Class
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Coordinates (BBox)
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {logs.map((log) => {
                  const timestampStr = new Date(log.timestamp).toLocaleString();
                  const bboxStr = log.bbox ? `[${log.bbox.map(Math.round).join(', ')}]` : 'N/A';
                  return (
                    <tr key={log.id} className="hover:bg-white/1 transition-colors">
                      <td className="px-6 py-3.5 text-xs text-slate-300 font-semibold">{timestampStr}</td>
                      <td className="px-6 py-3.5 text-xs text-brand-purple font-black">#{log.track_id.toString().padStart(2, '0')}</td>
                      <td className="px-6 py-3.5 text-xs font-semibold capitalize">{log.class_name}</td>
                      <td className="px-6 py-3.5 text-xs text-slate-300 font-bold">{Math.round(log.confidence * 100)}%</td>
                      <td className="px-6 py-3.5 text-[9px] text-slate-500 font-mono">{bboxStr}</td>
                      <td className="px-6 py-3.5 text-xs font-semibold">
                        {log.event_type === 'crossing' ? (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            CROSSING
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            DETECTION
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-400 font-semibold capitalize">{log.source.replace('web_', '')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <Database className="w-10 h-10 text-slate-500 mb-3" />
            <h4 className="font-bold text-white text-base">No database records match filters</h4>
            <p className="text-slate-500 text-xs mt-1">Adjust search patterns or run streams to populate logs.</p>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {total > limit && (
        <div className="flex items-center justify-between border-t border-brand-border/40 pt-4">
          <span className="text-xs text-slate-400 font-semibold">
            Showing Page <span className="text-white">{currentPage}</span> of {totalPages} ({total} logs total)
          </span>
          <div className="flex gap-2">
            <button 
              onClick={handlePrevPage}
              disabled={offset === 0}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                offset === 0 
                  ? 'border-transparent text-slate-600 cursor-not-allowed' 
                  : 'glass-panel border-brand-border text-slate-200 hover:bg-white/5'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={handleNextPage}
              disabled={offset + limit >= total}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                offset + limit >= total 
                  ? 'border-transparent text-slate-600 cursor-not-allowed' 
                  : 'glass-panel border-brand-border text-slate-200 hover:bg-white/5'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
