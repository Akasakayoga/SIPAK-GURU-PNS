import React, { useMemo, useState, useEffect } from 'react';
import { TeacherProfile, SKPEvaluation, KopSettings } from '../types';
import { GOLONGAN_LIST, getTeacherLevel, GOLONGAN_BASE_VALS, getMinimalPangkat, getMinimalJenjang } from '../data/golonganData';
import { Printer, Edit3, Check, Calendar, AlertCircle, FileText, Landmark, User, Mail, Globe, Settings, GraduationCap, Download, Loader2 } from 'lucide-react';

interface OfficialPAKReportProps {
  profile: TeacherProfile;
  setProfile: (profile: TeacherProfile) => void;
  evaluations: SKPEvaluation[];
  kopSettings?: KopSettings;
  setKopSettings?: (settings: KopSettings) => void;
}

export default function OfficialPAKReport({
  profile,
  setProfile,
  evaluations,
  kopSettings: propKopSettings,
  setKopSettings: propSetKopSettings
}: OfficialPAKReportProps) {
  // Local state as fallback if not passed as props
  const [localKopSettings, setLocalKopSettings] = useState<KopSettings>(() => {
    const saved = localStorage.getItem('sipak_kop_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      logoType: 'svg-jabar' as 'svg-jabar' | 'url',
      customLogoUrl: '',
      row1: 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
      row2: 'DINAS PENDIDIKAN',
      row3: 'Jalan. Dr. Radjiman No. 6 Telp (022) 4264813 Fax. (022) 4264881',
      row4: 'Website : disdik.jabarprov.go.id',
      row5: 'e-mail: disdik@jabar.prov.go.id / sekretariatdisdikjabar@gmail.com',
      row6: 'BANDUNG - 40171'
    };
  });

  const kopSettings = propKopSettings || localKopSettings;
  const setKopSettings = propSetKopSettings || setLocalKopSettings;

  useEffect(() => {
    if (!propKopSettings) {
      localStorage.setItem('sipak_kop_settings', JSON.stringify(localKopSettings));
    }
  }, [localKopSettings, propKopSettings]);

  const [isDownloading, setIsDownloading] = useState(false);

  const loadHtml2Pdf = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).html2pdf) {
        resolve((window as any).html2pdf);
        return;
      }

      // Try unpkg first as it has high uptime and parses without SRI restrictions in iframes
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
      
      script.onload = () => {
        if ((window as any).html2pdf) {
          resolve((window as any).html2pdf);
        } else {
          script.onerror!(new Event('fail_load'));
        }
      };
      
      script.onerror = () => {
        // Fallback to cdnjs CDN if unpkg has network blocks
        const fallbackScript = document.createElement('script');
        fallbackScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        
        fallbackScript.onload = () => {
          if ((window as any).html2pdf) {
            resolve((window as any).html2pdf);
          } else {
            fallbackScript.onerror!(new Event('fail_fallback'));
          }
        };
        
        fallbackScript.onerror = () => {
          reject(new Error("Gagal mengunduh pustaka PDF (html2pdf.js) karena pembatasan jaringan / CORS di sandbox. Silakan gunakan opsi 'Cetak via Browser' (Simpan sebagai PDF) yang terbukti 100% stabil!"));
        };
        
        document.body.appendChild(fallbackScript);
      };
      
      document.body.appendChild(script);
    });
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    const restores: Array<{ rule: CSSStyleRule; prop: string; originalVal: string }> = [];
    let tempDiv: HTMLDivElement | null = null;
    
    try {
      const html2pdf = await loadHtml2Pdf();
      
      // Temporarily add a class to body to prevent any overflow issues during capture
      document.body.classList.add('capturing-pdf');
      
      const element = document.getElementById('pak-print-pages');
      if (!element) {
        alert("Elemen laporan tidak ditemukan.");
        return;
      }

      // Create a temporary element to let the browser convert oklch colors to rgb automatically
      tempDiv = document.createElement('div');
      tempDiv.style.display = 'none';
      document.body.appendChild(tempDiv);

      const convertColor = (val: string): string => {
        if (!val || typeof val !== 'string' || !val.includes('oklch')) {
          return val;
        }
        if (tempDiv) {
          tempDiv.style.color = '';
          tempDiv.style.color = val;
          const computed = getComputedStyle(tempDiv).color;
          if (computed && !computed.includes('oklch')) {
            return computed;
          }
        }
        return '#808080'; // secure fallback value
      };

      // Iterate through active stylesheets to translate oklch rules on the fly
      for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i];
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (!rules) continue;
          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j];
            if (rule instanceof CSSStyleRule && rule.style) {
              const style = rule.style;
              
              // 1. Sanitize index-based styles
              for (let k = 0; k < style.length; k++) {
                const prop = style[k];
                const val = style.getPropertyValue(prop);
                if (val && val.includes('oklch')) {
                  const newVal = convertColor(val);
                  if (newVal !== val) {
                    restores.push({ rule, prop, originalVal: val });
                    style.setProperty(prop, newVal);
                  }
                }
              }
              
              // 2. Sanitize custom properties / CSS variables that may not be enumerated by standard index
              const cssText = rule.cssText;
              if (cssText && cssText.includes('oklch')) {
                const varMatches = cssText.match(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+)/g);
                if (varMatches) {
                  varMatches.forEach(m => {
                    const colonIdx = m.indexOf(':');
                    if (colonIdx > 0) {
                      const propName = m.substring(0, colonIdx).trim();
                      const propVal = m.substring(colonIdx + 1).trim();
                      if (propVal.includes('oklch')) {
                        const newVal = convertColor(propVal);
                        if (newVal !== propVal) {
                          restores.push({ rule, prop: propName, originalVal: propVal });
                          rule.style.setProperty(propName, newVal);
                        }
                      }
                    }
                  });
                }
              }
            }
          }
        } catch (e) {
          // Safely skip cross-origin style rule errors
        }
      }
      
      const opt = {
        margin:       [0, 0, 0, 0],
        filename:     `PAK_${profile.name.replace(/\s+/g, '_')}_NIP_${profile.nip}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true,
          scrollY: 0,
          scrollX: 0
        },
        jsPDF:        { unit: 'mm', format: [215, 330], orientation: 'portrait' }, // F4 dimensions
        pagebreak:    { mode: ['css', 'legacy'] }
      };
      
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Gagal mengunduh PDF:", error);
      alert("Gagal mengunduh PDF: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      // Pristinely restore all original oklch color configurations
      restores.forEach(({ rule, prop, originalVal }) => {
        try {
          rule.style.setProperty(prop, originalVal);
        } catch (err) {
          // silent ignore
        }
      });
      
      if (tempDiv && tempDiv.parentNode) {
        tempDiv.parentNode.removeChild(tempDiv);
      }
      
      document.body.classList.remove('capturing-pdf');
      setIsDownloading(false);
    }
  };

  const handleMetaChange = (key: keyof TeacherProfile, value: any) => {
    setProfile({
      ...profile,
      [key]: value
    });
  };

  // Find latest evaluation for Page 1 ("BARU")
  const sortedEvaluations = useMemo(() => {
    return [...evaluations].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year; // Latest first
      // If same year, sort by period (Tahunan is latest, then Triwulan active)
      if (a.period === 'Tahunan') return -1;
      if (b.period === 'Tahunan') return 1;
      return b.period.localeCompare(a.period);
    });
  }, [evaluations]);

  const sortedEvaluationsChrono = useMemo(() => {
    return [...evaluations].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year; // Oldest first
      if (a.period === 'Tahunan' && b.period !== 'Tahunan') return 1;
      if (b.period === 'Tahunan' && a.period !== 'Tahunan') return -1;
      return a.period.localeCompare(b.period);
    });
  }, [evaluations]);

  const latestEval = useMemo<SKPEvaluation | null>(() => {
    return sortedEvaluations[0] || null;
  }, [sortedEvaluations]);

  // Calculations
  const totalKonversi = useMemo(() => {
    return evaluations.reduce((sum, item) => sum + (item.creditEarned || 0), 0) + (profile.akIntegrasi2022 || 0);
  }, [evaluations, profile.akIntegrasi2022]);

  // Page 3 Konversi Breakdown:
  // "BARU" is latestEval
  // "LAMA" is everything else including PAK Integrasi 2022
  const { konversiLama, konversiBaru, konversiJumlah } = useMemo(() => {
    if (!latestEval) {
      return { konversiLama: profile.akIntegrasi2022 || 0, konversiBaru: 0, konversiJumlah: profile.akIntegrasi2022 || 0 };
    }
    const baru = latestEval.creditEarned || 0;
    const lama = evaluations
      .filter(item => item.id !== latestEval.id)
      .reduce((sum, item) => sum + (item.creditEarned || 0), 0) + (profile.akIntegrasi2022 || 0);
    return {
      konversiLama: lama,
      konversiBaru: baru,
      konversiJumlah: lama + baru
    };
  }, [evaluations, latestEval, profile.akIntegrasi2022]);

  const { pendidikanLama, pendidikanBaru, pendidikanJumlah } = useMemo(() => {
    const baru = latestEval ? (latestEval.akPendidikan || 0) : 0;
    const lama = (profile.akPendidikan || 0) + evaluations
      .filter(item => !latestEval || item.id !== latestEval.id)
      .reduce((sum, item) => sum + (item.akPendidikan || 0), 0);
    return {
      pendidikanLama: lama,
      pendidikanBaru: baru,
      pendidikanJumlah: lama + baru
    };
  }, [evaluations, latestEval, profile.akPendidikan]);

  // Grand Total cumulative (Row 4 + Row 5)
  const accumLama = useMemo(() => {
    return konversiLama + pendidikanLama;
  }, [konversiLama, pendidikanLama]);

  const accumBaru = useMemo(() => {
    return konversiBaru + pendidikanBaru;
  }, [konversiBaru, pendidikanBaru]);

  const accumJumlah = useMemo(() => {
    return accumLama + accumBaru;
  }, [accumLama, accumBaru]);

  // Targets and Deficits mapping
  const currentDetail = useMemo(() => {
    return GOLONGAN_LIST.find(g => g.id === profile.currentGolongan) || GOLONGAN_LIST[0];
  }, [profile.currentGolongan]);

  const targetDetail = useMemo(() => {
    return GOLONGAN_LIST.find(g => g.id === profile.targetGolongan) || GOLONGAN_LIST[1];
  }, [profile.targetGolongan]);

  // Clean, modern alignment with BKN incremental standards (replaces flawed absolute targets)
  const minimalPangkat = useMemo(() => {
    return getMinimalPangkat(profile.currentGolongan);
  }, [profile.currentGolongan]);

  const minimalJenjang = useMemo(() => {
    return getMinimalJenjang(profile.currentGolongan);
  }, [profile.currentGolongan]);

  const kekuranganPangkat = useMemo(() => {
    if (minimalPangkat <= 0) return 0;
    const gap = minimalPangkat - accumJumlah;
    return gap > 0 ? gap : 0;
  }, [minimalPangkat, accumJumlah]);

  const kekuranganJenjang = useMemo(() => {
    if (minimalJenjang <= 0) return 0;
    const gap = minimalJenjang - accumJumlah;
    return gap > 0 ? gap : 0;
  }, [minimalJenjang, accumJumlah]);

  const isPangkatSurplus = useMemo(() => {
    return accumJumlah >= minimalPangkat;
  }, [accumJumlah, minimalPangkat]);

  const isJenjangSurplus = useMemo(() => {
    return accumJumlah >= minimalJenjang;
  }, [accumJumlah, minimalJenjang]);

  const pangkatDiffValue = useMemo(() => {
    if (minimalPangkat <= 0) return 0;
    return Math.abs(accumJumlah - minimalPangkat);
  }, [accumJumlah, minimalPangkat]);

  const jenjangDiffValue = useMemo(() => {
    if (minimalJenjang <= 0) return 0;
    return Math.abs(accumJumlah - minimalJenjang);
  }, [accumJumlah, minimalJenjang]);

  const isLolosPangkat = kekuranganPangkat <= 0;
  
  const isJenjangChange = useMemo(() => {
    const curLevel = getTeacherLevel(profile.currentGolongan);
    const tgtLevel = getTeacherLevel(profile.targetGolongan);
    return curLevel !== tgtLevel;
  }, [profile.currentGolongan, profile.targetGolongan]);

  const recommendationText = useMemo(() => {
    const tgtLevel = getTeacherLevel(profile.targetGolongan);
    const targetPangkatName = targetDetail.pangkat.replace(/\(s1\)/i, '').trim().toUpperCase();
    
    if (isLolosPangkat) {
      if (isJenjangChange) {
        return `DAPAT DIPERTIMBANGKAN UNTUK KENAIKAN JENJANG JABATAN SETINGKAT LEBIH TINGGI MENJADI GURU ${tgtLevel.toUpperCase()} PANGKAT/GOLONGAN RUANG ${targetPangkatName} (${profile.targetGolongan}).`;
      } else {
        return `DAPAT DIPERTIMBANGKAN UNTUK KENAIKAN PANGKAT SETINGKAT LEBIH TINGGI MENJADI PANGKAT/GOLONGAN RUANG ${targetPangkatName} (${profile.targetGolongan}).`;
      }
    } else {
      if (isJenjangChange) {
        return `TIDAK DAPAT DIPERTIMBANGKAN UNTUK KENAIKAN JENJANG JABATAN SETINGKAT LEBIH TINGGI MENJADI GURU ${tgtLevel.toUpperCase()} PANGKAT/GOLONGAN RUANG ${targetPangkatName} (${profile.targetGolongan}).`;
      } else {
        return `TIDAK DAPAT DIPERTIMBANGKAN UNTUK KENAIKAN PANGKAT SETINGKAT LEBIH TINGGI MENJADI PANGKAT/GOLONGAN RUANG ${targetPangkatName} (${profile.targetGolongan}).`;
      }
    }
  }, [isLolosPangkat, isJenjangChange, profile.targetGolongan, targetDetail]);
  
  const formattedPeriode = useMemo(() => {
    if (!latestEval) {
      return "01-01-2025 s.d 31-12-2025";
    }
    
    if (latestEval.startDate && latestEval.endDate) {
      const formatPart = (dateStr: string) => {
        const p = dateStr.split('-');
        if (p.length === 3) {
          return `${p[2]}-${p[1]}-${p[0]}`;
        }
        return dateStr;
      };
      return `${formatPart(latestEval.startDate)} s.d. ${formatPart(latestEval.endDate)}`;
    }
    
    const year = latestEval.year;
    switch (latestEval.period) {
      case 'Tahunan':
        return `01-01-${year} s.d 31-12-${year}`;
      case 'Triwulan I':
        return `01-01-${year} s.d 31-03-${year}`;
      case 'Triwulan II':
        return `01-04-${year} s.d 30-06-${year}`;
      case 'Triwulan III':
        return `01-07-${year} s.d 30-09-${year}`;
      case 'Triwulan IV':
        return `01-10-${year} s.d 31-12-${year}`;
      default:
        const pLower = latestEval.period.toLowerCase();
        if (pLower.includes('september') && pLower.includes('desember')) {
          return `01-09-${year} s.d 31-12-${year}`;
        }
        return `01-01-${year} s.d 31-12-${year}`;
    }
  }, [latestEval]);
  
  // Custom helper to render dynamic institutional Letter Header
  const renderGovHeader = () => (
    <div className="flex items-center gap-4 border-b-4 border-double border-black pb-3 mb-4 text-black select-none">
      {/* High-fidelity SVG of West Java Coat of Arms (Logo Jabar) or Custom Image URL */}
      <div className="w-20 h-22 shrink-0 flex items-center justify-center">
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
              <clipPath id="ellipse-clip-header">
                <ellipse cx="50" cy="50" rx="35" ry="46" />
              </clipPath>
            </defs>
            
            {/* Outer yellow border shield */}
            <ellipse cx="50" cy="50" rx="37" ry="48" fill="#fec309" stroke="#111111" strokeWidth="1.2" />
            <ellipse cx="50" cy="50" rx="35" ry="46" fill="#15a03d" stroke="#111111" strokeWidth="0.8" />
            
            {/* Clipped content */}
            <g clipPath="url(#ellipse-clip-header)">
              {/* Split bottom left: Blue and White waves */}
              <rect x="15" y="62" width="35" height="40" fill="#0f4cc5" />
              {/* Waves lines */}
              <path d="M15 67 Q25 72 35 67 Q43 65 50 67" stroke="#ffffff" strokeWidth="1.5" fill="none" />
              <path d="M15 74 Q25 79 35 74 Q43 72 50 74" stroke="#ffffff" strokeWidth="1.5" fill="none" />
              <path d="M15 81 Q25 86 35 81 Q43 79 50 81" stroke="#ffffff" strokeWidth="1.5" fill="none" />
              <path d="M15 88 Q25 93 35 88 Q43 86 50 88" stroke="#ffffff" strokeWidth="1.5" fill="none" />
              
              {/* Split bottom right: Blue and White checks */}
              <rect x="50" y="62" width="35" height="40" fill="#ffffff" />
              {/* Checkers layout */}
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

              {/* Black fortress/dam dividing bar */}
              <path d="M 12 62 L 20 62 L 23 57 L 33 57 L 36 62 L 44 62 L 47 57 L 57 57 L 60 62 L 66 62 L 69 57 L 79 57 L 82 62 L 88 62 L 88 67 L 12 67 Z" fill="#111111" />
            </g>

            {/* Central Kujang standing vertically */}
            <rect x="48.5" y="46" width="3" height="9" rx="1" fill="#e11d48" stroke="#111111" strokeWidth="0.5" />
            <path d="M49.5 46 C47 44 45 42 45 38 C45 37 47.5 35 48.5 35 C45 31 39 23 48 11 C48 18 52 22 54 24 C56 26 57 28 55 30 C53 32 50 34 50 37 C50 39 52 42 50 46 Z" fill="#ffffff" stroke="#111111" strokeWidth="0.6" />
            <circle cx="51.5" cy="18" r="0.6" fill="#111111" />
            <circle cx="52.4" cy="21" r="0.6" fill="#111111" />
            <circle cx="53.2" cy="24" r="0.6" fill="#111111" />
            <circle cx="53.8" cy="27" r="0.6" fill="#111111" />
            <circle cx="53.3" cy="30" r="0.6" fill="#111111" />

            {/* Curved Rice (Left) */}
            <path d="M 33 60 C 20 45 25 25 41 12" stroke="#fec309" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <path d="M 23 48 Q 28 47 30 50" stroke="#fec309" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 21 42 Q 27 41 28 44" stroke="#fec309" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 22 36 Q 28 35 29 38" stroke="#fec309" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 23 30 Q 29 29 30 32" stroke="#fec309" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 26 24 Q 31 24 33 27" stroke="#fec309" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 30 19 Q 35 20 36 23" stroke="#fec309" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 35 15 Q 39 17 39 20" stroke="#fec309" strokeWidth="1.5" strokeLinecap="round" />

            {/* Curved Cotton (Right) */}
            <path d="M 67 60 C 80 45 75 25 59 12" stroke="#15a03d" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <circle cx="73" cy="46" r="2.2" fill="#ffffff" stroke="#111111" strokeWidth="0.5" />
            <circle cx="75" cy="39" r="2.2" fill="#ffffff" stroke="#111111" strokeWidth="0.5" />
            <circle cx="74" cy="32" r="2.2" fill="#ffffff" stroke="#111111" strokeWidth="0.5" />
            <circle cx="70" cy="25" r="2.2" fill="#ffffff" stroke="#111111" strokeWidth="0.5" />
            <circle cx="64" cy="19" r="2.2" fill="#ffffff" stroke="#111111" strokeWidth="0.5" />

            {/* Golden ribbon at the bottom */}
            <path d="M 16 88 L 8 82 L 16 76 Z" fill="#d97706" stroke="#111111" strokeWidth="0.8" />
            <path d="M 84 88 L 92 82 L 84 76 Z" fill="#d97706" stroke="#111111" strokeWidth="0.8" />
            <path d="M 12 84 Q 50 101 88 84 L 86 75 Q 50 92 14 75 Z" fill="#fec309" stroke="#111111" strokeWidth="0.8" />
            
            <path id="jabar-text-path-header" d="M 14 82 Q 50 99 86 82" fill="none" stroke="none" />
            <text fontFamily="Georgia, serif" fontSize="4.2" fontWeight="bold" fill="#000000" textAnchor="middle">
              <textPath href="#jabar-text-path-header" startOffset="50%">GEMAH RIPAH REPEH RAPIH</textPath>
            </text>
          </svg>
        )}
      </div>

      <div className="flex-1 text-center font-serif">
        {kopSettings.row1 && <h2 className="text-base font-black tracking-wide leading-tight uppercase">{kopSettings.row1}</h2>}
        {kopSettings.row2 && <h1 className="text-xl font-black tracking-normal leading-tight uppercase">{kopSettings.row2}</h1>}
        {kopSettings.row3 && <p className="text-[11px] leading-snug">{kopSettings.row3}</p>}
        {kopSettings.row4 && <p className="text-[11px] leading-snug">{kopSettings.row4}</p>}
        {kopSettings.row5 && <p className="text-[11px] leading-snug">{kopSettings.row5}</p>}
        {kopSettings.row6 && <h3 className="text-xs font-bold tracking-widest mt-0.5 uppercase">{kopSettings.row6}</h3>}
      </div>
    </div>
  );

  // Reusable Personal Details Table
  const renderPersonalTable = () => (
    <div className="border border-black text-[11px] text-black w-full my-3 font-serif">
      <div className="bg-slate-100 font-bold text-center border-b border-black py-1 select-none tracking-wide text-[10px]">
        PEJABAT FUNGSIONAL YANG DINILAI
      </div>
      <table className="w-full text-left border-collapse">
        <tbody>
          <tr className="border-b border-black">
            <td className="py-1 px-2 w-[5%] text-center border-r border-black font-semibold">1</td>
            <td className="py-1 px-2 w-[35%] border-r border-black font-semibold">NAMA</td>
            <td className="py-1 px-2">: {profile.name || "___________________________"}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="py-1 px-2 text-center border-r border-black font-semibold">2</td>
            <td className="py-1 px-2 border-r border-black font-semibold">NIP</td>
            <td className="py-1 px-2 font-mono text-[10.5px]">: {profile.nip || "___________________________"}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="py-1 px-2 text-center border-r border-black font-semibold">3</td>
            <td className="py-1 px-2 border-r border-black font-semibold">NOMOR SERI KARPEG</td>
            <td className="py-1 px-2 font-mono text-[10.5px]">: {profile.karpegNumber || "-"}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="py-1 px-2 text-center border-r border-black font-semibold">4</td>
            <td className="py-1 px-2 border-r border-black font-semibold">TEMPAT/TGL. LAHIR</td>
            <td className="py-1 px-2">: {profile.birthPlaceDate || "___________________________"}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="py-1 px-2 text-center border-r border-black font-semibold">5</td>
            <td className="py-1 px-2 border-r border-black font-semibold">JENIS KELAMIN</td>
            <td className="py-1 px-2">: {profile.gender || "Laki-Laki"}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="py-1 px-2 text-center border-r border-black font-semibold">6</td>
            <td className="py-1 px-2 border-r border-black font-semibold">PANGKAT/GOLONGAN RUANG TMT</td>
            <td className="py-1 px-2">: {currentDetail.pangkat} / {profile.currentGolongan} / {profile.tmtCurrentPangkat || "01-04-2024"}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="py-1 px-2 text-center border-r border-black font-semibold">7</td>
            <td className="py-1 px-2 border-r border-black font-semibold">JABATAN/TMT</td>
            <td className="py-1 px-2">: JABATAN GURU {getTeacherLevel(profile.currentGolongan).toUpperCase()} / {profile.tmtCurrentJabatan || "24-08-2023"}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="py-1 px-2 text-center border-r border-black font-semibold">8</td>
            <td className="py-1 px-2 border-r border-black font-semibold">UNIT KERJA</td>
            <td className="py-1 px-2">: {profile.unitKerja || profile.school || "___________________________"}</td>
          </tr>
          <tr>
            <td className="py-1 px-2 text-center border-r border-black font-semibold">9</td>
            <td className="py-1 px-2 border-r border-black font-semibold">INSTANSI</td>
            <td className="py-1 px-2">: {profile.instansiBiro || "PEMERINTAH PROVINSI JAWA BARAT"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  // Reusable Signatures Block (Jabar Style with ESD QR box)
  const renderSignatureBlock = () => (
    <div className="pt-6 grid grid-cols-2 gap-4 text-[10.5px] text-black font-serif my-4 select-none leading-normal">
      <div>
        <p className="font-semibold italic">ASLI Penetapan Angka Kredit untuk:</p>
        <p className="font-bold underline uppercase">{profile.name}</p>
        
        <div className="mt-4">
          <p className="font-semibold">Tembusan disampaikan kepada:</p>
          <ol className="list-decimal pl-4 space-y-0.5 text-[9.5px]">
            <li>Yth. Pimpinan Instansi Pembina Jabatan Fungsional yang bersangkutan;</li>
            <li>Yth. Kepala Badan Kepegawaian Negara/Kepala Kantor Regional III BKN;</li>
            <li>Yth. Sekretaris Daerah Provinsi Jawa Barat;</li>
            <li>Yth. Kepala Dinas Pendidikan;</li>
            <li>Yth. Sekretaris Tim Penilai Kinerja PNS Pemerintah Provinsi Jawa Barat.</li>
          </ol>
        </div>
      </div>

      <div className="pl-6 border-l border-dashed border-slate-300">
        <p>Ditetapkan di : {profile.tempatDitetapkan || "Bandung"}</p>
        <p>Pada tanggal : {profile.tanggalPenetapan || "02 April 2026"}</p>
        <div className="mt-2 text-[10px]">
          <p className="font-bold uppercase">Pejabat Penilai Kinerja</p>
          <p className="font-bold uppercase text-[9px] text-slate-800">{profile.pejabatPenilaiTitle || "KEPALA CABANG PENDIDIKAN WILAYAH XIII"}</p>
          <p className="font-bold uppercase text-[9px] text-slate-800">{profile.pejabatPenilaiInstansi || "PROVINSI JAWA BARAT"}</p>
        </div>

        {/* ESD Signature Box lookalike */}
        <div className="my-3 border border-slate-300 rounded p-1.5 flex items-center gap-3 bg-slate-50/50 w-full max-w-[280px]">
          <div className="w-10 h-10 shrink-0 bg-white border border-teal-500 rounded p-0.5">
            {/* Dynamic CSS Electronic seal lookalike */}
            <svg viewBox="0 0 50 50" className="w-full h-full text-teal-600">
              <path d="M25 2 C12 2 2 12 2 25 C2 38 12 48 25 48 C38 48 48 38 48 25" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M25 8 L25 42 M8 25 L42 25" stroke="currentColor" strokeWidth="1" strokeDasharray="2" />
              <circle cx="25" cy="25" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
              <rect x="22" y="22" width="6" height="6" fill="currentColor" />
            </svg>
          </div>
          <div className="text-[8.5px] leading-tight font-sans">
            <p className="text-slate-505 italic text-[7.5px]">Ditandatangani secara elektronik oleh :</p>
            <p className="font-bold text-teal-900 uppercase">KEPALA CABANG PENDIDIKAN</p>
            <p className="font-bold text-slate-800 text-[8px] uppercase">{profile.pejabatPenilaiInstansi || "WILAYAH XIII PROVINSI JAWA BARAT"}</p>
          </div>
        </div>

        <div className="text-[10px]">
          <p className="font-bold underline uppercase">{profile.pejabatPenilaiNama || "DWI YANTI ESTRININGRUM, S.Sos., M.Pd."}</p>
          <p className="font-medium text-slate-700">{profile.pejabatPenilaiGolongan || "Pembina Tk.I"}</p>
          {profile.pejabatPenilaiNip && (
            <p className="font-mono text-[9px] text-slate-500">NIP. {profile.pejabatPenilaiNip}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div id="official-pak-tab" className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      
      {/* Editor Sidebar Left (5 cols) */}
      <div className="xl:col-span-5 bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4 print:hidden">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
            <Landmark className="w-5 h-5 text-teal-600" /> Konfigurasi Blangko PAK Resmi
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Data di bawah ini akan diisikan ke dalam format lampiran asli Pemerintah Daerah Provinsi Jawa Barat Dinas Pendidikan.
          </p>
        </div>

        <div className="space-y-4 max-h-[750px] overflow-y-auto pr-2">
          
          {/* Section 1: Identitas Fungsional */}
          <div className="bg-slate-50/50 p-3.5 rounded-lg border border-slate-150 space-y-3">
            <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> 1. Data Personal Pegawai
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">NOMOR SERI KARPEG</label>
                <input
                  type="text"
                  value={profile.karpegNumber || ''}
                  onChange={e => handleMetaChange('karpegNumber', e.target.value.toUpperCase())}
                  className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500 font-mono"
                  placeholder="Contoh: B03023705"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">JENIS KELAMIN</label>
                <select
                  value={profile.gender || 'Laki-Laki'}
                  onChange={e => handleMetaChange('gender', e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500"
                >
                  <option value="Laki-Laki">Laki-Laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">TEMPAT, TANGGAL LAHIR</label>
              <input
                type="text"
                value={profile.birthPlaceDate || ''}
                onChange={e => handleMetaChange('birthPlaceDate', e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500"
                placeholder="Contoh: CIAMIS, 19-06-1986"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">TMT GOLONGAN TERAKHIR</label>
                <input
                  type="text"
                  value={profile.tmtCurrentPangkat || ''}
                  onChange={e => handleMetaChange('tmtCurrentPangkat', e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500 font-mono"
                  placeholder="Contoh: 01-04-2024"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">TMT JABATAN FUNGSIONAL Guru</label>
                <input
                  type="text"
                  value={profile.tmtCurrentJabatan || ''}
                  onChange={e => handleMetaChange('tmtCurrentJabatan', e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500 font-mono"
                  placeholder="Contoh: 24-08-2023"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">UNIT KERJA LENGKAP</label>
              <input
                type="text"
                value={profile.unitKerja || ''}
                onChange={e => handleMetaChange('unitKerja', e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500"
                placeholder="Contoh: SMAN 2 CIAMIS KABUPATEN CIAMIS CABANG..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">INSTANSI INDUK</label>
              <input
                type="text"
                value={profile.instansiBiro || ''}
                onChange={e => handleMetaChange('instansiBiro', e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500"
                placeholder="Contoh: PEMERINTAH PROVINSI JAWA BARAT"
              />
            </div>

          </div>

          {/* Section 2: Administrasi Nomer Surat */}
          <div className="bg-slate-50/50 p-3.5 rounded-lg border border-slate-150 space-y-3">
            <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> 2. Nomor Surat Keputusan (PAK)
            </h4>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">NOMOR SK HALAMAN 1 (KONVERSI SKP)</label>
              <input
                type="text"
                value={profile.nomorSuratKonversi || ''}
                onChange={e => handleMetaChange('nomorSuratKonversi', e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500 font-mono"
                placeholder="Nomor SK"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">NOMOR SK HALAMAN 2 (AKUMULASI SKP)</label>
              <input
                type="text"
                value={profile.nomorSuratAkumulasi || ''}
                onChange={e => handleMetaChange('nomorSuratAkumulasi', e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500 font-mono"
                placeholder="Nomor SK"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">NOMOR SK HALAMAN 3 (PENETAPAN ANGKA KREDIT)</label>
              <input
                type="text"
                value={profile.nomorSuratPenetapan || ''}
                onChange={e => handleMetaChange('nomorSuratPenetapan', e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500 font-mono"
                placeholder="Nomor SK"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">TEMPAT DITETAPKAN</label>
                <input
                  type="text"
                  value={profile.tempatDitetapkan || ''}
                  onChange={e => handleMetaChange('tempatDitetapkan', e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">TANGGAL PENETAPAN</label>
                <input
                  type="text"
                  value={profile.tanggalPenetapan || ''}
                  onChange={e => handleMetaChange('tanggalPenetapan', e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500"
                />
              </div>
            </div>

          </div>

          {/* Section 3: Pejabat Penilai Kinerja */}
          <div className="bg-slate-50/50 p-3.5 rounded-lg border border-slate-150 space-y-3">
            <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> 3. Data Pejabat Penilai Kinerja
            </h4>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">JABATAN PEJABAT PENILAI</label>
              <input
                type="text"
                value={profile.pejabatPenilaiTitle || ''}
                onChange={e => handleMetaChange('pejabatPenilaiTitle', e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">NAMA PEJABAT PENILAI</label>
              <input
                type="text"
                value={profile.pejabatPenilaiNama || ''}
                onChange={e => handleMetaChange('pejabatPenilaiNama', e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500 font-serif font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">PANGKAT / GOLONGAN</label>
                <input
                  type="text"
                  value={profile.pejabatPenilaiGolongan || ''}
                  onChange={e => handleMetaChange('pejabatPenilaiGolongan', e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">NIP PEJABAT PENILAI</label>
                <input
                  type="text"
                  value={profile.pejabatPenilaiNip || ''}
                  onChange={e => handleMetaChange('pejabatPenilaiNip', e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500 font-mono"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">PROVINSI/WILAYAH INSTANSI</label>
              <input
                type="text"
                value={profile.pejabatPenilaiInstansi || ''}
                onChange={e => handleMetaChange('pejabatPenilaiInstansi', e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500"
              />
            </div>

            {/* Kop & Logo Customizer */}
            <div className="pt-4 border-t border-slate-200 mt-4 space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase tracking-wide">
                <Settings className="w-3.5 h-3.5 text-teal-600" /> Pengaturan Kop & Logo
              </span>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">TIPE LOGO DI KOP</label>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setKopSettings({ ...kopSettings, logoType: 'svg-jabar' })}
                    className={`py-1 px-1.5 rounded font-bold border transition-all text-center cursor-pointer ${
                      kopSettings.logoType === 'svg-jabar'
                        ? 'bg-teal-50 border-teal-500 text-teal-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Logo Jawa Barat
                  </button>
                  <button
                    type="button"
                    onClick={() => setKopSettings({ ...kopSettings, logoType: 'url' })}
                    className={`py-1 px-1.5 rounded font-bold border transition-all text-center cursor-pointer ${
                      kopSettings.logoType === 'url'
                        ? 'bg-teal-50 border-teal-500 text-teal-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Custom URL Logo
                  </button>
                </div>
              </div>

              {kopSettings.logoType === 'url' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">IMAGE URL LOGO KOP (STAMP/BRAND)</label>
                  <input
                    type="text"
                    value={kopSettings.customLogoUrl}
                    onChange={e => setKopSettings({ ...kopSettings, customLogoUrl: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              )}

              <div className="space-y-2 select-none">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">KOP BARIS 1 (PEMERINTAH DAERAH)</label>
                  <input
                    type="text"
                    value={kopSettings.row1}
                    onChange={e => setKopSettings({ ...kopSettings, row1: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500 uppercase font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">KOP BARIS 2 (NAMA INSTANSI)</label>
                  <input
                    type="text"
                    value={kopSettings.row2}
                    onChange={e => setKopSettings({ ...kopSettings, row2: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500 uppercase font-black"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">KOP BARIS 3 (ALAMAT & TELP)</label>
                  <input
                    type="text"
                    value={kopSettings.row3}
                    onChange={e => setKopSettings({ ...kopSettings, row3: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">KOP BARIS 4 (WEBSITE)</label>
                    <input
                      type="text"
                      value={kopSettings.row4}
                      onChange={e => setKopSettings({ ...kopSettings, row4: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">KOP BARIS 5 (EMAIL)</label>
                    <input
                      type="text"
                      value={kopSettings.row5}
                      onChange={e => setKopSettings({ ...kopSettings, row5: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">KOP BARIS 6 (WILAYAH / KODE POS)</label>
                  <input
                    type="text"
                    value={kopSettings.row6}
                    onChange={e => setKopSettings({ ...kopSettings, row6: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-teal-500 uppercase font-bold"
                  />
                </div>
              </div>
            </div>

          </div>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex justify-center items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-4 py-3 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Cetak via Browser
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className={`flex justify-center items-center gap-1.5 text-white font-bold text-xs sm:text-sm px-4 py-3 rounded-lg shadow-sm transition-all cursor-pointer border ${
              isDownloading 
                ? "bg-slate-400 border-slate-300 cursor-not-allowed" 
                : "bg-teal-600 border-teal-500 hover:bg-teal-700 hover:shadow"
            }`}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memproses PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Unduh Berkas PDF
              </>
            )}
          </button>
        </div>

        {/* Print Guidance Card */}
        <div className="bg-amber-50/85 border border-amber-250 rounded-xl p-4 space-y-2 text-amber-900 text-[11px] font-sans">
          <div className="flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950 text-xs">Penting: Tips Cetak PDF Lancar</p>
              <ul className="list-decimal pl-4 mt-1.5 space-y-1 leading-relaxed text-amber-900 font-medium">
                <li>
                  <strong>Buka di Tab Baru</strong>: Pratinjau AI Studio berjalan di dalam bingkai aman (iframe), sehingga browser cenderung memblokir dialog cetak otomatis. Klik tombol <strong>Buka di Tab Baru (ikon panah keluar di kanan atas layar preview)</strong> terlebih dahulu.
                </li>
                <li>
                  Tekan tombol <strong>"Cetak 3 Halaman PAK Resmi"</strong> setelah aplikasi terbuka di tab penuh.
                </li>
                <li>
                  Setel tujuan ke <strong>"Simpan sebagai PDF" / "Save as PDF"</strong>.
                </li>
                <li>
                  Pilih ukuran kertas/paper size <strong>F4 / Folio</strong> (atau ukuran kustom <strong>215 mm x 330 mm / 8.5" x 13"</strong>). Jika tidak ada, gunakan opsi "Legal" dengan margin disesuaikan.
                </li>
                <li>
                  Centang opsi <strong>"Grafik Latar Belakang" (Background graphics)</strong> agar border lencana pemerintah provinsi, bayangan, dan kop resmi Jawa Barat tercetak berwarna.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Virtual F4 Canvas Stack (7 cols) */}
      <div id="pak-print-pages" className="xl:col-span-7 space-y-8 select-text pr-2 print:p-0 print:m-0 print:border-none print:shadow-none">
        
        {/* Banner Informational inside Preview Panel */}
        <div className="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 flex justify-between items-center print:hidden">
          <div>
            <span className="text-[10px] tracking-widest font-bold uppercase text-teal-400 block mb-0.5">Live Interactive Report preview</span>
            <h4 className="text-sm font-extrabold">Portofolio Cetakan Dinas Pendidikan Provinsi Jawa Barat</h4>
          </div>
          <div className="flex gap-2">
            <span className="bg-slate-700 text-[10px] px-2.5 py-1 rounded-full font-bold">3 Halaman Terhubung</span>
            <span className="bg-teal-600 text-[10px] px-2.5 py-1 rounded-full font-bold">F4 / Folio</span>
          </div>
        </div>

        {/* PAGE 1 CANVAS */}
        <div className="bg-white p-10 shadow-md border border-slate-200 rounded-xl relative mx-auto w-full max-w-[215mm] print:shadow-none print:border-none print:bg-white page-break font-serif">
          {renderGovHeader()}
          
          <div className="text-center font-serif py-1">
            <h1 className="text-[12px] font-bold leading-none tracking-widest uppercase text-black underline">KONVERSI PREDIKAT KINERJA KE ANGKA KREDIT</h1>
            <p className="font-mono text-[10px] text-black uppercase mt-0.5">NOMOR : {profile.nomorSuratKonversi || "___________________________"}</p>
          </div>

          <div className="flex justify-between items-center text-[10px] text-black font-semibold uppercase font-serif mt-2 select-none">
            <span>Instansi : Pemerintah Provinsi Jawa Barat</span>
            <span>Periode: {formattedPeriode}</span>
          </div>

          {renderPersonalTable()}

          {/* Page 1 Centerpiece Table: "KONVERSI PREDIKAT KINERJA KE ANGKA KREDIT" */}
          <div className="text-[11px] text-black w-full border border-black font-serif my-4 leading-normal">
            <div className="bg-slate-100 font-bold text-center border-b border-black py-1 select-none tracking-wider text-[10px] uppercase">
              Konversi Predikat Kinerja ke Angka Kredit
            </div>
            
            <table className="w-full text-center border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-black font-bold select-none text-[9px] uppercase">
                  <th className="py-2 px-2 border-r border-black w-[50%]" colSpan={2}>Hasil Penilaian Kinerja</th>
                  <th className="py-2 px-2 border-r border-black w-[25%]" rowSpan={2}>Koefisien per tahun</th>
                  <th className="py-2 px-2 w-[25%]" rowSpan={2}>Angka Kredit yang didapat<br/><span className="text-[8px] font-normal font-mono normal-case">(Kolom 2 x kolom 3)</span></th>
                </tr>
                <tr className="bg-slate-50/50 border-b border-black font-bold select-none text-[9px] uppercase">
                  <th className="py-1 px-1 border-r border-black w-[25%] border-b-none">PREDIKAT</th>
                  <th className="py-1 px-1 border-r border-black w-[25%] border-b-none">PROSENTASE</th>
                </tr>
                <tr className="border-b border-black select-none text-[8.5px] font-mono font-bold bg-slate-100">
                  <td className="py-0.5 px-1 border-r border-black">1</td>
                  <td className="py-0.5 px-1 border-r border-black">2</td>
                  <td className="py-0.5 px-1 border-r border-black">3</td>
                  <td className="py-0.5 px-1">4</td>
                </tr>
              </thead>
              <tbody>
                <tr className="font-semibold text-center h-14">
                  <td className="py-2 px-2 border-r border-black font-bold underline">
                    {latestEval ? latestEval.rating.toUpperCase() : "BAIK"}
                  </td>
                  <td className="py-2 px-2 border-r border-black font-mono font-bold">
                    {latestEval ? (latestEval.multiplier * 100).toFixed(2).replace('.', ',') : "100,00"}%
                  </td>
                  <td className="py-2 px-2 border-r border-black font-mono font-bold text-slate-800">
                    {latestEval ? latestEval.coefficient : "12.5"}
                  </td>
                  <td className="py-2 px-2 font-mono font-extrabold text-[12px] bg-emerald-50/20 text-emerald-950">
                    {latestEval ? (latestEval.creditEarned).toFixed(3) : "12,500"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {renderSignatureBlock()}
          
          <span className="absolute bottom-2 right-4 text-[7px] text-slate-400 font-mono print:hidden">Halaman 1 dari 3</span>
        </div>

        {/* PAGE 2 CANVAS */}
        <div className="bg-white p-10 shadow-md border border-slate-200 rounded-xl relative mx-auto w-full max-w-[215mm] print:shadow-none print:border-none print:bg-white page-break font-serif page-break-before">
          {renderGovHeader()}
          
          <div className="text-center font-serif py-1">
            <h1 className="text-xs font-bold leading-none tracking-widest uppercase text-black underline">AKUMULASI ANGKA KREDIT</h1>
            <p className="font-mono text-[10px] text-black uppercase mt-0.5">NOMOR : {profile.nomorSuratAkumulasi || "___________________________"}</p>
          </div>

          <div className="flex justify-between items-center text-[10px] text-black font-semibold uppercase font-serif mt-2 select-none">
            <span>Instansi : Pemerintah Provinsi Jawa Barat</span>
            <span>Periode: {formattedPeriode}</span>
          </div>

          {renderPersonalTable()}

          {/* Page 2 centerpiece table: Accumulation over years */}
          <div className="text-[11px] text-black w-full border border-black font-serif my-4 leading-normal">
            <div className="bg-slate-100 font-bold text-center border-b border-black py-1 select-none tracking-wider text-[10px] uppercase">
              Hasil Penilalan Angka Kredit
            </div>
            
            <table className="w-full text-center border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-black font-bold select-none text-[9px] uppercase">
                  <th className="py-2 px-1 border-r border-black w-[10%]">TAHUN</th>
                  <th className="py-2 px-1 border-r border-black w-[25%]">PERIODIK (BULAN)</th>
                  <th className="py-2 px-1 border-r border-black w-[15%]">PREDIKAT</th>
                  <th className="py-2 px-1 border-r border-black w-[15%]">PROSENTASE</th>
                  <th className="py-2 px-1 border-r border-black w-[15%]">Koefisien per tahun</th>
                  <th className="py-2 px-1 w-[20%]">Angka Kredit yang didapat</th>
                </tr>
                <tr className="border-b border-black select-none text-[8.5px] font-mono font-bold bg-slate-100">
                  <td className="py-0.5 px-1 border-r border-black">1</td>
                  <td className="py-0.5 px-1 border-r border-black">2</td>
                  <td className="py-0.5 px-1 border-r border-black">3</td>
                  <td className="py-0.5 px-1 border-r border-black">4</td>
                  <td className="py-0.5 px-1 border-r border-black">5</td>
                  <td className="py-0.5 px-1">6</td>
                </tr>
              </thead>
              <tbody>
                {/* PAK Integrasi 2022 Conditional Row */}
                {(profile.akIntegrasi2022 || 0) > 0 && (
                  <tr className="border-b border-black font-serif font-medium h-10">
                    <td className="py-1 px-1 border-r border-black font-mono font-bold">2022</td>
                    <td className="py-1 px-2 border-r border-black leading-tight text-[9px]">
                      s.d. Desember
                    </td>
                    <td className="py-1 px-1 border-r border-black font-sans font-medium text-center text-slate-500">-</td>
                    <td className="py-1 px-1 border-r border-black font-mono text-center text-slate-500">-</td>
                    <td className="py-1 px-1 border-r border-black font-mono text-center text-slate-500">-</td>
                    <td className="py-1 px-2 text-right font-mono font-extrabold pr-4 text-[10.5px]">
                      {(profile.akIntegrasi2022 || 0).toFixed(3).replace('.', ',')}
                    </td>
                  </tr>
                )}

                {sortedEvaluationsChrono.map((item, index) => (
                  <tr key={index} className="border-b border-black font-serif font-medium h-10">
                    <td className="py-1 px-1 border-r border-black font-mono font-bold">{item.year}</td>
                    <td className="py-1 px-2 border-r border-black leading-tight text-[9px]">
                      {item.notes || (item.period === 'Tahunan' ? 'Januari s.d Desember' : item.period)}
                    </td>
                    <td className="py-1 px-1 border-r border-black font-bold">{item.rating}</td>
                    <td className="py-1 px-1 border-r border-black font-mono">{(item.multiplier * 100).toFixed(0)}%</td>
                    <td className="py-1 px-1 border-r border-black font-mono">{item.coefficient}</td>
                    <td className="py-1 px-2 text-right font-mono font-extrabold pr-4 text-[10.5px]">
                      {item.creditEarned.toFixed(3).replace('.', ',')}
                    </td>
                  </tr>
                ))}
                
                {evaluations.length === 0 && (
                  <tr className="border-b border-black">
                    <td colSpan={6} className="py-6 text-center text-slate-400 font-sans italic">
                      Belum ada evaluasi SKP tercatat untuk riwayat ini.
                    </td>
                  </tr>
                )}

                {/* Total merged row */}
                <tr className="bg-slate-100 font-bold font-serif text-[10px]">
                  <td className="py-2 px-2 border-r border-black uppercase text-left pl-4" colSpan={5}>
                    JUMLAH ANGKA KREDIT YANG DIPEROLEH
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-black pr-4 text-[11.5px] bg-emerald-50/20 text-emerald-950">
                    {totalKonversi.toFixed(3).replace('.', ',')}
                  </td>
                </tr>

              </tbody>
            </table>
          </div>

          {renderSignatureBlock()}
          
          <span className="absolute bottom-2 right-4 text-[7px] text-slate-400 font-mono print:hidden">Halaman 2 dari 3</span>
        </div>

        {/* PAGE 3 CANVAS */}
        <div className="bg-white p-10 shadow-md border border-slate-200 rounded-xl relative mx-auto w-full max-w-[215mm] print:shadow-none print:border-none print:bg-white page-break font-serif page-break-before">
          {renderGovHeader()}
          
          <div className="text-center font-serif py-1">
            <h1 className="text-xs font-bold leading-none tracking-widest uppercase text-black underline">PENETAPAN ANGKA KREDIT</h1>
            <p className="font-mono text-[10px] text-black uppercase mt-0.5">NOMOR : {profile.nomorSuratPenetapan || "___________________________"}</p>
          </div>

          <div className="flex justify-between items-center text-[10px] text-black font-semibold uppercase font-serif mt-2 select-none">
            <span>Instansi : Pemerintah Provinsi Jawa Barat</span>
            <span>Periode: {formattedPeriode}</span>
          </div>

          {/* Personal Details Table */}
          {renderPersonalTable()}

          {/* Section II: "PENETAPAN ANGKA KREDIT" table */}
          <div className="text-[11px] text-black w-full border border-black font-serif my-4 leading-normal">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-black text-center text-[9px] uppercase">
                  <th className="py-1.5 px-2 w-[4%] border-r border-black select-none">II</th>
                  <th className="py-1.5 px-2 w-[36%] border-r border-black text-left">PENETAPAN ANGKA KREDIT</th>
                  <th className="py-1.5 px-2 w-[15%] border-r border-black">LAMA</th>
                  <th className="py-1.5 px-2 w-[15%] border-r border-black">BARU</th>
                  <th className="py-1.5 px-2 w-[15%] border-r border-black">JUMLAH</th>
                  <th className="py-1.5 px-2 w-[15%]">KETERANGAN</th>
                </tr>
                <tr className="border-b border-black select-none text-[8px] font-mono font-bold bg-slate-150 text-center">
                  <td className="py-0.5 px-1 border-r border-black">1</td>
                  <td className="py-0.5 px-1 border-r border-black text-left pl-2">2</td>
                  <td className="py-0.5 px-1 border-r border-black">3</td>
                  <td className="py-0.5 px-1 border-r border-black">4</td>
                  <td className="py-0.5 px-1 border-r border-black">5</td>
                  <td className="py-0.5 px-1">6</td>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black h-8 text-slate-500 font-mono">
                  <td className="py-1 px-2 border-r border-black text-center">1</td>
                  <td className="py-1 px-2 border-r border-black font-serif text-[9px] text-slate-800">AK DASAR YANG DIBERIKAN</td>
                  <td className="py-1 px-1 border-r border-black text-center">-</td>
                  <td className="py-1 px-1 border-r border-black text-center">-</td>
                  <td className="py-1 px-1 border-r border-black text-center">-</td>
                  <td className="py-1 px-2"></td>
                </tr>
                <tr className="border-b border-black h-8 text-slate-500 font-mono">
                  <td className="py-1 px-2 border-r border-black text-center">2</td>
                  <td className="py-1 px-2 border-r border-black font-serif text-[9px] text-slate-800">AK JF LAMA</td>
                  <td className="py-1 px-1 border-r border-black text-center">-</td>
                  <td className="py-1 px-1 border-r border-black text-center">-</td>
                  <td className="py-1 px-1 border-r border-black text-center">-</td>
                  <td className="py-1 px-2"></td>
                </tr>
                <tr className="border-b border-black h-8 text-slate-500 font-mono">
                  <td className="py-1 px-2 border-r border-black text-center">3</td>
                  <td className="py-1 px-2 border-r border-black font-serif text-[9px] text-slate-800">AK PENYESUAIAN / PENYETARAAN</td>
                  <td className="py-1 px-1 border-r border-black text-center">-</td>
                  <td className="py-1 px-1 border-r border-black text-center">-</td>
                  <td className="py-1 px-1 border-r border-black text-center">-</td>
                  <td className="py-1 px-2"></td>
                </tr>
                <tr className="border-b border-black h-8 font-mono">
                  <td className="py-1 px-2 border-r border-black text-center text-slate-500">4</td>
                  <td className="py-1 px-2 border-r border-black font-serif text-[9px] font-bold text-slate-800">AK KONVERSI</td>
                  <td className="py-1 px-2 border-r border-black text-right pr-3">{konversiLama.toFixed(3).replace('.', ',')}</td>
                  <td className="py-1 px-2 border-r border-black text-right pr-3 font-semibold">{konversiBaru.toFixed(3).replace('.', ',')}</td>
                  <td className="py-1 px-2 border-r border-black text-right pr-3 font-bold">{konversiJumlah.toFixed(3).replace('.', ',')}</td>
                  <td className="py-1 px-2"></td>
                </tr>
                <tr className="border-b border-black h-8 font-mono">
                  <td className="py-1 px-2 border-r border-black text-center text-slate-500">5</td>
                  <td className="py-1 px-2 border-r border-black font-serif text-[9px] text-slate-800">AK YANG DIPEROLEH DARI PENINGKATAN PENDIDIKAN</td>
                  <td className="py-1 px-2 border-r border-black text-right pr-3">{pendidikanLama > 0 ? pendidikanLama.toFixed(3).replace('.', ',') : "-"}</td>
                  <td className="py-1 px-2 border-r border-black text-right pr-3 font-semibold">{pendidikanBaru > 0 ? pendidikanBaru.toFixed(3).replace('.', ',') : "-"}</td>
                  <td className="py-1 px-2 border-r border-black text-right pr-3 font-semibold">{pendidikanJumlah > 0 ? pendidikanJumlah.toFixed(3).replace('.', ',') : "-"}</td>
                  <td className="py-1 px-2"></td>
                </tr>
                <tr className="border-b border-black h-8 text-slate-500 font-mono">
                  <td className="py-1 px-2 border-r border-black text-center">6</td>
                  <td className="py-1 px-2 border-r border-black font-serif text-[9px] text-slate-800">AK YANG DIPEROLEH DARI KENAIKAN PANGKAT LUAR BIASA</td>
                  <td className="py-1 px-1 border-r border-black text-center">-</td>
                  <td className="py-1 px-1 border-r border-black text-center">-</td>
                  <td className="py-1 px-1 border-r border-black text-center">-</td>
                  <td className="py-1 px-2"></td>
                </tr>

                {/* Cumulatives Grand Total */}
                <tr className="bg-slate-100 font-bold font-serif text-[10px] uppercase">
                  <td className="py-2 px-2 border-r border-black text-left pl-6" colSpan={2}>
                    JUMLAH ANGKA KREDIT KUMULATIF
                  </td>
                  <td className="py-2 px-2 border-r border-black text-right pr-3 font-mono font-bold text-[10.5px]">
                    {accumLama.toFixed(3).replace('.', ',')}
                  </td>
                  <td className="py-2 px-2 border-r border-black text-right pr-3 font-mono font-bold text-[10.5px]">
                    {accumBaru.toFixed(3).replace('.', ',')}
                  </td>
                  <td className="py-2 px-2 border-r border-black text-right pr-3 font-mono font-black text-[12px] bg-emerald-50/20 text-emerald-950">
                    {accumJumlah.toFixed(3).replace('.', ',')}
                  </td>
                  <td className="py-2 px-2"></td>
                </tr>

              </tbody>
            </table>
          </div>

          {/* Lower Grid Panel: Minimun & Deficit Calculation block */}
          <div className="border border-black text-[10.5px] text-black w-full font-serif my-3 leading-normal font-medium">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-black text-center text-[9px]">
                  <th className="py-1.5 px-2 w-[46%] border-r border-black uppercase text-left">KETERANGAN</th>
                  <th className="py-1.5 px-2 w-[27%] border-r border-black uppercase">PANGKAT</th>
                  <th className="py-1.5 px-2 w-[27%] uppercase">JENJANG JABATAN</th>
                </tr>
              </thead>
              <tbody>
                 <tr className="border-b border-black text-center">
                  <td className="py-1.5 px-3 text-left font-semibold border-r border-black">ANGKA KREDIT MINIMAL YANG HARUS DIPENUHI UNTUK KENAIKAN PANGKAT/ JENJANG</td>
                  <td className="py-1.5 px-2 border-r border-black font-mono font-bold text-[11px]">
                    {minimalPangkat > 0 ? minimalPangkat.toFixed(3).replace('.', ',') : "-"}
                  </td>
                  <td className="py-1.5 px-2 font-mono font-bold text-[11px]">
                    {minimalJenjang > 0 ? minimalJenjang.toFixed(3).replace('.', ',') : "-"}
                  </td>
                </tr>
                <tr className="border-b border-black text-center">
                  <td className="py-1.5 px-3 text-left font-semibold border-r border-black uppercase text-[9.5px]">
                    {minimalPangkat > 0 && isPangkatSurplus
                      ? "KELEBIHAN ANGKA KREDIT YANG DICAPAI UNTUK KENAIKAN PANGKAT"
                      : "KEKURANGAN ANGKA KREDIT YANG HARUS DICAPAI UNTUK KENAIKAN PANGKAT"}
                  </td>
                  <td className={`py-1.5 px-2 border-r border-black font-mono font-extrabold text-[11px] ${
                    isPangkatSurplus ? "bg-emerald-50/10 text-emerald-900" : "bg-amber-55/10 text-amber-900"
                  }`}>
                    {minimalPangkat > 0 ? pangkatDiffValue.toFixed(3).replace('.', ',') : "-"}
                  </td>
                  <td className="py-1.5 px-2 font-mono font-semibold text-slate-400">-</td>
                </tr>
                <tr className="border-b border-black text-center">
                  <td className="py-1.5 px-3 text-left font-semibold border-r border-black uppercase text-[9.5px]">
                     {minimalJenjang > 0 && isJenjangSurplus 
                      ? "KELEBIHAN ANGKA KREDIT YANG DICAPAI UNTUK KENAIKAN JENJANG" 
                      : "KEKURANGAN ANGKA KREDIT YANG HARUS DICAPAI UNTUK KENAIKAN JENJANG"}
                  </td>
                  <td className="py-1.5 px-2 font-mono font-semibold text-slate-400">-</td>
                  <td className={`py-1.5 px-2 font-mono font-extrabold text-[11px] ${
                    isJenjangSurplus ? "bg-emerald-50/10 text-emerald-900" : "bg-amber-55/10 text-amber-900"
                  }`}>
                    {minimalJenjang > 0 ? jenjangDiffValue.toFixed(3).replace('.', ',') : "-"}
                  </td>
                </tr>
                {/* Eligibility final visual status line inside Page 3 table */}
                <tr className="bg-slate-50 uppercase text-[10px] font-bold">
                  <td className="py-3 px-4 text-left font-serif leading-tight" colSpan={3}>
                    {recommendationText}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Under-table note box */}
          <div className="bg-slate-50 p-2.5 rounded border border-black text-[9.5px] text-black italic leading-snug my-3">
            <strong>Catatan Kelayakan:</strong> {isLolosPangkat 
              ? `YBS telah melampaui limit minimal akumulasi angka pangkat sehingga dapat diusulkan kenaikan golongan setingkat lebih tinggi menjadi ${targetDetail.pangkatTarget || "Penata Tingkat I (" + profile.targetGolongan + ")"}.`
              : `YBS belum dapat diusulkan kenaikan pangkat setingkat lebih tinggi ke ${targetDetail.pangkatTarget || "Penata Tingkat I (" + profile.targetGolongan + ")"} karena akumulasi konversi SKP saat ini masih memiliki kekurangan sebesar ${kekuranganPangkat.toFixed(3)} AK.`}
          </div>

          {renderSignatureBlock()}
          
          <span className="absolute bottom-2 right-4 text-[7px] text-slate-400 font-mono print:hidden">Halaman 3 dari 3</span>
        </div>

      </div>

    </div>
  );
}
