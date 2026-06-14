import { useState, useMemo } from 'react';
import { GolonganID } from '../types';
import { GOLONGAN_LIST, SKP_STANDARD_COEFFICIENT, SKP_RATING_MULTIPLIERS, getTeacherLevel } from '../data/golonganData';
import { Calculator, HelpCircle, ArrowRight, Check, AlertCircle, Info, Calendar, PlusCircle } from 'lucide-react';

export default function CalculatorTab() {
  const [currentGol, setCurrentGol] = useState<GolonganID>('III/a');
  const [predikatSKP, setPredikatSKP] = useState<'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang' | 'Sangat Kurang'>('Baik');
  const [years, setYears] = useState<number>(4);
  const [akIntegrasi, setAkIntegrasi] = useState<number>(0);
  const [hasLulusS2, setHasLulusS2] = useState<boolean>(false);

  // Get active configurations
  const currentDetail = useMemo(() => {
    return GOLONGAN_LIST.find(g => g.id === currentGol) || GOLONGAN_LIST[0];
  }, [currentGol]);

  const nextGolId = useMemo(() => {
    const idx = GOLONGAN_LIST.findIndex(g => g.id === currentGol);
    if (idx < GOLONGAN_LIST.length - 1) {
      return GOLONGAN_LIST[idx + 1].id;
    }
    return 'IV/e';
  }, [currentGol]);

  const targetDetail = useMemo(() => {
    return GOLONGAN_LIST.find(g => g.id === nextGolId) || GOLONGAN_LIST[GOLONGAN_LIST.length - 1];
  }, [nextGolId]);

  // CALCULATIONS - SKP Conversion (Permenpan 1/2023)
  const resultsSKP = useMemo(() => {
    const levelStr = getTeacherLevel(currentGol);
    const baseCoeff = SKP_STANDARD_COEFFICIENT[levelStr] || 12.5;
    const ratingMult = SKP_RATING_MULTIPLIERS[predikatSKP] || 1.0;
    const annualAK = baseCoeff * ratingMult;
    const totalAKEarned = (annualAK * years);
    
    // Kelebihan / bonus ijazah baru linear dihargai dengan angka kredit tambahan 25% dari AK kenaikan pangkat yang dituju
    const ijazahBonus = hasLulusS2 ? (0.25 * currentDetail.akNeedsToEarn) : 0;
    const finalEarned = totalAKEarned + ijazahBonus + akIntegrasi;

    const remainingToTarget = currentDetail.akNeedsToEarn - finalEarned;
    const isSuccess = remainingToTarget <= 0;

    return {
      levelStr,
      annualAK,
      totalAKEarned,
      ijazahBonus,
      finalEarned,
      remainingToTarget: remainingToTarget > 0 ? remainingToTarget : 0,
      isSuccess
    };
  }, [currentGol, predikatSKP, years, hasLulusS2, currentDetail, akIntegrasi]);

  return (
    <div className="space-y-6" id="calculator-tab">
      
      {/* Simulation Info */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-teal-600" /> Simulasi & Proyeksi Kenaikan Pangkat (Permenpan RB 1/2023)
        </h3>
        <p className="text-xs text-slate-500 leading-normal max-w-3xl">
          Simulasikan estimasi perolehan Angka Kredit Anda berdasarkan tingkat jabatan dan predikat kinerja tahunan. Berdasarkan regulasi dari Perka BKN No. 3 Tahun 2023, perhitungan angka kredit fungsional dialihkan sepenuhnya berbentuk konversi SKP, meniadakan berkas PKG terpisah maupun rincian portofolio dupak lama.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Controls - left bar */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-5">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400">Parameter Simulasi</h3>
          
          {/* Current Golongan selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">GOLONGAN SAAT INI</label>
            <select
              value={currentGol}
              onChange={e => setCurrentGol(e.target.value as GolonganID)}
              className="w-full text-sm bg-slate-50 border border-slate-200 hover:border-slate-300 p-2.5 rounded focus:outline-teal-500"
            >
              {GOLONGAN_LIST.map(g => (
                <option key={g.id} value={g.id}>{g.id} - {g.pangkat}</option>
              ))}
            </select>
          </div>

          {/* Predikat SKP */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">PREDIKAT KINERJA E-SKP ESTIMASI</label>
            <select
              value={predikatSKP}
              onChange={e => setPredikatSKP(e.target.value as any)}
              className="w-full text-sm bg-slate-50 border border-slate-200 hover:border-slate-300 p-2.5 rounded focus:outline-teal-500"
            >
              <option value="Sangat Baik">Sangat Baik (150% Koefisien)</option>
              <option value="Baik">Baik (100% Koefisien)</option>
              <option value="Cukup">Cukup (75% Koefisien)</option>
              <option value="Kurang">Kurang (50% Koefisien)</option>
              <option value="Sangat Kurang">Sangat Kurang (25% Koefisien)</option>
            </select>
          </div>

          {/* Nilai PAK Integrasi */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">LOG HARGA / NILAI PAK INTEGRASI</label>
            <input
              type="number"
              step="any"
              value={akIntegrasi || ''}
              onChange={e => {
                const val = parseFloat(e.target.value);
                setAkIntegrasi(isNaN(val) ? 0 : val);
              }}
              placeholder="Contoh: 15.250"
              className="w-full text-sm bg-slate-50 border border-slate-200 hover:border-slate-300 p-2.5 rounded focus:outline-teal-500 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">Sertakan nilai akumulasi integrasi yang diperoleh dari masa kerja sebelumnya (jika ada).</p>
          </div>

          {/* Years Slider */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-1 leading-none">
              <span>DURASI SIMULASI KERJA</span>
              <span className="text-teal-600 font-mono text-sm font-black">{years} TAHUN</span>
            </div>
            <input
              type="range"
              min="1"
              max="6"
              value={years}
              onChange={e => setYears(parseInt(e.target.value))}
              className="w-full accent-teal-600 cursor-ew-resize py-1"
            />
          </div>

          {/* Ijazah S2 Linear checker */}
          <div className="pt-2 border-t border-slate-100">
            <label className="inline-flex items-start gap-2.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={hasLulusS2}
                onChange={e => setHasLulusS2(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 mt-0.5 border-slate-300 accent-teal-600"
              />
              <span className="text-xs font-medium leading-tight">
                Memiliki Ijazah S2/S3 baru yang linier dengan posisi mengajar? (+25% bonus kebutuhan AK)
              </span>
            </label>
          </div>
          
          <div className="p-3 bg-teal-50/60 rounded border border-teal-100 flex gap-2">
            <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-teal-800 leading-normal">
              Penetapan didasarkan atas koefisien standard nasional bagi guru kelas maupun guru bidang studi sesuai ketetapan BKN.
            </p>
          </div>
        </div>

        {/* Results Display */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Key Output Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">Hasil Proyeksi Angka Kredit</h3>
            <p className="text-xs text-slate-500">Estimasi total perolehan nilai bersih konversi E-SKP</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
              
              {/* AK Per Year */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center font-semibold">
                <span className="text-[10px] tracking-wider text-slate-400 font-bold uppercase block mb-1">Perolehan / Tahun</span>
                <p className="text-2xl font-black font-mono text-slate-900">+{resultsSKP.annualAK.toFixed(2)}</p>
                <p className="text-[10px] text-slate-500 mt-1">Jenjang {resultsSKP.levelStr}</p>
              </div>

              {/* Total AK Earned */}
              <div className="p-4 rounded-lg bg-teal-50/50 border border-teal-100 text-center font-semibold">
                <span className="text-[10px] tracking-wider text-teal-500 font-bold uppercase block mb-1">Total Proyeksi Akhir</span>
                <p className="text-2xl font-black font-mono text-teal-700">+{resultsSKP.finalEarned.toFixed(3)}</p>
                <div className="text-[9.5px] text-teal-600 mt-1 leading-tight">
                  <span>SKP: {resultsSKP.totalAKEarned.toFixed(2)}</span>
                  {akIntegrasi > 0 && <span className="block">PAK Integrasi: +{akIntegrasi.toFixed(2)}</span>}
                  {hasLulusS2 && <span className="block">Ijazah S2: +{resultsSKP.ijazahBonus.toFixed(1)}</span>}
                </div>
              </div>

              {/* Target progress summary */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center font-semibold">
                <span className="text-[10px] tracking-wider text-slate-400 font-bold uppercase block mb-1">Kebutuhan Target</span>
                <p className="text-2xl font-black font-mono text-slate-900">+{currentDetail.akNeedsToEarn}</p>
                <p className="text-[10px] text-slate-500 mt-1">Hingga Golongan {nextGolId}</p>
              </div>

            </div>

            {resultsSKP.isSuccess ? (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 bg-emerald-100 p-0.5 rounded-full" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-900 leading-snug">Rencana Memenuhi Syarat Kenaikan Jenjang!</h4>
                  <p className="text-xs text-emerald-700 leading-relaxed mt-0.5">
                    Proyeksi perolehan <strong className="text-slate-950 font-bold">{resultsSKP.finalEarned.toFixed(3)} AK</strong> (gabungan hasil E-SKP, ijazah bonus, dan PAK Integrasi) sudah melampaui kebutuhan minimal sebesar <strong className="text-slate-950 font-bold">{currentDetail.akNeedsToEarn} AK</strong> untuk usulan naik pangkat dari golongan <strong className="text-slate-950 font-bold">{currentGol}</strong> ke golongan <strong className="text-slate-950 font-bold">{nextGolId}</strong> ({targetDetail.pangkat}).
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-100 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900 leading-snug">Jumlah Belum Mencukupi ({resultsSKP.finalEarned.toFixed(3)} / {currentDetail.akNeedsToEarn} AK)</h4>
                  <p className="text-xs text-amber-700 leading-relaxed mt-0.5">
                    Proyeksi Anda masih kekurangan <strong className="font-mono text-amber-950 font-bold">{resultsSKP.remainingToTarget.toFixed(3)} AK</strong> untuk mencapai syarat minimal ke golongan {nextGolId}. Rekomendasi: Tingkatkan prestasi kerja agar memperoleh predikat SKP "Sangat Baik" (multiplier 150%) atau tambahkan tahun berjalan.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Projection Schedule table */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5"><Calendar className="w-4.5 h-4.5 text-teal-600" /> Proyeksi Kenaikan Berjalannya Angka Kredit</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150 uppercase tracking-wider font-sans">
                    <th className="py-2.5 px-3">Kegiatan / Tahun</th>
                    <th className="py-2.5 px-3">Keterangan / Predikat</th>
                    <th className="py-2.5 px-3 uppercase text-right">Nilai Tambahan</th>
                    <th className="py-2.5 px-3 uppercase text-right">Akumulasi Berjalan</th>
                    <th className="py-2.5 px-3 text-center font-bold">Status Layak</th>
                  </tr>
                </thead>
                <tbody>
                  {akIntegrasi > 0 && (
                    <tr className="border-b border-slate-100 font-serif bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold font-sans text-slate-800">Saldo Awal</td>
                      <td className="py-2.5 px-3 font-sans text-slate-500 leading-normal">Nilai PAK Integrasi Sebelumnya</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-600">+{akIntegrasi.toFixed(3)}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-950">{akIntegrasi.toFixed(3)} AK</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded text-[10px] font-sans font-bold">Terbawa</span>
                      </td>
                    </tr>
                  )}
                  {Array.from({ length: years }).map((_, index) => {
                    const yearNum = index + 1;
                    const carryAK = akIntegrasi + resultsSKP.annualAK * yearNum;
                    const isYearMet = carryAK >= currentDetail.akNeedsToEarn;
                    
                    return (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold font-sans text-slate-800">Tahun {yearNum}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-600">{predikatSKP} ({predikatSKP === 'Sangat Baik' ? '150%' : '100%'})</td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-500">+{resultsSKP.annualAK.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">{carryAK.toFixed(3)} AK</td>
                        <td className="py-2.5 px-3 text-center">
                          {isYearMet ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-sans font-bold">Lolos Syarat</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[10px] font-sans">Progres</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {hasLulusS2 && (
                    <tr className="bg-emerald-50/30 border-b border-emerald-100">
                      <td className="py-2.5 px-3 font-semibold text-emerald-800 font-sans">Pendidikan S2</td>
                      <td className="py-2.5 px-3 italic font-sans text-emerald-700">Ijazah Baru Linier</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">+{resultsSKP.ijazahBonus.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">{(akIntegrasi + resultsSKP.totalAKEarned + resultsSKP.ijazahBonus).toFixed(3)} AK</td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-black">Bonus 25%</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
