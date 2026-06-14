import { GOLONGAN_LIST } from '../data/golonganData';
import { BookOpen, FileText, HelpCircle, Shield, Award, CheckCircle } from 'lucide-react';

export default function RegulationsTab() {
  return (
    <div className="space-y-6" id="regulations-tab">
      
      {/* Header Infobox */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-1.5">
          <Shield className="w-5 h-5 text-teal-600" /> Landasan Hukum Angka Kredit Guru Terbaru
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
          Perhitungan angka kredit jabatan fungsional guru saat ini didasarkan pada <strong className="text-slate-900">Permenpan RB Nomor 1 Tahun 2023</strong> tentang Jabatan Fungsional, serta <strong className="text-slate-900">Peraturan BKN Nomor 3 Tahun 2023</strong>. Terjadi transformasi besar dari sistem konvensional (DUPAK butir kegiatan) menjadi sistem integrasi yang dikonversi langsung dari predikat Sasaran Kinerja Pegawai (E-SKP).
        </p>
      </div>

      {/* Comparison table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Old System vs New System */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
          <h4 className="text-sm font-bold text-red-600 uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 pb-2">
            🛑 Sistem Lama (Permenpan 16/2009)
          </h4>
          <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed list-disc pl-4">
            <li>Menggunakan <strong className="text-slate-800">DUPAK</strong> (Daftar Usulan Penelitian Angka Kredit) yang sangat administratif.</li>
            <li>Angka kredit dihitung per butir aktivitas (mengajar, membuat soal, kepanitiaan, menyusun modul dll).</li>
            <li>Guru harus melampirkan puluhan surat pernyataan, laporan mingguan, dan bukti fisik yang sangat tebal.</li>
            <li>Proses penilaian dilakukan berkala oleh Tim Penilai pusat/daerah, sering terjadi keterlambatan hasil.</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
          <h4 className="text-sm font-bold text-teal-600 uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 pb-2">
            🟢 Sistem Baru (Permenpan 1/2023)
          </h4>
          <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed list-disc pl-4">
            <li>Angka Kredit diperoleh dari <strong className="text-slate-800">Konversi Predikat Kinerja SKP</strong> tahunan.</li>
            <li>Tidak ada lagi pengumpulan berkas DUPAK rincian kecil-kecil yang membebani tugas utama mengajar guru.</li>
            <li>Kenaikan pangkat linear dengan kinerja tahunan yang divalidasi langsung oleh Kepala Sekolah & Pengawas.</li>
            <li>Angka kredit terintegrasi otomatis secara nasional melalui aplikasi siber BKN (<strong className="text-slate-800">SInep</strong> / <strong className="text-slate-800">SIASN</strong>).</li>
          </ul>
        </div>

      </div>

      {/* Minimum elements reference table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <BookOpen className="w-4.5 h-4.5 text-teal-600" /> Matriks Kebutuhan Angka Kredit & Prosedur Kenaikan (BKN No. 3/2023)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Panduan peralihan pengumpulan Angka Kredit (AK) berdasarkan Jabatan Fungsional Guru di bawah Permenpan-RB Nomor 1 Tahun 2023.
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-150 uppercase tracking-wider font-sans">
                <th className="py-3 px-4">Golongan Lama</th>
                <th className="py-3 px-4">Target Golongan</th>
                <th className="py-3 px-4">Kategori Kenaikan</th>
                <th className="py-3 px-4 text-center">AK Baru Dibutuhkan</th>
                <th className="py-3 px-4 text-center">Perolehan SKP / Thn (Baik - S.Baik)</th>
                <th className="py-3 px-4">Ketentuan Prosedur Terbaru BKN</th>
              </tr>
            </thead>
            <tbody>
              {GOLONGAN_LIST.slice(0, -1).map((g) => {
                // Determine category of promotion
                const currentId = g.id;
                const isJenjang = 
                  (currentId === 'III/b') || 
                  (currentId === 'III/d') || 
                  (currentId === 'IV/c');

                // Determine coefficient rates
                let baseCoeff = 12.5;
                let levelName = 'Ahli Pertama';
                if (currentId === 'III/c' || currentId === 'III/d') {
                  baseCoeff = 25.0;
                  levelName = 'Ahli Muda';
                } else if (currentId === 'IV/a' || currentId === 'IV/b' || currentId === 'IV/c') {
                  baseCoeff = 37.5;
                  levelName = 'Ahli Madya';
                } else if (currentId === 'IV/d') {
                  baseCoeff = 50.0;
                  levelName = 'Ahli Utama';
                }

                const sBaikCoeff = baseCoeff * 1.5;

                return (
                  <tr key={g.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{g.id}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{g.pangkatTarget}</td>
                    <td className="py-3.5 px-4">
                      {isJenjang ? (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold inline-block">
                          Kenaikan Jenjang Jabatan
                        </span>
                      ) : (
                        <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full text-[10px] font-bold inline-block">
                          Kenaikan Pangkat Biasa
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-extrabold text-teal-700">+{g.akNeedsToEarn}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-600">
                      {baseCoeff.toFixed(1)} s.d {sBaikCoeff.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-[285px] leading-relaxed">
                      {isJenjang ? (
                        <span className="text-amber-950 font-medium font-sans">
                          Wajib melampirkan <strong>Laporan Hasil Uji Kompetensi (UKOM)</strong> dari Kemendikbudristek, penetapan E-SKP terpenuhi, dan ketersediaan Formasi Jabatan.
                        </span>
                      ) : (
                        <span className="text-teal-950 font-medium font-sans">
                          Murni konversi akumulasi predikat E-SKP Tahunan. Tidak ada kewajiban Uji Kompetensi ataupun rincian DUPAK buku tebal.
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Physical Evidence Guide Cards */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-1.5">
          <FileText className="w-4.5 h-4.5 text-teal-600" /> Panduan Validasi Bukti Fisik Pelaksanaan Kegiatan
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Certificate */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-250">
            <div className="flex items-center gap-2 mb-2 font-bold text-slate-800 text-xs uppercase tracking-wider">
              <Award className="w-4 h-4 text-teal-600" /> 1. Pengembangan Diri (Diklat)
            </div>
            <p className="text-xs text-slate-600 leading-normal">
              Wajib melampirkan <strong className="text-slate-900">Sertifikat Pendidikan/Pelatihan</strong> yang memuat durasi minimal jam pelajaran (JP), <strong className="text-slate-900">Surat Tugas</strong> dari Kepala Dinas/Sekolah, dan <strong className="text-slate-900">Laporan Hasil Pelatihan</strong> yang menguraikan ringkasan materi serta tindak lanjut pelaksanaan.
            </p>
          </div>

          {/* Research / Journals */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-250">
            <div className="flex items-center gap-2 mb-2 font-bold text-slate-800 text-xs uppercase tracking-wider">
              <FileText className="w-4 h-4 text-teal-600" /> 2. Publikasi Ilmiah (PTK)
            </div>
            <p className="text-xs text-slate-600 leading-normal">
              Laporan Penelitian Tindakan Kelas (PTK) harus diseminarkan di sekolah dengan minimal dihadiri guru dari 3 sekolah berbeda, disahkan Kepala Sekolah, disimpan di perpustakaan sekolah, serta dilengkapi daftar hadir & kelengkapan administrasi seminar.
            </p>
          </div>

          {/* Technology models */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-250">
            <div className="flex items-center gap-2 mb-2 font-bold text-slate-800 text-xs uppercase tracking-wider">
              <CheckCircle className="w-4 h-4 text-teal-600" /> 3. Karya Inovatif / Alat Peraga
            </div>
            <p className="text-xs text-slate-600 leading-normal">
              Harus dilengkapi <strong className="text-slate-900">Laporan Pembuatan Alat Peraga</strong> yang merinci foto-foto tahap pengerjaan, skema cara kerja alat, video fungsionalitas (jika digital), serta <strong className="text-slate-900">Surat Pernyataan Keaslian</strong> dari tim penilai sekolah/Kepala Sekolah.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
