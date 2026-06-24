export type GolonganID = 'III/a' | 'III/b' | 'III/c' | 'III/d' | 'IV/a' | 'IV/b' | 'IV/c' | 'IV/d' | 'IV/e';

export interface TeacherProfile {
  name: string;
  nip: string;
  school: string;
  currentGolongan: GolonganID;
  targetGolongan: GolonganID;
  baseAK: number; // Angka kredit pondasi saat naik ke golongan ini
  akIntegrasi2022: number; // Tambahan Nilai AK PAK Integrasi 2022 (Manual input)
  ratingSKP: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang' | 'Sangat Kurang'; // Default rating
  workDurationYears: number; // Estimasi masa kerja
  
  // New properties for official PAK document layout (Pages 1, 2, 3)
  karpegNumber?: string;
  birthPlaceDate?: string;
  gender?: 'Laki-Laki' | 'Perempuan';
  tmtCurrentPangkat?: string;
  tmtCurrentJabatan?: string;
  unitKerja?: string;
  instansiBiro?: string;
  akPendidikan?: number; // Angka kredit dari Peningkatan Pendidikan yang belum dinilai
  
  // Document properties
  nomorSuratKonversi?: string; // page 1
  nomorSuratAkumulasi?: string; // page 2
  nomorSuratPenetapan?: string; // page 3
  tempatDitetapkan?: string;
  tanggalPenetapan?: string;
  
  // Assessor (Pejabat Penilai Kinerja)
  pejabatPenilaiTitle?: string;
  pejabatPenilaiInstansi?: string;
  pejabatPenilaiNama?: string;
  pejabatPenilaiNip?: string;
  pejabatPenilaiGolongan?: string;
  pejabatPenilaiStatus?: 'definitif' | 'plt' | 'plh';

  // Custom Electronic Signature (TTE) Settings
  tteLogoType?: 'default' | 'url' | 'upload';
  tteLogoUrl?: string;
  tteLogoBase64?: string;
  tteTextHeader?: string;
  tteTextJabatan1?: string;
  tteTextJabatan2?: string;
}

export type SKPPeriod = 'Tahunan' | 'Triwulan I' | 'Triwulan II' | 'Triwulan III' | 'Triwulan IV' | 'September s.d Desember' | string;
export type SKPRating = 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang' | 'Sangat Kurang';

export interface SKPEvaluation {
  id: string;
  year: number;
  period: SKPPeriod;
  rating: SKPRating;
  level: 'Ahli Pertama' | 'Ahli Muda' | 'Ahli Madya' | 'Ahli Utama';
  coefficient: number; // Koefisien dasar tahunan (e.g. 12.5, 25, 37.5, 50)
  multiplier: number; // 1.5, 1.0, 0.75, 0.5, 0.25 (User requested SANGAT BAIK = 150%, BAIK = 100%)
  creditEarned: number; // Hasil konversi angka kredit
  akPendidikan?: number; // Angka kredit pendidikan baru di periode ini
  notes?: string;
  startDate?: string;
  endDate?: string;
  isCustomRange?: boolean;
  customMonths?: number;
}

export interface GolonganDetail {
  id: GolonganID;
  pangkat: string;
  pangkatTarget: string;
  akRequired: number; // AK Kumulatif Minimal untuk naik tingkat
  akNeedsToEarn: number; // AK yang harus dikumpulkan dari golongan sebelumnya
  minPD: number; // (Diperlukan pada aturan lama, tapi untuk referensi simpan saja 0)
  minPIKI: number; // (Diperlukan pada aturan lama, tapi untuk referensi sedia saja 0)
  pikiDetails?: string; // Penjelasan ringkas
}

export interface KopSettings {
  logoType: 'svg-jabar' | 'url';
  customLogoUrl: string;
  row1: string;
  row2: string;
  row3: string;
  row4: string;
  row5: string;
  row6: string;
  tteLogoType?: 'default' | 'url' | 'upload';
  tteLogoUrl?: string;
  tteLogoBase64?: string;
  tteTextHeader?: string;
  tteTextJabatan1?: string;
  tteTextJabatan2?: string;
}

