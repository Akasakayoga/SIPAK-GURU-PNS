import React, { useState } from "react";
import { KopSettings } from "../types";
import { Settings, RefreshCw, Check, AlertCircle, FileText, Sparkles, Image, ShieldAlert } from "lucide-react";

interface KopAdminTabProps {
  kopSettings: KopSettings;
  setKopSettings: (settings: KopSettings) => void;
}

const PRESETS = [
  {
    name: "Provinsi Jawa Barat (Default)",
    settings: {
      logoType: "svg-jabar" as const,
      customLogoUrl: "",
      row1: "PEMERINTAH DAERAH PROVINSI JAWA BARAT",
      row2: "DINAS PENDIDIKAN",
      row3: "Jalan. Dr. Radjiman No. 6 Telp (022) 4264813 Fax. (022) 4264881",
      row4: "Website : disdik.jabarprov.go.id",
      row5: "e-mail: disdik@jabar.prov.go.id / sekretariatdisdikjabar@gmail.com",
      row6: "BANDUNG - 40171"
    }
  },
  {
    name: "Provinsi DKI Jakarta",
    settings: {
      logoType: "url" as const,
      customLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e4/Coat_of_arms_of_Jakarta.svg",
      row1: "PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA",
      row2: "DINAS PENDIDIKAN",
      row3: "Jalan Jenderal Gatot Subroto No. 40-41 (021) 5255385",
      row4: "Website : disdik.jakarta.go.id",
      row5: "e-mail: disdik@jakarta.go.id",
      row6: "JAKARTA - 12930"
    }
  },
  {
    name: "Kabupaten Bogor",
    settings: {
      logoType: "url" as const,
      customLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Coat_of_arms_of_Bogor_Regency.svg",
      row1: "PEMERINTAH KABUPATEN BOGOR",
      row2: "DINAS PENDIDIKAN",
      row3: "Jalan Bersih, No. 1 Komplek Perkantoran Pemda Karadenan",
      row4: "Website : disdik.bogorkab.go.id",
      row5: "e-mail: disdik@bogorkab.go.id",
      row6: "CIBINONG - 16914"
    }
  },
  {
    name: "Kota Bandung",
    settings: {
      logoType: "url" as const,
      customLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Coat_of_arms_of_Bandung.svg",
      row1: "PEMERINTAH KOTA BANDUNG",
      row2: "DINAS PENDIDIKAN",
      row3: "Jalan Jenderal Ahmad Yani No. 239 Telp (022) 4264813",
      row4: "Website : disdik.bandung.go.id",
      row5: "e-mail: disdik@bandung.go.id",
      row6: "BANDUNG - 40113"
    }
  },
  {
    name: "Model Minimalis (Tanpa Logo)",
    settings: {
      logoType: "url" as const,
      customLogoUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'></svg>",
      row1: "ADMINISTRATOR DINAS PENDIDIKAN",
      row2: "PANITIA TIM PENILAI ANGKA KREDIT JABATAN FUNGSIONAL GURU",
      row3: "Sekretariat Bersama Gedung Guru No. 99 Jabodetabek",
      row4: "Website : timpenilai.gurusip.go.id",
      row5: "e-mail: panitia@timpenilai.id",
      row6: "ID KOP INDEPENDEN"
    }
  }
];

const compressLogoImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 500;
      const MAX_HEIGHT = 500;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

