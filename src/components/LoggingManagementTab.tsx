import React, { useState, useEffect, useMemo } from 'react';
import { 
  Terminal, 
  AlertTriangle, 
  CheckCircle, 
  Trash2, 
  RefreshCw, 
  Search, 
  ShieldAlert, 
  Filter, 
  Info, 
  Check, 
  Layers, 
  Wifi, 
  WifiOff, 
  Database, 
  Sparkles,
  ArrowRight,
  Eye,
  CheckSquare
} from 'lucide-react';
import { toast } from '../lib/toast';
import { 
  getLocalLogs, 
  saveLocalLogs, 
  logEvent, 
  syncOfflineLogs, 
  clearLocalLogs, 
  fetchRemoteLogs, 
  resolveLog, 
  deleteLog, 
  SystemLog 
} from '../lib/logger';

export default function LoggingManagementTab() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, resolved, unresolved
  const [syncFilter, setSyncFilter] = useState<string>('all'); // all, synced, unsynced
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load and combine logs
  const loadLogs = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Fetch from Firestore if online
      let remoteLogs: SystemLog[] = [];
      if (isOnline) {
        remoteLogs = await fetchRemoteLogs(100);
      }

      // 2. Fetch local storage logs
      const localLogs = getLocalLogs();

      // 3. Merge logs securely preventing duplicates (by matching id)
      const mergedMap = new Map<string, SystemLog>();
      
      // Store local ones first
      localLogs.forEach(l => mergedMap.set(l.id, l));
      
      // Store remote ones (remote takes priority for synchronized flags)
      remoteLogs.forEach(r => {
        const localMatched = mergedMap.get(r.id);
        mergedMap.set(r.id, {
          ...r,
          // Keep synced true
          synced: true,
          // Preserve local state if newer
          resolved: localMatched?.resolved || r.resolved,
          resolutionNotes: localMatched?.resolutionNotes || r.resolutionNotes
        });
      });

      const sortedLogs = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setLogs(sortedLogs);
    } catch (e) {
      console.error('Error combining system logs:', e);
      // Fallback to local logs on error
      setLogs(getLocalLogs().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [isOnline]);

  // Sync click action
  const handleSyncLogs = async () => {
    if (!isOnline) {
      toast.error('Gagal sinkronisasi: Perangkat sedang offline.');
      return;
    }
    setLoading(true);
    try {
      const syncedCount = await syncOfflineLogs();
      if (syncedCount > 0) {
        toast.success(`Berhasil mengunggah ${syncedCount} log offline ke Cloud Firestore.`);
      } else {
        toast.info('Semua log sudah tersinkronisasi sempurna.');
      }
      await loadLogs(true);
    } catch (err) {
      toast.error('Gagal melakukan sinkronisasi database.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger test log
  const handleTriggerTestLog = async (severity: 'info' | 'warning' | 'error' | 'critical') => {
    try {
      await logEvent(
        `Tes Log Manual: Menjalankan simulasi error dengan tingkat keparahan [${severity.toUpperCase()}]`,
        severity,
        'SIMULATION',
        '/src/components/LoggingManagementTab.tsx'
      );
      toast.success(`Berhasil merekam log pengujian (${severity.toUpperCase()})`);
      loadLogs(true);
    } catch (e) {
      toast.error('Gagal mencetak log pengujian.');
    }
  };

  // Clear local storage logs
  const handleClearLocalCache = () => {
    clearLocalLogs();
    toast.success('Penyimpanan cache log lokal berhasil dibersihkan.');
    loadLogs();
  };

  // Handle resolve log submit
  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLog) return;

    setIsResolving(true);
    try {
      await resolveLog(selectedLog.id, resolutionNotes || 'Diselesaikan oleh Administrator', !selectedLog.synced);
      toast.success('Status log berhasil diperbarui menjadi SELESAI.');
      setSelectedLog(null);
      setResolutionNotes('');
      await loadLogs(true);
    } catch (err) {
      toast.error('Gagal merubah status log.');
    } finally {
      setIsResolving(false);
    }
  };

  // Handle log deletion
  const handleDeleteLog = async (logId: string, synced: boolean) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus catatan log ini dari basis data?')) {
      try {
        await deleteLog(logId, !synced);
        toast.success('Log berhasil dihapus.');
        await loadLogs(true);
        if (selectedLog?.id === logId) {
          setSelectedLog(null);
        }
      } catch (err) {
        toast.error('Gagal menghapus log.');
      }
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const unresolved = logs.filter(l => !l.resolved).length;
    const critical = logs.filter(l => l.severity === 'critical' || l.severity === 'error').length;
    const unsynced = logs.filter(l => !l.synced).length;
    return { total, unresolved, critical, unsynced };
  }, [logs]);

  // Filtering list
  const filteredLogs = useMemo(() => {
    return logs.filter(item => {
      const matchesSearch = 
        item.error.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.path && item.path.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.operationType && item.operationType.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSeverity = severityFilter === 'all' || item.severity === severityFilter;
      
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'resolved' && item.resolved) || 
        (statusFilter === 'unresolved' && !item.resolved);

      const matchesSync = 
        syncFilter === 'all' || 
        (syncFilter === 'synced' && item.synced) || 
        (syncFilter === 'unsynced' && !item.synced);

      return matchesSearch && matchesSeverity && matchesStatus && matchesSync;
    });
  }, [logs, searchTerm, severityFilter, statusFilter, syncFilter]);

  return (
    <div className="space-y-6" id="logging-management-view">
      
      {/* Header and status banner */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-slate-950 font-mono text-[9px] font-black px-2 py-0.5 rounded border border-amber-400 uppercase tracking-wider">
              System Audit
            </span>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              {isOnline ? (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <Wifi className="w-3.5 h-3.5 animate-pulse" /> CLOUD ONLINE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-rose-400">
                  <WifiOff className="w-3.5 h-3.5" /> WORKING OFFLINE
                </span>
              )}
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight">LOGGING & ERROR MANAGEMENT</h2>
          <p className="text-xs text-slate-400 leading-normal max-w-2xl">
            Pusat pemantauan kesalahan sistem secara real-time dan offline-first. Semua kegagalan Firestore, runtime javascript, maupun penolakan promise dicatat secara otomatis untuk mempermudah diagnosa.
          </p>
        </div>

        {/* Sync Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => loadLogs()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-lg text-xs font-bold border border-slate-700 cursor-pointer transition-colors"
            title="Muat ulang dari database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleSyncLogs}
            disabled={loading || !isOnline}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sinkronisasi log offline ke server cloud"
          >
            <Database className="w-3.5 h-3.5" />
            Sync Offline ({stats.unsynced})
          </button>

          <button
            onClick={handleClearLocalCache}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-rose-950 hover:text-rose-200 text-slate-400 rounded-lg text-xs font-bold border border-slate-700 hover:border-rose-900 cursor-pointer transition-colors"
            title="Hapus cache log lokal di browser"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Cache
          </button>
        </div>
      </div>

      {/* Widgets Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Logs Card */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="bg-slate-100 p-2.5 rounded-lg text-slate-600">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Terpelihara</span>
            <span className="text-xl font-black text-slate-900 font-mono">{stats.total}</span>
          </div>
        </div>

        {/* Unresolved Errors */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="bg-rose-50 p-2.5 rounded-lg text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unresolved Errors</span>
            <span className="text-xl font-black text-rose-600 font-mono">{stats.unresolved}</span>
          </div>
        </div>

        {/* Critical Cases */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="bg-amber-50 p-2.5 rounded-lg text-amber-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Critical / Errors</span>
            <span className="text-xl font-black text-amber-700 font-mono">{stats.critical}</span>
          </div>
        </div>

        {/* Offline Queue */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className={`p-2.5 rounded-lg ${stats.unsynced > 0 ? 'bg-indigo-50 text-indigo-650' : 'bg-slate-100 text-slate-500'}`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Queue Offline</span>
            <span className={`text-xl font-black font-mono ${stats.unsynced > 0 ? 'text-indigo-600' : 'text-slate-500'}`}>
              {stats.unsynced}
            </span>
          </div>
        </div>
      </div>

      {/* Main panel filter and display */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Logs List Area (8 cols) */}
        <div className="xl:col-span-8 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            
            {/* Filter controls */}
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Cari teks kesalahan, nama berkas/path, email operator..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9.5 pr-4 py-2 focus:outline-teal-500 font-medium"
                />
              </div>

              {/* Severity Dropdown */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={severityFilter}
                  onChange={e => setSeverityFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-250 rounded-lg px-2.5 py-1.5 focus:outline-teal-500 font-semibold text-slate-700"
                >
                  <option value="all">Semua Keparahan</option>
                  <option value="critical">Critical Only</option>
                  <option value="error">Error Only</option>
                  <option value="warning">Warning Only</option>
                  <option value="info">Info Only</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-250 rounded-lg px-2.5 py-1.5 focus:outline-teal-500 font-semibold text-slate-700"
                >
                  <option value="all">Semua Status</option>
                  <option value="unresolved">Belum Selesai</option>
                  <option value="resolved">Selesai (Resolved)</option>
                </select>
              </div>
            </div>

            {/* Logs Table / List */}
            {loading ? (
              <div className="py-24 text-center">
                <RefreshCw className="w-8 h-8 text-slate-300 animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500">Membaca riwayat log...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-16 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">Tidak ada log yang cocok</p>
                <p className="text-xs text-slate-400 mt-0.5">Semua berjalan dengan aman, atau sesuaikan filter pencarian Anda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-150 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider font-mono">
                      <th className="py-3 px-4">Waktu / Operator</th>
                      <th className="py-3 px-4">Tingkat</th>
                      <th className="py-3 px-4">Deskripsi Masalah / Lokasi</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map(log => {
                      const isSelected = selectedLog?.id === log.id;
                      let severityStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                      if (log.severity === 'critical') severityStyle = 'bg-rose-100 text-rose-800 border-rose-200 font-extrabold';
                      else if (log.severity === 'error') severityStyle = 'bg-red-50 text-red-700 border-red-150 font-bold';
                      else if (log.severity === 'warning') severityStyle = 'bg-amber-50 text-amber-700 border-amber-150';
                      else if (log.severity === 'info') severityStyle = 'bg-teal-50 text-teal-700 border-teal-150';

                      return (
                        <tr 
                          key={log.id} 
                          className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${isSelected ? 'bg-amber-50/40' : ''}`}
                          onClick={() => {
                            setSelectedLog(log);
                            setResolutionNotes(log.resolutionNotes || '');
                          }}
                        >
                          <td className="py-3.5 px-4 font-mono">
                            <span className="block font-bold text-slate-900">
                              {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className="block text-[9px] text-slate-400 font-sans">
                              {new Date(log.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="block text-[9.5px] text-teal-650 font-sans mt-0.5 max-w-[120px] truncate" title={log.email || ''}>
                              {log.email || 'anonymous'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] uppercase border font-mono ${severityStyle}`}>
                              {log.severity}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="text-slate-800 font-medium leading-normal break-all max-w-[280px] lg:max-w-[340px] text-[11px] line-clamp-2" title={log.error}>
                              {log.error}
                            </p>
                            {log.path && (
                              <code className="inline-block bg-slate-100 border border-slate-200 rounded px-1 text-[9px] text-slate-500 font-mono mt-1 break-all">
                                {log.path}
                              </code>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center justify-center gap-1">
                              {log.resolved ? (
                                <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[9.5px] font-bold border border-emerald-150 font-sans">
                                  <Check className="w-3 h-3" /> SOLVED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded text-[9.5px] font-bold border border-rose-150 font-sans animate-pulse">
                                  <AlertTriangle className="w-3 h-3" /> OPEN
                                </span>
                              )}

                              {/* Cloud indicator */}
                              {log.synced ? (
                                <span className="text-[8px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 rounded px-1">Cloud</span>
                              ) : (
                                <span className="text-[8px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 rounded px-1">Offline</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-sans" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedLog(log);
                                  setResolutionNotes(log.resolutionNotes || '');
                                }}
                                className="p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded transition-colors cursor-pointer"
                                title="Buka detail"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLog(log.id, !!log.synced)}
                                className="p-1 text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded transition-colors cursor-pointer"
                                title="Hapus log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer usage tip */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex gap-2 text-[11px] text-slate-500 leading-normal">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Sistem logging ini beroperasi secara hibrida (Offline-First). Log langsung disimpan di browser cache lokal pengguna secara instan jika jaringan bermasalah, dan secara otomatis siap disinkronisasikan ke database pusat saat jaringan pulih kembali.
              </span>
            </div>

          </div>
        </div>

        {/* Log Details Area (4 cols) */}
        <div className="xl:col-span-4 space-y-4">
          
          {/* Debug Tools Simulation Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> SIMULATOR LOG & DIAGNOSIS
            </h3>
            <p className="text-[11px] text-slate-500 mb-4 leading-normal">
              Ingin menguji apakah Logging Management bekerja dengan benar? Klik salah satu tombol di bawah untuk menyimulasikan kejadian error baru.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTriggerTestLog('info')}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-700 text-center font-bold text-[10px] rounded cursor-pointer transition-colors"
              >
                + Simulasikan Info
              </button>
              <button
                onClick={() => handleTriggerTestLog('warning')}
                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-center font-bold text-[10px] rounded cursor-pointer transition-colors"
              >
                + Simulasikan Warning
              </button>
              <button
                onClick={() => handleTriggerTestLog('error')}
                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-150 text-red-700 text-center font-bold text-[10px] rounded col-span-2 cursor-pointer transition-colors"
              >
                + Simulasikan Critical Error
              </button>
            </div>
          </div>

          {/* Details & Resolution panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                DETAIL LOG DAN PENYELIDIKAN
              </h3>
            </div>

            {selectedLog ? (
              <div className="space-y-4 text-xs animate-fadeIn">
                {/* Meta details */}
                <div className="space-y-2">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Waktu Pencatatan</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {new Date(selectedLog.timestamp).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Pesan Kesalahan (Error Message)</span>
                    <div className="p-2.5 bg-slate-50 border border-slate-150 rounded font-mono text-[10.5px] text-rose-800 break-all leading-normal">
                      {selectedLog.error}
                    </div>
                  </div>

                  {selectedLog.path && (
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Berkas Sumber / Lokasi</span>
                      <code className="block bg-slate-50 border border-slate-150 rounded p-1.5 font-mono text-[9.5px] text-slate-650 break-all">
                        {selectedLog.path}
                      </code>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Tipe Operasi</span>
                      <span className="font-semibold text-slate-800 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-150 text-[10px]">
                        {selectedLog.operationType || 'general'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Perangkat Browser</span>
                      <span className="font-semibold text-slate-700 max-w-[120px] truncate block" title={selectedLog.browser}>
                        {selectedLog.browser}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Pengguna Aktif</span>
                    <span className="font-semibold text-slate-800 block truncate" title={selectedLog.email || ''}>
                      {selectedLog.email || 'anonymous'} (UID: {selectedLog.userId || 'none'})
                    </span>
                  </div>
                </div>

                {/* Resolution Status Display */}
                <div className="p-3 rounded-lg border bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Status Solusi</span>
                    {selectedLog.resolved ? (
                      <span className="bg-emerald-100/60 text-emerald-800 border border-emerald-200 rounded px-1.5 font-bold uppercase text-[9px]">SOLVED</span>
                    ) : (
                      <span className="bg-rose-100/60 text-rose-800 border border-rose-200 rounded px-1.5 font-bold uppercase text-[9px] animate-pulse">UNRESOLVED</span>
                    )}
                  </div>

                  {selectedLog.resolved ? (
                    <div className="space-y-1">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Catatan Resolusi Administrasi</span>
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic bg-white p-2 border border-slate-200 rounded">
                        "{selectedLog.resolutionNotes}"
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleResolveSubmit} className="space-y-2 pt-1">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Tambah Catatan Solusi</label>
                        <textarea
                          value={resolutionNotes}
                          onChange={e => setResolutionNotes(e.target.value)}
                          placeholder="Tulis tindakan perbaikan, misal: 'Telah merubah Firestore Rules' atau 'Koneksi internet sudah diperbaiki'"
                          className="w-full text-xs bg-white border border-slate-300 rounded p-2 focus:outline-teal-500 font-medium"
                          rows={2}
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isResolving}
                        className="w-full flex justify-center items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 rounded shadow-xs cursor-pointer transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Tandai Selesai (Resolve Log)
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <Terminal className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold">Pilih salah satu baris log</p>
                <p className="text-[10px] text-slate-400 leading-normal max-w-[200px] mx-auto mt-0.5">
                  Klik baris log di tabel kiri untuk menganalisa detail parameter sistem, browser, dan catatan resolusi.
                </p>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
