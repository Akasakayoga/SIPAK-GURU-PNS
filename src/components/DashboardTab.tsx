import React, { useState } from 'react';
import { 
  TeacherProfile, 
  SKPEvaluation, 
  GolonganDetail 
} from '../types';
import { 
  GOLONGAN_LIST, 
  getTeacherLevel, 
  SKP_STANDARD_COEFFICIENT,
  SKP_RATING_MULTIPLIERS,
  GOLONGAN_BASE_VALS,
  getMinimalPangkat,
  getMinimalJenjang
} from '../data/golonganData';
import { 
  Award, 
  BookOpen, 
  Calendar, 
  ChevronRight, 
  Compass, 
  Edit3, 
  GraduationCap, 
  Percent, 
  TrendingUp, 
  User, 
  CheckCircle,
  AlertTriangle,
  FileText,
  Clock,
  Cloud,
  Link,
  ExternalLink
} from 'lucide-react';

interface DashboardTabProps {
  profile: TeacherProfile;
  setProfile: (profile: TeacherProfile) => void;
  evaluations: SKPEvaluation[];
  golonganDetail: GolonganDetail;
  targetGolonganDetail: GolonganDetail;
}

export default function DashboardTab({
  profile,
  setProfile,
  evaluations,
  golonganDetail,
  targetGolonganDetail
}: DashboardTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<TeacherProfile>({ ...profile });

  // Current cumulative AK = PAK Integrasi 2022 (input manual) + Hasil Konversi E-SKP + Pendidikan (jika ada)
  const totalSKPAC = evaluations.reduce((sum, item) => sum + (item.creditEarned || 0), 0);
  const totalPendidikanAK = (profile.akPendidikan || 0) + evaluations.reduce((sum, item) => sum + (item.akPendidikan || 0), 0);
  const currentTotalAK = (profile.akIntegrasi2022 || 0) + totalSKPAC + totalPendidikanAK;
  
  // Clean, modern alignment with BKN incremental standards (replaces flawed absolute targets)
  const minimalPangkat = getMinimalPangkat(profile.currentGolongan);
  const minimalJenjang = getMinimalJenjang(profile.currentGolongan);
  
  const isNaikJenjang = getTeacherLevel(profile.currentGolongan) !== getTeacherLevel(profile.targetGolongan);
  const targetAK = isNaikJenjang ? minimalJenjang : minimalPangkat;
  
  // Perhitungan Kelebihan/Kekurangan AK
  const rawNeededAK = targetAK - currentTotalAK;
  const neededAK = rawNeededAK > 0 ? rawNeededAK : 0;
  const progressPercent = Math.min(Math.round((currentTotalAK / targetAK) * 100), 100);

  // Alignment with newest calculations on the blangko page
  const teacherLevel = getTeacherLevel(profile.currentGolongan);

  const isLolosPangkat = isNaikJenjang 
    ? (currentTotalAK >= minimalPangkat && currentTotalAK >= minimalJenjang) 
    : (currentTotalAK >= minimalPangkat);
  const isLolosJenjang = currentTotalAK >= minimalJenjang;

  const kekuranganPangkat = minimalPangkat > currentTotalAK ? (minimalPangkat - currentTotalAK) : 0;
  const kekuranganJenjang = minimalJenjang > currentTotalAK ? (minimalJenjang - currentTotalAK) : 0;

  // Save profile changes
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(editForm);
    setIsEditing(false);
  };

  const getSKPAnnualValue = () => {
    const level = getTeacherLevel(profile.currentGolongan);
    const standardCoeff = SKP_STANDARD_COEFFICIENT[level] || 12.5;
    const multiplier = SKP_RATING_MULTIPLIERS[profile.ratingSKP] || 1.0;
    return standardCoeff * multiplier;
  };

  // Estimasi tahun kenaikan pangkat berdasarkan target AK dan kualifikasi SKP tahunan saat ini
  const annualCreditEarnedEst = getSKPAnnualValue();
  const estimatedYearsNeeded = annualCreditEarnedEst > 0 
    ? (kekuranganPangkat / annualCreditEarnedEst).toFixed(1)
    : 'N/A';

  const formatRatingBadge = (rating: string) => {
    switch (rating) {
      case 'Sangat Baik':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Baik':
        return 'bg-teal-50 text-teal-700 border-teal-100';
      case 'Cukup':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Kurang':
        return 'bg-orange-50 text-orange-700 border-orange-100';
      default:
        return 'bg-rose-50 text-rose-700 border-rose-100';
    }
  };

  return (
    <div className="space-y-6" id="dashboard-tab">
      
      {/* Profil Guru & Editor */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-teal-50 p-3 rounded-lg border border-teal-100 text-teal-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{profile.name || "Nama Guru belum diatur"}</h2>
              <p className="text-sm text-slate-500 font-mono">
                {profile.nip ? `NIP. ${profile.nip}` : "NIP belum diisi"} • {profile.school || "Instansi Sekolah belum diisi"}
              </p>
            </div>
          </div>
          
          <button
            id="toggle-edit-profile-btn"
            onClick={() => {
              setEditForm({ ...profile });
              setIsEditing(!isEditing);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isEditing ? "Batal Edit" : "Ubah Data & PAK 2022"}
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">NAMA LENGKAP</label>
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full text-sm bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-teal-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">NIP (NOMOR INDUK PEGAWAI)</label>
              <input
                type="text"
                value={editForm.nip}
                onChange={e => setEditForm({ ...editForm, nip: e.target.value })}
                className="w-full text-sm bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">INSTANSI SEKOLAH</label>
              <input
                type="text"
                value={editForm.school}
                onChange={e => setEditForm({ ...editForm, school: e.target.value })}
                className="w-full text-sm bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">GOLONGAN SAAT INI</label>
              <select
                value={editForm.currentGolongan}
                onChange={e => {
                  const val = e.target.value as any;
                  const StandardBases: Record<string, number> = {
                    'III/a': 100, 'III/b': 150, 'III/c': 200, 'III/d': 300,
                    'IV/a': 400, 'IV/b': 550, 'IV/c': 700, 'IV/d': 850, 'IV/e': 1050
                  };
                  setEditForm({ 
                    ...editForm, 
                    currentGolongan: val,
                    baseAK: StandardBases[val] || 100 
                  });
                }}
                className="w-full text-sm bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-teal-500"
              >
                {GOLONGAN_LIST.map(g => (
                  <option key={g.id} value={g.id}>{g.id} - {g.pangkat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">TARGET GOLONGAN</label>
              <select
                value={editForm.targetGolongan}
                onChange={e => setEditForm({...editForm, targetGolongan: e.target.value as any})}
                className="w-full text-sm bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-teal-500"
              >
                {GOLONGAN_LIST.map(g => (
                  <option key={g.id} value={g.id} disabled={GOLONGAN_LIST.findIndex(x => x.id === g.id) <= GOLONGAN_LIST.findIndex(x => x.id === editForm.currentGolongan)}>
                    {g.id} - {g.pangkatTarget}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-teal-700 mb-1 flex items-center gap-1">
                <span>NILAI AK PAK INTEGRASI 2022</span>
                <span className="text-[10px] text-amber-600 font-normal select-none">*(Manual Input)</span>
              </label>
              <input
                type="number"
                step="0.001"
                value={editForm.akIntegrasi2022}
                onChange={e => setEditForm({ ...editForm, akIntegrasi2022: parseFloat(e.target.value) || 0 })}
                className="w-full text-sm bg-teal-50/50 border border-teal-300 rounded px-2.5 py-1.5 focus:outline-teal-600 font-mono font-bold"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">ESTIMASI PREDIKAT SKP TAHUNAN</label>
              <select
                value={editForm.ratingSKP}
                onChange={e => setEditForm({...editForm, ratingSKP: e.target.value as any})}
                className="w-full text-sm bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-teal-500"
              >
                <option value="Sangat Baik">Sangat Baik (150%)</option>
                <option value="Baik">Baik (100%)</option>
                <option value="Cukup">Cukup (75%)</option>
                <option value="Kurang">Kurang (50%)</option>
                <option value="Sangat Kurang">Sangat Kurang (25%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">MASA KERJA KENAIKAN (ESTIMASI TAHUN)</label>
              <input
                type="number"
                value={editForm.workDurationYears}
                onChange={e => setEditForm({ ...editForm, workDurationYears: parseInt(e.target.value) || 1 })}
                className="w-full text-sm bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-teal-500"
                min="1"
                max="10"
              />
            </div>

            {/* Cloud Link Storage Fields */}
            <div className="md:col-span-3 border-t border-slate-200 pt-4 mt-2">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-teal-650" />
                Integrasi Tautan Berkas Fisik (Cloud Link Storage - Google Drive/Dropbox/dll)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">TAUTAN SK KENAIKAN PANGKAT TERAKHIR</label>
                  <input
                    type="url"
                    value={editForm.skPangkatFileLink || ''}
                    onChange={e => setEditForm({ ...editForm, skPangkatFileLink: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-2 focus:outline-teal-500 font-mono"
                    placeholder="https://drive.google.com/file/d/..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">TAUTAN BERKAS PAK INTEGRASI 2022</label>
                  <input
                    type="url"
                    value={editForm.pakIntegrasiFileLink || ''}
                    onChange={e => setEditForm({ ...editForm, pakIntegrasiFileLink: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-2 focus:outline-teal-500 font-mono"
                    placeholder="https://drive.google.com/file/d/..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">TAUTAN IJAZAH PENDIDIKAN TERAKHIR</label>
                  <input
                    type="url"
                    value={editForm.ijazahFileLink || ''}
                    onChange={e => setEditForm({ ...editForm, ijazahFileLink: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-2 focus:outline-teal-500 font-mono"
                    placeholder="https://drive.google.com/file/d/..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">TAUTAN BERKAS PENDUKUNG LAINNYA</label>
                  <input
                    type="url"
                    value={editForm.additionalFileLink || ''}
                    onChange={e => setEditForm({ ...editForm, additionalFileLink: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-2 focus:outline-teal-500 font-mono"
                    placeholder="https://drive.google.com/file/d/..."
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-3 flex justify-end pt-2">
              <button
                type="submit"
                id="save-profile-btn"
                className="w-full md:w-auto flex justify-center items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-6 py-2.5 rounded shadow-xs cursor-pointer transition-all"
              >
                Simpan Data Baru
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-2 pt-4 border-t border-slate-100 text-sm">
              <div>
                <span className="block text-xs text-slate-400 font-bold uppercase">Golongan saat ini</span>
                <span className="font-semibold text-slate-900">{profile.currentGolongan} ({golonganDetail.pangkat})</span>
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-bold uppercase">Jenjang Jabatan</span>
                <span className="font-semibold text-slate-900">{getTeacherLevel(profile.currentGolongan)}</span>
              </div>
              <div>
                <span className="block text-xs text-teal-600 font-bold uppercase">AK PAK Integrasi 2022</span>
                <span className="font-bold text-mono text-teal-800">{(profile.akIntegrasi2022 || 0).toFixed(3)}</span>
              </div>
              <div>
                <span className="block text-xs text-indigo-650 font-bold uppercase">Total AK Pendidikan</span>
                <span className="font-bold text-mono text-indigo-800">{totalPendidikanAK.toFixed(3)}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-bold uppercase">Predikat SKP Estimasi</span>
                <span className={`font-semibold px-2 py-0.5 rounded text-xs inline-block border ${formatRatingBadge(profile.ratingSKP)}`}>
                  {profile.ratingSKP} ({profile.ratingSKP === 'Sangat Baik' ? '150%' : profile.ratingSKP === 'Baik' ? '100%' : '75%'})
                </span>
              </div>
            </div>

            {/* Cloud Link Storage view section */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-teal-600" />
                Berkas Fisik Kepegawaian Ditautkan (Cloud Storage Link)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* SK Pangkat */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3 shadow-2xs hover:bg-white transition-all">
                  <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">SK Kenaikan Pangkat</span>
                    <p className="text-xs font-bold text-slate-800 truncate mt-1">
                      {profile.skPangkatFileLink ? "Ada Tautan Terunggah" : "Belum ditautkan"}
                    </p>
                  </div>
                  {profile.skPangkatFileLink ? (
                    <a
                      href={profile.skPangkatFileLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-[10px] font-black bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-850 border border-teal-200 rounded-lg transition-all shadow-3xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-teal-600" /> BUKA BERKAS
                    </a>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200 rounded-lg select-none">
                      KOSONG
                    </span>
                  )}
                </div>

                {/* PAK Integrasi */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3 shadow-2xs hover:bg-white transition-all">
                  <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">PAK Integrasi 2022</span>
                    <p className="text-xs font-bold text-slate-800 truncate mt-1">
                      {profile.pakIntegrasiFileLink ? "Ada Tautan Terunggah" : "Belum ditautkan"}
                    </p>
                  </div>
                  {profile.pakIntegrasiFileLink ? (
                    <a
                      href={profile.pakIntegrasiFileLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-[10px] font-black bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-850 border border-teal-200 rounded-lg transition-all shadow-3xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-teal-600" /> BUKA BERKAS
                    </a>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200 rounded-lg select-none">
                      KOSONG
                    </span>
                  )}
                </div>

                {/* Ijazah Pendidikan */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3 shadow-2xs hover:bg-white transition-all">
                  <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Ijazah Terakhir</span>
                    <p className="text-xs font-bold text-slate-800 truncate mt-1">
                      {profile.ijazahFileLink ? "Ada Tautan Terunggah" : "Belum ditautkan"}
                    </p>
                  </div>
                  {profile.ijazahFileLink ? (
                    <a
                      href={profile.ijazahFileLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-[10px] font-black bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-850 border border-teal-200 rounded-lg transition-all shadow-3xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-teal-600" /> BUKA BERKAS
                    </a>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200 rounded-lg select-none">
                      KOSONG
                    </span>
                  )}
                </div>

                {/* Berkas Lainnya */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3 shadow-2xs hover:bg-white transition-all">
                  <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Berkas Pendukung Lain</span>
                    <p className="text-xs font-bold text-slate-800 truncate mt-1">
                      {profile.additionalFileLink ? "Ada Tautan Terunggah" : "Belum ditautkan"}
                    </p>
                  </div>
                  {profile.additionalFileLink ? (
                    <a
                      href={profile.additionalFileLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-[10px] font-black bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-850 border border-teal-200 rounded-lg transition-all shadow-3xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-teal-600" /> BUKA BERKAS
                    </a>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200 rounded-lg select-none">
                      KOSONG
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Rencana Kenaikan Pangkat Visualizer Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ring & Cumulative Progress */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Kumulatif Angka Kredit</h3>
            <p className="text-xs text-slate-500">Target naik ke Golongan {profile.targetGolongan} ({targetGolonganDetail.pangkatTarget})</p>
          </div>

          <div className="my-6 flex flex-col items-center">
            {/* Minimalist circular SVG progress bar */}
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="stroke-slate-100 fill-transparent"
                  strokeWidth="10"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="stroke-teal-600 fill-transparent transition-all duration-1000 ease-out"
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - progressPercent / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold text-slate-950 tracking-tight">{progressPercent}%</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">terpenuhi</span>
              </div>
            </div>

            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-slate-900">
                {currentTotalAK.toFixed(3)} <span className="text-slate-400 font-normal">/ {targetAK} AK</span>
              </p>
              {neededAK > 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full inline-block border border-amber-100 font-semibold text-center leading-normal">
                  Kurang {neededAK.toFixed(3)} AK Lagi
                </p>
              ) : (
                <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-0.5 rounded-full inline-block border border-emerald-100 font-semibold flex items-center justify-center gap-1 text-center">
                  <CheckCircle className="w-3 h-3" /> Memenuhi Syarat Naik Pangkat!
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs">
            <div className="flex justify-between text-slate-500 mb-1">
              <span>AK PAK Integrasi 2022 (Manual):</span>
              <span className="font-mono text-teal-800 font-bold">{(profile.akIntegrasi2022 || 0).toFixed(3)}</span>
            </div>
            {totalPendidikanAK > 0 && (
              <div className="flex justify-between text-slate-500 mb-1">
                <span>Total AK Pendidikan:</span>
                <span className="font-mono text-indigo-700 font-bold">+{totalPendidikanAK.toFixed(3)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>Tambahan dari Konversi SKP:</span>
              <span className="font-mono text-emerald-700 font-bold">+{totalSKPAC.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Breakdowns per Element */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Sistem Konversi E-SKP (Permenpan RB 1/2023)</h3>
            <p className="text-xs text-slate-500">Pembagian perolehan angka kredit murni dikonversi langsung dari predikat kinerja Sasaran Kerja Pegawai Anda</p>
          </div>

          <div className="my-6 space-y-5">
            
            {/* PAK Integrasi 2022 */}
            <div>
              <div className="flex justify-between text-xs font-bold text-teal-700 mb-1">
                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Angka Kredit PAK Integrasi Akhir 2022 (Pondasi Awal)</span>
                <span className="font-mono">{profile.akIntegrasi2022.toFixed(3)} AK</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-teal-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((profile.akIntegrasi2022 / targetAK) * 100, 100)}%` }}></div>
              </div>
            </div>

            {/* Hasil Konversi SKP */}
            <div>
              <div className="flex justify-between text-xs font-bold text-emerald-700 mb-1">
                <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Hasil Konversi SKP Berjalan (Tahunan / Triwulan)</span>
                <span className="font-mono">+{totalSKPAC.toFixed(3)} AK</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((totalSKPAC / golonganDetail.akNeedsToEarn) * 100, 100)}%` }}></div>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1 leading-normal">
                Jumlah evaluasi tercatat: <strong className="text-slate-700">{evaluations.length} evaluasi</strong>. Angka Kredit yang harus dicapai pada golongan {profile.currentGolongan} adalah <strong className="text-slate-700">{golonganDetail.akNeedsToEarn} AK</strong>.
              </span>
            </div>

            {/* AK Pendidikan Belum Ternilai */}
            {totalPendidikanAK > 0 && (
              <div>
                <div className="flex justify-between text-xs font-bold text-indigo-700 mb-1">
                  <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> Angka Kredit Peningkatan Pendidikan</span>
                  <span className="font-mono">{totalPendidikanAK.toFixed(3)} AK</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((totalPendidikanAK / targetAK) * 100, 100)}%` }}></div>
                </div>
              </div>
            )}

            {/* No other items banner */}
            <div className="p-3 bg-teal-50 border border-teal-100 rounded text-xs text-teal-800 leading-normal">
              <strong>Regulasi Baru Terlaksana:</strong> Sesuai Permenpan RB 1/2023, tidak lagi diperlukan penilaian PKG secara manual dari kepala sekolah, karya ilmiah atau publikasi ilmiah, diklat fungsional dikumpulkan satu-per-satu secara administratif. Penilaian performa hanya fokus pada SKP Tahunan/Triwulan.
            </div>

          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg flex items-start gap-2.5 border border-slate-200">
            <TrendingUp className="w-4.5 h-4.5 text-teal-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Simulasi Proyeksi SKP:</strong> Dengan predikat 
              <strong className="text-slate-800"> "{profile.ratingSKP}"</strong> (Mendapat <strong className="text-emerald-700">{profile.ratingSKP === 'Sangat Baik' ? '150%' : '100%'} bimbingan koefisien</strong>) sebagai 
              <strong className="text-slate-800"> {getTeacherLevel(profile.currentGolongan)}</strong>, Anda memperoleh 
              <strong className="text-emerald-700 font-mono"> {annualCreditEarnedEst.toFixed(3)} AK</strong> per tahun. 
              {neededAK > 0 ? (
                <span> Anda membutuhkan sekitar <strong className="text-slate-800">{estimatedYearsNeeded} tahun</strong> lagi untuk terpenuhi.</span>
              ) : (
                <span> Kebutuhan angka kredit Anda saat ini sudah sepenuhnya terpenuhi untuk mengajukan kenaikan pangkat!</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Analisis Kelayakan & Proyeksi BKN/Jabar Terbaru */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-teal-600" /> Analisis Alur Kelayakan & Proyeksi BKN/Jabar terbaru
            </h3>
            <p className="text-xs text-slate-500">Hasil verifikasi otomatis persyaratan kenaikan pangkat dan jenjang jabatan fungsional sesuai aturan terbaru</p>
          </div>
          <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded">
            Permenpan RB No. 1/2023
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Track 1: Kenaikan Pangkat */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="bg-teal-50 text-teal-700 border border-teal-100 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded block w-max mb-1">
                    Track Kenaikan Pangkat
                  </span>
                  <h4 className="text-sm font-bold text-slate-800">Ke Golongan {profile.targetGolongan}</h4>
                </div>
                {isLolosPangkat ? (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 self-center">
                    <CheckCircle className="w-3.5 h-3.5" /> MEMENUHI
                  </span>
                ) : (
                  <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 self-center">
                    <AlertTriangle className="w-3.5 h-3.5" /> BELUM MEMENUHI
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs text-slate-600 leading-normal my-4">
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                  <span>Angka Kredit Kumulatif Saat Ini:</span>
                  <strong className="font-mono text-slate-900">{currentTotalAK.toFixed(3)} AK</strong>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                  <span>Syarat Minimal Kenaikan Pangkat:</span>
                  <strong className="font-mono text-slate-900">{minimalPangkat.toFixed(3)} AK</strong>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Status Kelayakan AK:</span>
                  {isLolosPangkat ? (
                    <span className="text-emerald-700">Surplus +{(currentTotalAK - minimalPangkat).toFixed(3)} AK</span>
                  ) : (
                    <span className="text-amber-600 font-bold">Kurang {kekuranganPangkat.toFixed(3)} AK</span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/60 rounded p-2.5 mt-2 text-xs text-slate-500">
              {isLolosPangkat ? (
                <p>AK kumulatif Anda telah melampaui limit minimal kenaikan pangkat ke <strong>{targetGolonganDetail.pangkatTarget}</strong>. Anda dapat mengajukan usulan berkas dengan mengunduh Blangko PAK Resmi.</p>
              ) : isNaikJenjang ? (
                <p>Karena pengusulan ini melibatkan kenaikan jenjang jabatan (UKOM), Anda belum memenuhi syarat pangkat karena akumulasi Angka Kredit belum memenuhi syarat minimal jenjang jabatan sebesar <strong>{minimalJenjang.toFixed(3)} AK</strong> (Kekurangan: <strong>{kekuranganJenjang.toFixed(3)} AK</strong>). Anda harus naik jenjang terlebih dahulu sebelum dapat naik golongan ke <strong>{profile.targetGolongan}</strong>.</p>
              ) : (
                <p>Anda masih memiliki kekurangan sebesar <strong>{kekuranganPangkat.toFixed(3)} AK</strong>. Silakan tambahkan prestasi evaluasi SKP berjalan di menu 'E-SKP Evaluasi Log' untuk mengumpulkannya.</p>
              )}
            </div>
          </div>

          {/* Track 2: Kenaikan Jenjang */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded block w-max mb-1">
                    Track Kenaikan Jenjang Jabatan
                  </span>
                  <h4 className="text-sm font-bold text-slate-800">Menuju Guru {teacherLevel === 'Ahli Pertama' ? 'Ahli Muda (III/c)' : teacherLevel === 'Ahli Muda' ? 'Ahli Madya (IV/a)' : teacherLevel === 'Ahli Madya' ? 'Ahli Utama (IV/d)' : 'Karir Maksimal'}</h4>
                </div>
                {isLolosJenjang ? (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 self-center">
                    <CheckCircle className="w-3.5 h-3.5" /> MEMENUHI
                  </span>
                ) : (
                  <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 self-center">
                    <AlertTriangle className="w-3.5 h-3.5" /> BELUM MEMENUHI
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs text-slate-600 leading-normal my-4">
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                  <span>Angka Kredit Kumulatif Saat Ini:</span>
                  <strong className="font-mono text-slate-900">{currentTotalAK.toFixed(3)} AK</strong>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                  <span>Syarat Minimal Kenaikan Jenjang:</span>
                  <strong className="font-mono text-slate-900">{minimalJenjang.toFixed(3)} AK</strong>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Status Kelayakan AK:</span>
                  {isLolosJenjang ? (
                    <span className="text-emerald-700">Surplus +{(currentTotalAK - minimalJenjang).toFixed(3)} AK</span>
                  ) : (
                    <span className="text-amber-600 font-bold">Kurang {kekuranganJenjang.toFixed(3)} AK</span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/60 rounded p-2.5 mt-2 text-xs text-slate-500">
              {isLolosJenjang ? (
                <p>Kualifikasi AK Anda sudah mencukupi prasyarat kelayakan minimal peningkatan jenjang jabatan setingkat lebih tinggi.</p>
              ) : (
                <p>Untuk perpindahan jenjang fungsional berikutnya, Anda masih membutuhkan <strong>{kekuranganJenjang.toFixed(3)} AK</strong> serta wajib mengikuti dan lulus Uji Kompetensi (Ukom) Jabatan.</p>
              )}
            </div>
          </div>

        </div>

        {/* Dynamic Alert block matching current status */}
        <div className={`p-4 rounded-lg flex items-start gap-3 border ${
          isLolosPangkat 
            ? "bg-emerald-50 text-emerald-950 border-emerald-200" 
            : "bg-amber-50 text-amber-950 border-amber-200"
        }`}>
          {isLolosPangkat ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <h5 className="font-bold uppercase tracking-wider text-[10px]">Rekomendasi Karir Terintegrasi:</h5>
            {isLolosPangkat ? (
              <p className="leading-relaxed">
                Berkas pengusulan kenaikan pangkat PNS Anda dapat diproses! Seluruh persyaratan angka kredit kumulatif sebanyak <strong>{minimalPangkat} AK</strong> telah dipenuhi (Saat ini: <strong>{currentTotalAK.toFixed(3)} AK</strong>). Silakan berpindah ke tab <strong>"BLANGKO PAK RESMI"</strong> di panel sebelah kiri untuk mencetak berkas penetapan Anda secara resmi.
              </p>
            ) : (
              <p className="leading-relaxed">
                Anda diestimasikan siap mengajukan usulan kenaikan pangkat dalam <strong>{estimatedYearsNeeded} tahun</strong> lagi dengan asumsi kinerja SKP tahunan minimal berkategori <strong>"{profile.ratingSKP}"</strong>. Tetap kumpulkan evaluasi kinerja berkala Anda secara disiplin.
              </p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