export default function KopAdminTab({ kopSettings, setKopSettings }: KopAdminTabProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'kop' | 'tte'>('kop');

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const executeReset = () => {
    setKopSettings({
      ...kopSettings,
      logoType: 'svg-jabar',
      customLogoUrl: '',
      row1: 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
      row2: 'DINAS PENDIDIKAN',
      row3: 'Jalan. Dr. Radjiman No. 6 Telp (022) 4264813 Fax. (022) 4264881',
      row4: 'Website : disdik.jabarprov.go.id',
      row5: 'e-mail: disdik@jabar.prov.go.id / sekretariatdisdikjabar@gmail.com',
      row6: 'BANDUNG - 40171'
    });
    setShowResetConfirm(false);
  };

  const handleApplyPreset = (presetSettings: typeof PRESETS[0]["settings"]) => {
    setKopSettings({
      ...kopSettings,
      ...presetSettings
    });
  };

  const isTteAutoSync = !kopSettings.tteTextJabatan1 && !kopSettings.tteTextJabatan2;

  return (
    <div className="space-y-6">
      
      {/* Intro Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 p-8 opacity-10 select-none">
          <Settings className="w-40 h-40" />
        </div>
        <div className="max-w-2xl space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5" /> Ruang Administrasi Sistem
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight font-sans">
            Fasilitas Menu Admin: Pengaturan KOP & TTE
          </h2>
          <p className="text-xs text-slate-300 leading-normal font-sans">
            Gunakan panel ini untuk merubah format Kop Surat, Logo Instansi, serta spesimen segel elektronik (TTE) yang tertera secara resmi pada Blangko PAK.
          </p>
        </div>
      </div>

      {/* Modern Horizontal Navigation Tabs (Sesuai Permintaan: Dipisah) */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('kop')}
          className={`flex items-center gap-2 py-3 px-6 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'kop'
              ? 'border-teal-600 text-teal-700 font-black'
              : 'border-transparent text-slate-450 hover:text-slate-705 hover:border-slate-300'
          }`}
        >
          <Settings className="w-4 h-4 text-teal-600" /> 1. ATUR KOP & LOGO SURAT
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tte')}
          className={`flex items-center gap-2 py-3 px-6 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer relative ${
            activeTab === 'tte'
              ? 'border-rose-600 text-rose-700 font-black'
              : 'border-transparent text-slate-450 hover:text-slate-705 hover:border-slate-300'
          }`}
        >
          <Sparkles className="w-4 h-4 text-rose-500 animate-pulse" /> 2. SET SPESIMEN TTE
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full">BARU</span>
        </button>
      </div>

      {activeTab === 'kop' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fadeIn">
        
        {/* Left Column: live editor fields (7 cols) */}
        <div className="xl:col-span-12 space-y-6">
          
          {/* LIVE KOP PREVIEW MOCKUP */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 dark-shadow space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-bounce" /> Preview Tampilan KOP Saat Ini (Kertas F4 / A4)
              </span>
              <button 
                onClick={handleReset}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Setel Ulang Default
              </button>
            </div>

            {/* Simulated Printed Paper Kop Section */}
            <div className="border border-slate-300 rounded-xl p-6 bg-slate-50/50 relative overflow-hidden select-none">
              <div className="absolute top-0 left-0 bg-teal-600 text-white text-[9px] font-black tracking-widest px-3 py-1 rounded-br-lg uppercase z-10 shadow-xs">
                MOCKUP DINAMIS KOP RESMI
              </div>
              
              <div className="bg-white p-5 border border-slate-200 rounded-lg max-w-[800px] mx-auto shadow-xs">
                <div id="live-mockup-kop-header" className="flex items-center gap-3 border-b-4 border-double border-black pb-3 select-none text-black">
                  
                  {/* Logo Container */}
                  <div className="w-16 h-18 shrink-0 flex items-center justify-center">
                    {kopSettings.logoType === 'url' && kopSettings.customLogoUrl ? (
                      <img 
                        src={kopSettings.customLogoUrl} 
                        alt="Logo Instansi" 
                        className="max-w-full max-h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <svg viewBox="0 0 100 110" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <clipPath id="ellipse-clip-mock">
                            <ellipse cx="50" cy="50" rx="35" ry="46" />
                          </clipPath>
                        </defs>
                        <ellipse cx="50" cy="50" rx="37" ry="48" fill="#fec309" stroke="#111111" strokeWidth="1.2" />
                        <ellipse cx="50" cy="50" rx="35" ry="46" fill="#15a03d" stroke="#111111" strokeWidth="0.8" />
                        <g clipPath="url(#ellipse-clip-mock)">
                          <rect x="15" y="62" width="35" height="40" fill="#0f4cc5" />
                          <path d="M15 67 Q25 72 35 67 Q43 65 50 67" stroke="#ffffff" strokeWidth="1.5" fill="none" />
                          <path d="M15 74 Q25 79 35 74 Q43 72 50 74" stroke="#ffffff" strokeWidth="1.5" fill="none" />
                          <path d="M15 81 Q25 86 35 81 Q43 79 50 81" stroke="#ffffff" strokeWidth="1.5" fill="none" />
                          <path d="M15 88 Q25 93 35 88 Q43 86 50 88" stroke="#ffffff" strokeWidth="1.5" fill="none" />
                          <rect x="50" y="62" width="35" height="40" fill="#ffffff" />
                          <rect x="50" y="62" width="8.75" height="8" fill="#0f4cc5" />
                          <rect x="67.5" y="62" width="8.75" height="8" fill="#0f4cc5" />
                          <rect x="58.75" y="70" width="8.75" height="8" fill="#0f4cc5" />
                          <rect x="76.25" y="70" width="8.75" height="8" fill="#0f4cc5" />
                          <rect x="50" y="78" width="8.75" height="8" fill="#0f4cc5" />
                          <rect x="67.5" y="78" width="8.75" height="8" fill="#0f4cc5" />
                          <rect x="58.75" y="86" width="8.75" height="8" fill="#0f4cc5" />
                          <rect x="76.25" y="86" width="8.75" height="8" fill="#0f4cc5" />
                          <g stroke="#ffffff" strokeWidth="0.5">
                            <line x1="50" y1="62" x2="50" y2="96" />
                            <line x1="58.75" y1="62" x2="58.75" y2="96" />
                            <line x1="67.5" y1="62" x2="67.5" y2="96" />
                            <line x1="76.25" y1="62" x2="76.25" y2="96" />
                          </g>
                          <path d="M 12 62 L 20 62 L 23 57 L 33 57 L 36 62 L 44 62 L 47 57 L 57 57 L 60 62 L 66 62 L 69 57 L 79 57 L 82 62 L 88 62 L 88 67 L 12 67 Z" fill="#111111" />
                        </g>
                        <rect x="48.5" y="46" width="3" height="9" rx="1" fill="#e11d48" stroke="#111111" strokeWidth="0.5" />
                        <path d="M49.5 46 C47 44 45 42 45 38 C45 37 47.5 35 48.5 35 C45 31 39 23 48 11 C48 18 52 22 54 24 C56 26 57 28 55 30 C53 32 50 34 50 37 C50 39 52 42 50 46 Z" fill="#ffffff" stroke="#111111" strokeWidth="0.6" />
                        <circle cx="51.5" cy="18" r="0.6" fill="#111111" />
                        <circle cx="52.4" cy="21" r="0.6" fill="#111111" />
                        <circle cx="53.2" cy="24" r="0.6" fill="#111111" />
                        <circle cx="53.8" cy="27" r="0.6" fill="#111111" />
                        <circle cx="53.3" cy="30" r="0.6" fill="#111111" />
                        <path d="M 33 60 C 20 45 25 25 41 12" stroke="#fec309" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                        <path d="M 23 48 Q 28 47 30 50" stroke="#fec309" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M 21 42 Q 27 41 28 44" stroke="#fec309" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M 22 36 Q 28 35 29 38" stroke="#fec309" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M 23 30 Q 29 29 30 32" stroke="#fec309" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M 26 24 Q 31 24 33 27" stroke="#fec309" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M 30 19 Q 35 20 36 23" stroke="#fec309" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M 35 15 Q 39 17 39 20" stroke="#fec309" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M 67 60 C 80 45 75 25 59 12" stroke="#15a03d" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                        <circle cx="73" cy="46" r="2.2" fill="#ffffff" stroke="#111111" strokeWidth="0.5" />
                        <circle cx="75" cy="39" r="2.2" fill="#ffffff" stroke="#111111" strokeWidth="0.5" />
                        <circle cx="74" cy="32" r="2.2" fill="#ffffff" stroke="#111111" strokeWidth="0.5" />
                        <circle cx="70" cy="25" r="2.2" fill="#ffffff" stroke="#111111" strokeWidth="0.5" />
                        <circle cx="64" cy="19" r="2.2" fill="#ffffff" stroke="#111111" strokeWidth="0.5" />
                        <path d="M 16 88 L 8 82 L 16 76 Z" fill="#d97706" stroke="#111111" strokeWidth="0.8" />
                        <path d="M 84 88 L 92 82 L 84 76 Z" fill="#d97706" stroke="#111111" strokeWidth="0.8" />
                        <path d="M 12 84 Q 50 101 88 84 L 86 75 Q 50 92 14 75 Z" fill="#fec309" stroke="#111111" strokeWidth="0.8" />
                        <path id="jabar-text-path-mock" d="M 14 82 Q 50 99 86 82" fill="none" stroke="none" />
                        <text fontFamily="Georgia, serif" fontSize="4.2" fontWeight="bold" fill="#000000" textAnchor="middle">
                          <textPath href="#jabar-text-path-mock" startOffset="50%">GEMAH RIPAH REPEH RAPIH</textPath>
                        </text>
                      </svg>
                    )}
                  </div>

                  {/* KOP text */}
                  <div className="flex-1 text-center font-serif">
                    {kopSettings.row1 ? <h2 className="text-xs md:text-xs font-black tracking-wide leading-tight uppercase">{kopSettings.row1}</h2> : <div className="h-4 bg-slate-100 rounded animate-pulse mb-1 w-1/2 mx-auto"></div>}
                    {kopSettings.row2 ? <h1 className="text-xs md:text-sm font-black tracking-normal leading-tight uppercase">{kopSettings.row2}</h1> : <div className="h-5 bg-slate-100 rounded animate-pulse mb-1 w-3/4 mx-auto"></div>}
                    {kopSettings.row3 ? <p className="text-[8px] md:text-[9px] leading-snug">{kopSettings.row3}</p> : <div className="h-3 bg-slate-100 rounded animate-pulse mb-0.5 w-5/6 mx-auto"></div>}
                    {kopSettings.row4 && <p className="text-[8px] md:text-[9px] leading-snug">{kopSettings.row4}</p>}
                    {kopSettings.row5 && <p className="text-[8px] md:text-[9px] leading-snug">{kopSettings.row5}</p>}
                    {kopSettings.row6 ? <h3 className="text-[10px] md:text-xs font-bold tracking-widest mt-0.5 uppercase">{kopSettings.row6}</h3> : <div className="h-4 bg-slate-100 rounded animate-pulse w-1/3 mx-auto"></div>}
                  </div>

                </div>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Form Fields Settings (8 cols) */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 dark-shadow space-y-4">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-105 pb-3">
                <Settings className="w-4 h-4 text-teal-600" /> Parameter Form Kop Surat
              </span>
              
              <div className="grid grid-cols-1 gap-4">
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">TIPE LOGO DI KOP</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setKopSettings({ ...kopSettings, logoType: "svg-jabar" })}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                          kopSettings.logoType === 'svg-jabar'
                            ? 'bg-teal-600 border-teal-700 text-white shadow-xs'
                            : 'bg-white border-slate-250 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Logo Jawa Barat (SVG)
                      </button>
                      <button
                        type="button"
                        onClick={() => setKopSettings({ ...kopSettings, logoType: "url" })}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                          kopSettings.logoType === 'url'
                            ? 'bg-teal-600 border-teal-700 text-white shadow-xs'
                            : 'bg-white border-slate-250 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Logo Custom (URL)
                      </button>
                    </div>
                  </div>

                  {kopSettings.logoType === 'url' && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <Image className="w-3 h-3 text-slate-400" /> URL Logo Kustom
                      </label>
                      <input
                        type="url"
                        value={kopSettings.customLogoUrl}
                        onChange={e => setKopSettings({ ...kopSettings, customLogoUrl: e.target.value })}
                        className="w-full text-xs bg-white border border-slate-355 rounded-lg p-2.5 focus:outline-teal-500"
                        placeholder="Contoh: https://example.com/logo-pemda.png"
                      />
                      <span className="text-[9px] text-slate-400 mt-1 block">Pastikan URL gambar valid dan dihosting pada layanan publik.</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 font-sans">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Baris 1 (Nama Pemerintah Daerah)</label>
                    <input
                      type="text"
                      value={kopSettings.row1}
                      onChange={e => setKopSettings({ ...kopSettings, row1: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500 font-semibold text-slate-800"
                      placeholder="Contoh: PEMERINTAH DAERAH PROVINSI JAWA BARAT"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Baris 2 (Nama Instansi Pembidang)</label>
                    <input
                      type="text"
                      value={kopSettings.row2}
                      onChange={e => setKopSettings({ ...kopSettings, row2: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500 font-extrabold text-slate-900"
                      placeholder="Contoh: DINAS PENDIDIKAN"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-550 uppercase tracking-widest mb-1">Baris 3 (Alamat Lengkap & Telepon)</label>
                    <input
                      type="text"
                      value={kopSettings.row3}
                      onChange={e => setKopSettings({ ...kopSettings, row3: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500"
                      placeholder="Contoh: Jalan Dr. Radjiman No. 6 Telp (022) 4264813"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Baris 4 (Website Instansi)</label>
                      <input
                        type="text"
                        value={kopSettings.row4}
                        onChange={e => setKopSettings({ ...kopSettings, row4: e.target.value })}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500"
                        placeholder="Contoh: disdik.jabarprov.go.id"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Baris 5 (Surel / Email Resmi)</label>
                      <input
                        type="text"
                        value={kopSettings.row5}
                        onChange={e => setKopSettings({ ...kopSettings, row5: e.target.value })}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500"
                        placeholder="Contoh: sekretariatdisdikjabar@gmail.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Baris 6 (Nama Kota & Kode Pos)</label>
                    <input
                      type="text"
                      value={kopSettings.row6}
                      onChange={e => setKopSettings({ ...kopSettings, row6: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500 font-bold"
                      placeholder="Contoh: BANDUNG - 40171"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Presets (4 cols) */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 dark-shadow space-y-4">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-105 pb-3">
                <FileText className="w-4 h-4 text-amber-500" /> Preset Dinas Pendidikan
              </span>
              
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                Memulai dengan cepat! Pilih salah satu template dinas yang sesuai di bawah ini untuk mengisi seluruh elemen Kop Surat fungsional secara otomatis.
              </p>

              <div className="flex flex-col gap-2.5 font-sans">
                {PRESETS.map((preset, index) => {
                  const isMatch = kopSettings.row1 === preset.settings.row1 && kopSettings.row2 === preset.settings.row2;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleApplyPreset(preset.settings)}
                      className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all relative ${
                        isMatch 
                          ? "bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs" 
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-extrabold text-[12px]">{preset.name}</span>
                        {isMatch && (
                          <span className="bg-emerald-600 text-white rounded-full p-0.5 flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-450 font-normal truncate mt-1">
                        {preset.settings.row1} • {preset.settings.row2}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-2 text-[11px] text-amber-900 leading-normal font-sans">
                <div className="flex items-start gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" /> Catatan Cetak
                </div>
                <p>
                  KOP Surat yang diisi di sini akan muncul langsung di lembar PDF "BLANGKO PAK RESMI" (Halaman 1, 2, dan 3) dan menyesuaikan otomatis desain format kedinasan resmi BKN Dinas Jabar.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
      )}

      {activeTab === 'tte' && (
        /* DEDICATED SEPARATE TTE SPECIMEN TAB */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 dark-shadow space-y-6 animate-fadeIn font-sans">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-500 animate-pulse" /> Menu Khusus: Parameter Pembubuhan Gambar Spesimen TTE (Global)
            </span>
            <span className="bg-rose-100 text-rose-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase select-none">
              SINKRON OTOMATIS FIRESTORE
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-normal">
            Formulir ini berfungsi khusus untuk mengunggah logo segel digital (Barcode/QR, Tanda Tangan Basah/TTE) yang dicetak di berkas PAK. Seluruh berkas PAK guru secara otomatis akan mengadaptasi spesimen ini secara dinamis.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: parameters (8 cols) */}
            <div className="lg:col-span-8 space-y-5 text-slate-750 font-sans">
              
              {/* SINKRONISASI JABATAN & UNIT KERJA SECARA OTOMATIS */}
              <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <input
                    id="auto-pejabat-sync"
                    type="checkbox"
                    checked={isTteAutoSync}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setKopSettings({
                          ...kopSettings,
                          tteTextJabatan1: '',
                          tteTextJabatan2: ''
                        });
                      } else {
                        setKopSettings({
                          ...kopSettings,
                          tteTextJabatan1: 'KEPALA CABANG DINAS PENDIDIKAN WILAYAH XIII',
                          tteTextJabatan2: 'PROVINSI JAWA BARAT'
                        });
                      }
                    }}
                    className="w-4.5 h-4.5 text-teal-600 border-slate-300 rounded focus:ring-teal-500 cursor-pointer mt-0.5"
                  />
                  <div className="space-y-1">
                    <label htmlFor="auto-pejabat-sync" className="block text-[11px] font-black text-teal-950 uppercase tracking-wider cursor-pointer">
                      SINKRONISASI JABATAN & NAMA UNIT KERJA PEJABAT SECARA OTOMATIS (REKOMENDASI)
                    </label>
                    <p className="text-[10px] text-teal-800 leading-relaxed font-semibold">
                      Harap centang ini agar data Jabatan dan Unit Kerja serta Nama pejabat penilai langsung disalin secara cerdas dari form "DATA PEJABAT PENILAI" masing-masing Guru. Anda tidak perlu mengetik ulang secara manual!
                    </p>
                    {isTteAutoSync && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[9px] font-bold mt-1 uppercase">
                        ✓ Fitur Otomatis Aktif (Menyalin Nama Jabatan & Unit Kerja secara Real-time)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">TIPE LOGO SPESIMEN TTE</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setKopSettings({ ...kopSettings, tteLogoType: 'default' })}
                      className={`py-2 px-1 rounded-lg text-[10px] font-bold border transition-all text-center cursor-pointer ${
                        (kopSettings.tteLogoType || 'default') === 'default'
                          ? 'bg-teal-600 border-teal-700 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Bawaan (Digital)
                    </button>
                    <button
                      type="button"
                      onClick={() => setKopSettings({ ...kopSettings, tteLogoType: 'url' })}
                      className={`py-2 px-1 rounded-lg text-[10px] font-bold border transition-all text-center cursor-pointer ${
                        kopSettings.tteLogoType === 'url'
                          ? 'bg-teal-600 border-teal-700 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      URL Gambar
                    </button>
                    <button
                      type="button"
                      onClick={() => setKopSettings({ ...kopSettings, tteLogoType: 'upload' })}
                      className={`py-2 px-1 rounded-lg text-[10px] font-bold border transition-all text-center cursor-pointer ${
                        kopSettings.tteLogoType === 'upload'
                          ? 'bg-teal-600 border-teal-700 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Unggah File
                    </button>
                  </div>
                </div>

                {/* Conditional inputs */}
                {kopSettings.tteLogoType === 'url' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">URL LOGO TTE KUSTOM</label>
                    <input
                      type="url"
                      value={kopSettings.tteLogoUrl || ''}
                      onChange={e => setKopSettings({ ...kopSettings, tteLogoUrl: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:outline-teal-500 font-mono"
                      placeholder="https://example.com/logo-tte.png"
                    />
                  </div>
                )}

                {kopSettings.tteLogoType === 'upload' && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">UNGGAH FILE GAMBAR LOGO</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = async () => {
                            if (typeof reader.result === 'string') {
                              try {
                                const compressedObj = await compressLogoImage(reader.result);
                                setKopSettings({ ...kopSettings, tteLogoBase64: compressedObj });
                              } catch (err) {
                                setKopSettings({ ...kopSettings, tteLogoBase64: reader.result });
                              }
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="text-xs w-full text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer focus:outline-none"
                    />
                    {kopSettings.tteLogoBase64 && (
                      <div className="flex items-center gap-1.5 p-1 bg-white border rounded mt-1">
                        <span className="text-[9px] text-emerald-600 font-bold">✓ Sudah Terunggah Offline & Cloud!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-755 font-sans">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">TEKS HEADER SPESIMEN</label>
                  <input
                    type="text"
                    value={kopSettings.tteTextHeader || ''}
                    onChange={e => setKopSettings({ ...kopSettings, tteTextHeader: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500"
                    placeholder="Contoh: Ditandatangani secara elektronik oleh :"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">TEKS JABATAN BARIS 1</label>
                  <input
                    type="text"
                    disabled={isTteAutoSync}
                    value={isTteAutoSync ? '[Menyalin Otomatis Dari Data Pejabat Penilai]' : (kopSettings.tteTextJabatan1 || '')}
                    onChange={e => setKopSettings({ ...kopSettings, tteTextJabatan1: e.target.value })}
                    className={`w-full text-xs border rounded-lg p-2.5 font-bold uppercase transition-colors ${
                      isTteAutoSync 
                        ? 'bg-slate-100 border-slate-200 text-slate-450 italic cursor-not-allowed'
                        : 'bg-white border-slate-300 text-slate-900 focus:outline-teal-500'
                    }`}
                    placeholder="Kosongkan untuk menyalin dari jabatan Pejabat Penilai"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">TEKS JABATAN BARIS 2</label>
                  <input
                    type="text"
                    disabled={isTteAutoSync}
                    value={isTteAutoSync ? '[Menyalin Otomatis Dari Data Pejabat Penilai]' : (kopSettings.tteTextJabatan2 || '')}
                    onChange={e => setKopSettings({ ...kopSettings, tteTextJabatan2: e.target.value })}
                    className={`w-full text-xs border rounded-lg p-2.5 font-bold uppercase transition-colors ${
                      isTteAutoSync 
                        ? 'bg-slate-100 border-slate-200 text-slate-450 italic cursor-not-allowed'
                        : 'bg-white border-slate-300 text-slate-900 focus:outline-teal-500'
                    }`}
                    placeholder="Kosongkan untuk menyalin dari instansi / unit-kerja Pejabat Penilai"
                  />
                </div>
              </div>
            </div>

            {/* Right side: live preview (4 cols) */}
            <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center space-y-4 font-sans">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b pb-1.5 w-full text-center">
                Preview TTE Spesimen Aktif
              </span>

              <div className="border border-slate-300 rounded-xl p-3 bg-white shadow-xs max-w-[280px] w-full flex flex-col items-center select-none text-center">
                <span className="text-[8px] font-bold text-slate-400 block mb-2 uppercase tracking-wide">Lembar TTE PAK</span>
                
                <div className="border-[1.5px] border-black rounded-[15px] p-2.5 flex items-center gap-2 bg-white w-full">
                  {/* Logo Frame */}
                  <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center border rounded-lg bg-slate-50 overflow-hidden">
                    {kopSettings.tteLogoType === 'upload' && kopSettings.tteLogoBase64 ? (
                      <img src={kopSettings.tteLogoBase64} className="max-w-full max-h-full object-contain" />
                    ) : kopSettings.tteLogoType === 'url' && kopSettings.tteLogoUrl ? (
                      <img src={kopSettings.tteLogoUrl} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="text-[8px] text-rose-500 font-black font-mono">TTE</div>
                    )}
                  </div>

                  {/* Text Frame */}
                  <div className="text-left text-[8px] leading-snug font-sans text-slate-800">
                    <p className="italic text-slate-650 mb-0.5">{kopSettings.tteTextHeader || 'Ditandatangani secara elektronik oleh :'}</p>
                    <p className="font-extrabold text-black uppercase truncate max-w-[150px]">
                      {isTteAutoSync ? 'JABATAN PEJABAT PENILAI' : (kopSettings.tteTextJabatan1 || 'KEPALA CABANG DINAS PENDIDIKAN')}
                    </p>
                    <p className="font-extrabold text-black uppercase truncate max-w-[150px]">
                      {isTteAutoSync ? 'UK / INSTANSI PENILAI' : (kopSettings.tteTextJabatan2 || 'PROVINSI JAWA BARAT')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-rose-50 text-rose-900 border border-rose-100 rounded-lg p-3 text-[10px] leading-relaxed">
                <strong>Catatan Sinkronisasi Cloud:</strong> Seluruh berkas spesimen dan logo disimpan secara aman di cloud database Firestore dan didistribusikan ke lembar laporan. Proses upload logo hanya perlu dilakukan sekali saja tanpa kuatir hilang sewaktu melakukan logout!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn text-slate-100 font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 bg-amber-500/15 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-spin-reverse">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-100 uppercase tracking-tight">Kembalikan Default</h3>
              <p className="text-xs text-slate-400">
                Apakah Anda yakin ingin mengembalikan KOP ke setelan default Provinsi Jawa Barat? Seluruh baris teks kepala surat akan di-reset otomatis.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold text-xs rounded-xl border border-slate-705 cursor-pointer transition-colors"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={executeReset}
                className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-450 text-slate-900 font-extrabold text-xs rounded-xl border border-amber-400 cursor-pointer transition-colors"
              >
                YA, ATUR ULANG
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
