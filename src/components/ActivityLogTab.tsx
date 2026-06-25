import React, { useState, useMemo } from 'react';
import { 
  SKPEvaluation, 
  SKPPeriod, 
  SKPRating 
} from '../types';
import { 
  SKP_STANDARD_COEFFICIENT,
  SKP_RATING_MULTIPLIERS,
  getTeacherLevel
} from '../data/golonganData';
import { 
  Plus, 
  Trash2, 
  Search, 
  Award, 
  FileText, 
  AlertCircle,
  Calendar,
  Layers,
  GraduationCap,
  Cloud,
  Link,
  ExternalLink
} from 'lucide-react';

interface ActivityLogTabProps {
  evaluations: SKPEvaluation[];
  onAddEvaluation: (evalItem: SKPEvaluation) => void;
  onDeleteEvaluation: (id: string) => void;
  currentGolonganLevel: 'Ahli Pertama' | 'Ahli Muda' | 'Ahli Madya' | 'Ahli Utama';
}

export default function ActivityLogTab({
  evaluations,
  onAddEvaluation,
  onDeleteEvaluation,
  currentGolonganLevel
}: ActivityLogTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  
  // New SKP form states
  const [year, setYear] = useState<number>(new Date().getFullYear() - 1);
  const [period, setPeriod] = useState<SKPPeriod>('Tahunan');
  const [rating, setRating] = useState<SKPRating>('Baik');
  const [level, setLevel] = useState<'Ahli Pertama' | 'Ahli Muda' | 'Ahli Madya' | 'Ahli Utama'>(currentGolonganLevel);
  const [notes, setNotes] = useState('');
  const [akPendidikanInput, setAkPendidikanInput] = useState<string>('');
  const [skpFileLink, setSkpFileLink] = useState('');
  const [evidenceFileLink, setEvidenceFileLink] = useState('');

  // Custom date range states
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [startDate, setStartDate] = useState(`${new Date().getFullYear() - 1}-09-01`);
  const [endDate, setEndDate] = useState(`${new Date().getFullYear() - 1}-12-31`);
  const [customMonths, setCustomMonths] = useState(4);
  const [customPeriodLabel, setCustomPeriodLabel] = useState('September s.d Desember');

  // Sync year changes with custom date placeholders
  React.useEffect(() => {
    if (year) {
      setStartDate(prev => {
        const parts = prev.split('-');
        return parts.length === 3 ? `${year}-${parts[1]}-${parts[2]}` : `${year}-09-01`;
      });
      setEndDate(prev => {
        const parts = prev.split('-');
        return parts.length === 3 ? `${year}-${parts[1]}-${parts[2]}` : `${year}-12-31`;
      });
    }
  }, [year]);

  // Synchronize dynamic calculations when dates change
  React.useEffect(() => {
    if (isCustomRange && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
        const count = Math.max(1, Math.min(12, months));
        setCustomMonths(count);

        // Standard name generator
        const monthsIndo = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];

        const startParts = startDate.split('-');
        const endParts = endDate.split('-');
        if (startParts.length === 3 && endParts.length === 3) {
          const startDay = parseInt(startParts[2]);
          const startMonth = parseInt(startParts[1]) - 1;
          const endDay = parseInt(endParts[2]);
          const endMonth = parseInt(endParts[1]) - 1;

          if (startDay === 1 && endDay >= 28) {
            setCustomPeriodLabel(`${monthsIndo[startMonth]} s.d. ${monthsIndo[endMonth]}`);
          } else {
            setCustomPeriodLabel(`${startParts[2]}-${startParts[1]} s.d. ${endParts[2]}-${endParts[1]}`);
          }
        }
      }
    }
  }, [startDate, endDate, isCustomRange]);

  // Fetch coefficient and multiplier live
  const calculatedCoeff = useMemo(() => {
    return SKP_STANDARD_COEFFICIENT[level] || 12.5;
  }, [level]);

  const calculatedMultiplier = useMemo(() => {
    return SKP_RATING_MULTIPLIERS[rating] || 1.0;
  }, [rating]);

  const calculatedCredit = useMemo(() => {
    const annualVal = calculatedCoeff * calculatedMultiplier;
    if (isCustomRange) {
      return (annualVal * customMonths) / 12;
    }
    if (period === 'Tahunan') {
      return annualVal;
    } else {
      // Quarterly is 1/4 of annual credit
      return annualVal / 4;
    }
  }, [calculatedCoeff, calculatedMultiplier, period, isCustomRange, customMonths]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalPeriod = isCustomRange ? customPeriodLabel : period;
    const parsedAkPendidikan = parseFloat(akPendidikanInput) || 0;

    const newEvaluation: SKPEvaluation = {
      id: Math.random().toString(36).substring(2, 9),
      year,
      period: finalPeriod,
      rating,
      level,
      coefficient: calculatedCoeff,
      multiplier: calculatedMultiplier,
      creditEarned: calculatedCredit,
      akPendidikan: parsedAkPendidikan > 0 ? parsedAkPendidikan : undefined,
      notes: notes.trim() || undefined,
      startDate: isCustomRange ? startDate : undefined,
      endDate: isCustomRange ? endDate : undefined,
      isCustomRange,
      customMonths: isCustomRange ? customMonths : undefined,
      skpFileLink: skpFileLink.trim() || undefined,
      evidenceFileLink: evidenceFileLink.trim() || undefined
    };

    onAddEvaluation(newEvaluation);
    setNotes('');
    setAkPendidikanInput('');
    setSkpFileLink('');
    setEvidenceFileLink('');
  };

  const searchedEvaluations = useMemo(() => {
    return evaluations.filter(item => {
      const matchSearch = item.year.toString().includes(searchTerm) || 
                          item.level.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchFilter = filterPeriod === 'all' || 
                          (filterPeriod === 'Tahunan' && item.period === 'Tahunan') ||
                          (filterPeriod === 'Triwulan' && item.period !== 'Tahunan');
      return matchSearch && matchFilter;
    });
  }, [evaluations, searchTerm, filterPeriod]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="activity-log-tab">
      
      {/* Logger Input Form (5 cols) */}
      <div className="lg:col-span-5 bg-white rounded-xl shadow-xs border border-slate-200 p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-teal-600" /> Catat Evaluasi E-SKP Baru
        </h3>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-3">
            {/* Year Input */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">TAHUN PENILAIAN</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="w-full text-sm bg-white border border-slate-300 rounded p-2 focus:outline-teal-500 font-mono"
                min="1990"
                max="2100"
                required
              />
            </div>

            {/* Period selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">PERIODE</label>
              <select
                value={isCustomRange ? 'Custom' : (period as string)}
                onChange={e => {
                  if (e.target.value === 'Custom') {
                    setIsCustomRange(true);
                  } else {
                    setIsCustomRange(false);
                    setPeriod(e.target.value as SKPPeriod);
                  }
                }}
                className="w-full text-sm bg-white border border-slate-300 rounded p-2 focus:outline-teal-500 font-medium"
              >
                <option value="Tahunan">Tahunan (Penuh)</option>
                <option value="Triwulan I">Triwulan I</option>
                <option value="Triwulan II">Triwulan II</option>
                <option value="Triwulan III">Triwulan III</option>
                <option value="Triwulan IV">Triwulan IV</option>
                <option value="Custom">Rentang Khusus (s.d.)</option>
              </select>
            </div>
          </div>

          {/* Sub-form for Custom Date Range */}
          {isCustomRange && (
            <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 space-y-3 animate-fadeIn">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Konfigurasi Rentang Tanggal</span>
                <span className="text-[9px] bg-teal-100/50 text-teal-800 border border-teal-200/50 rounded-sm px-1.5 font-bold uppercase">Proporsional</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 mb-1 tracking-wider">MULAI PENILAIAN</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 mb-1 tracking-wider">SELESAI PENILAIAN</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500 font-mono"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-[9px] font-black text-slate-400 mb-1 tracking-wider">BULAN AKTIF</label>
                  <input
                    type="number"
                    value={customMonths}
                    min="1"
                    max="12"
                    onChange={e => setCustomMonths(parseInt(e.target.value) || 1)}
                    className="w-full text-xs bg-white border border-slate-400 rounded p-1.5 focus:outline-teal-500 font-mono text-center font-bold text-teal-700"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 mb-1 tracking-wider">NAMA PERIODE (LAPORAN)</label>
                  <input
                    type="text"
                    value={customPeriodLabel}
                    onChange={e => setCustomPeriodLabel(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500 font-semibold"
                    placeholder="Misal: September s.d Desember"
                    required
                  />
                </div>
              </div>
              <p className="text-[9px] text-slate-400 italic">
                * Bulan aktif otomatis dihitung {customMonths} bulan. Anda bisa mengedit nama periode & jumlah bulan jika dibutuhkan.
              </p>
            </div>
          )}

          {/* Teacher Level when evaluated */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">JENJANG JABATAN GURU</label>
            <select
              value={level}
              onChange={e => setLevel(e.target.value as any)}
              className="w-full text-sm bg-white border border-slate-300 rounded p-2 focus:outline-teal-500"
            >
              <option value="Ahli Pertama">Ahli Pertama (Guru Pertama: III/a, III/b)</option>
              <option value="Ahli Muda">Ahli Muda (Guru Muda: III/c, III/d)</option>
              <option value="Ahli Madya">Ahli Madya (Guru Madya: IV/a, IV/b, IV/c)</option>
              <option value="Ahli Utama">Ahli Utama (Guru Utama: IV/d, IV/e)</option>
            </select>
            <span className="text-[10px] text-slate-400 block mt-1">
              Koefisien dasar jabatan per tahun: <strong>{calculatedCoeff} AK</strong>
            </span>
          </div>

          {/* Rating Option */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">PREDIKAT EVALUASI KINERJA (E-SKP)</label>
            <select
              value={rating}
              onChange={e => setRating(e.target.value as SKPRating)}
              className="w-full text-sm bg-white border border-slate-300 rounded p-2 focus:outline-teal-500"
            >
              <option value="Sangat Baik">Sangat Baik (150% Konversi)</option>
              <option value="Baik">Baik (100% Konversi)</option>
              <option value="Cukup">Cukup (75% Konversi)</option>
              <option value="Kurang">Kurang (50% Konversi)</option>
              <option value="Sangat Kurang">Sangat Kurang (25% Konversi)</option>
            </select>
            <span className="text-[10px] text-slate-400 block mt-1">
              Persentase konversi predikat: <strong>{(calculatedMultiplier * 100)}%</strong>
            </span>
          </div>

          {/* Dynamic Result preview box */}
          <div className="bg-teal-50 border border-teal-100 rounded-lg p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-teal-850 uppercase tracking-widest block">Estimasi Hasil Akrual Angka Kredit</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-teal-700 font-mono">+{calculatedCredit.toFixed(4)}</span>
              <span className="text-sm font-semibold text-teal-650">AK</span>
            </div>
            <p className="text-[10px] text-teal-800 leading-normal">
              Formula: ({calculatedCoeff} AK × {(calculatedMultiplier * 100)}%) {isCustomRange ? `× (${customMonths}/12 bulan)` : period !== 'Tahunan' ? '/ 4 (Triwulan)' : 'Penuh (Tahunan)'}.
            </p>
          </div>

          {/* Education Add-on credit */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
              AK PENINGKATAN PENDIDIKAN BARU (OPSIONAL)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={akPendidikanInput}
              onChange={e => setAkPendidikanInput(e.target.value)}
              className="w-full text-sm bg-white border border-slate-300 rounded p-2 focus:outline-teal-500 font-mono"
              placeholder="Misal: 15.000 atau 25.000 (Jika Lulus S2/S3)"
            />
            <span className="text-[10px] text-slate-400 block mt-1 leading-normal">
              Isi nilai ini <strong>hanya jika</strong> Anda lulus peningkatan jenjang pendidikan (S2/S3) pada periode ini.
            </span>
          </div>

          {/* Specific notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">CATATAN / NOMOR SKP (OPSIONAL)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-sm bg-white border border-slate-300 rounded p-2 focus:outline-teal-500"
              placeholder="Contoh: No SKP. 129/SKP-X/2025"
            />
          </div>

          {/* Cloud Storage Links */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-teal-650" /> Tautan Berkas Cloud (Drive/Dropbox/dll)
            </span>
            <div className="space-y-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase tracking-wide">TAUTAN BERKAS PENILAIAN SKP (OPSIONAL)</label>
                <input
                  type="url"
                  value={skpFileLink}
                  onChange={e => setSkpFileLink(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500 font-mono"
                  placeholder="https://drive.google.com/file/d/..."
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase tracking-wide">TAUTAN BUKTI FISIK / SERTIFIKAT / SK (OPSIONAL)</label>
                <input
                  type="url"
                  value={evidenceFileLink}
                  onChange={e => setEvidenceFileLink(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500 font-mono"
                  placeholder="https://drive.google.com/file/d/..."
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            id="add-evaluation-btn"
            className="w-full flex justify-center items-center gap-1.5 bg-teal-600 hover:bg-teal-750 text-white font-bold text-sm px-4 py-2.5 rounded shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Evaluasi SKP
          </button>
        </form>
      </div>

      {/* Evaluations list layout (7 cols) */}
      <div className="lg:col-span-7 bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-0.5">Daftar Konversi Predikat SKP</h3>
              <p className="text-xs text-slate-500 font-medium">Rekaman nilai hasil konversi Sasaran Kinerja Pegawai (E-SKP)</p>
            </div>

            {/* Summary bubble */}
            <div className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs">
              <span className="text-slate-500">Jumlah SKP AK:</span>
              <span className="font-extrabold font-mono text-emerald-800 bg-emerald-100/50 px-2.5 py-0.5 rounded border border-emerald-200">
                +{evaluations.reduce((sum, item) => sum + (item.creditEarned || 0), 0).toFixed(3)} AK
              </span>
            </div>
          </div>

          {/* Searching and filter options */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded pl-9.5 pr-4 py-1.5 focus:outline-teal-500"
                placeholder="Cari tahun atau catatan..."
              />
            </div>
            <select
              value={filterPeriod}
              onChange={e => setFilterPeriod(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded px-2.5 py-1 focus:outline-teal-500"
            >
              <option value="all">Semua Periode</option>
              <option value="Tahunan">Tahunan Saja</option>
              <option value="Triwulan">Triwulan Saja</option>
            </select>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-lg">
            {searchedEvaluations.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50/50">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">Belum ada evaluasi SKP tercatat</p>
                <p className="text-xs text-slate-400 mt-1">Gunakan form di sebelah kiri untuk merekam predikat SKP Anda.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-150 uppercase tracking-wider font-mono">
                    <th className="py-2.5 px-3">Tahun / Periode</th>
                    <th className="py-2.5 px-3">Predikat SKP</th>
                    <th className="py-2.5 px-3">Jabatan</th>
                    <th className="py-2.5 px-3 text-right">AK Diperoleh</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedEvaluations.map((item) => {
                    const ratingColor = item.rating === 'Sangat Baik' 
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                      : item.rating === 'Baik' 
                      ? 'text-teal-700 bg-teal-50 border-teal-100'
                      : 'text-amber-700 bg-amber-50 border-amber-100';

                    return (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-slate-700 transition-all font-mono">
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block">{item.year}</span>
                          <span className="text-[10px] text-slate-400 font-sans block">{item.period}</span>
                          {item.akPendidikan && item.akPendidikan > 0 ? (
                            <span className="inline-flex items-center gap-0.5 mt-1 text-[9px] text-teal-800 font-extrabold bg-teal-50 border border-teal-200/50 rounded px-1 py-0.2">
                              <GraduationCap className="w-3 h-3 text-teal-650" />
                              +{item.akPendidikan.toFixed(3)} AK S2/S3
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${ratingColor}`}>
                            {item.rating}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-sans text-slate-600">
                          <span className="block text-[11px] leading-tight font-medium text-slate-800">{item.level}</span>
                          {item.notes && <span className="block text-[10px] text-slate-400 select-all italic mt-0.5">{item.notes}</span>}
                          
                          {/* File Links display */}
                          {(item.skpFileLink || item.evidenceFileLink) && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {item.skpFileLink && (
                                <a
                                  href={item.skpFileLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-250 rounded transition-all"
                                  title="Buka Berkas SKP"
                                >
                                  <ExternalLink className="w-2.5 h-2.5 text-teal-600" />
                                  <span>Berkas SKP</span>
                                </a>
                              )}
                              {item.evidenceFileLink && (
                                <a
                                  href={item.evidenceFileLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-all"
                                  title="Buka Bukti Fisik / Sertifikat"
                                >
                                  <Link className="w-2.5 h-2.5 text-indigo-650" />
                                  <span>Bukti Fisik</span>
                                </a>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-950">
                          +{item.creditEarned.toFixed(3)}
                          {item.akPendidikan && item.akPendidikan > 0 ? (
                            <span className="block text-[9px] font-bold text-teal-600 font-sans">
                              (Pendidikan: +{item.akPendidikan.toFixed(3)})
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          <button
                            onClick={() => onDeleteEvaluation(item.id)}
                            id={`delete-eval-${item.id}`}
                            className="p-1 text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded transition-colors cursor-pointer"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-150 text-[11px] text-slate-500 mt-4 leading-normal flex gap-2">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Setiap evaluasi terdata berkontribusi terhadap Angka Kredit secara instan. Nilai default didasarkan atas lampiran teknis Permenpan RB No. 1/2023.
          </span>
        </div>

      </div>

    </div>
  );
}
