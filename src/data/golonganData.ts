import { GolonganID, GolonganDetail } from '../types';

export const GOLONGAN_LIST: GolonganDetail[] = [
  {
    id: 'III/a',
    pangkat: 'Penata Muda (S1)',
    pangkatTarget: 'Penata Muda Tkt. I (III/b)',
    akRequired: 150,
    akNeedsToEarn: 50,
    minPD: 0,
    minPIKI: 0,
    pikiDetails: 'Kenaikan pangkat murni dari konversi predikat SKP tahunan/triwulan. Tidak diperlukan pengumpulan berkas DUPAK maupun karya tulis ilmiah.'
  },
  {
    id: 'III/b',
    pangkat: 'Penata Muda Tingkat I',
    pangkatTarget: 'Penata (III/c)',
    akRequired: 200,
    akNeedsToEarn: 100,
    minPD: 0,
    minPIKI: 0,
    pikiDetails: 'Kenaikan pangkat murni dari konversi predikat SKP tahunan/triwulan. Bebas dari kewajiban Publikasi Ilmiah / Karya Inovatif terpisah.'
  },
  {
    id: 'III/c',
    pangkat: 'Penata',
    pangkatTarget: 'Penata Tingkat I (III/d)',
    akRequired: 300,
    akNeedsToEarn: 100,
    minPD: 0,
    minPIKI: 0,
    pikiDetails: 'Pengumpulan 100 Angka Kredit murni dari akumulasi konversi SKP Tahunan/Triwulan selama masa jabatan.'
  },
  {
    id: 'III/d',
    pangkat: 'Penata Tingkat I',
    pangkatTarget: 'Pembina (IV/a)',
    akRequired: 400,
    akNeedsToEarn: 100,
    minPD: 0,
    minPIKI: 0,
    pikiDetails: 'Kenaikan pangkat berdasarkan penilaian konversi kinerja E-SKP. Tidak perlu menyusun PTK / penelitian tindakan kelas secara administratif.'
  },
  {
    id: 'IV/a',
    pangkat: 'Pembina',
    pangkatTarget: 'Pembina Tingkat I (IV/b)',
    akRequired: 550,
    akNeedsToEarn: 150,
    minPD: 0,
    minPIKI: 0,
    pikiDetails: 'Pengumpulan 150 Angka Kredit murni dari hasil konversi kinerja pertahun/pertriwulan dari siber BKN.'
  },
  {
    id: 'IV/b',
    pangkat: 'Pembina Tingkat I',
    pangkatTarget: 'Pembina Utama Muda (IV/c)',
    akRequired: 700,
    akNeedsToEarn: 150,
    minPD: 0,
    minPIKI: 0,
    pikiDetails: 'Membutuhkan total 150 Angka Kredit penambahan dari konversi predikat kinerja tahunan di siber BKN.'
  },
  {
    id: 'IV/c',
    pangkat: 'Pembina Utama Muda',
    pangkatTarget: 'Pembina Utama Madya (IV/d)',
    akRequired: 850,
    akNeedsToEarn: 150,
    minPD: 0,
    minPIKI: 0,
    pikiDetails: 'Dihitung penuh dari konversi E-SKP dengan predikat minimal Baik.'
  },
  {
    id: 'IV/d',
    pangkat: 'Pembina Utama Madya',
    pangkatTarget: 'Pembina Utama (IV/e)',
    akRequired: 1050,
    akNeedsToEarn: 200,
    minPD: 0,
    minPIKI: 0,
    pikiDetails: 'Mencapai puncak karir fungsional dengan pengumpulan 200 AK murni dari kinerja SKP.'
  },
  {
    id: 'IV/e',
    pangkat: 'Pembina Utama',
    pangkatTarget: 'Puncak Karir',
    akRequired: 1050,
    akNeedsToEarn: 0,
    minPD: 0,
    minPIKI: 0,
    pikiDetails: 'Golongan maksimal. Terus pertahankan predikat kinerja Sangat Baik/Baik.'
  }
];

export const GOLONGAN_BASE_VALS: Record<GolonganID, number> = {
  'III/a': 100,
  'III/b': 150,
  'III/c': 200,
  'III/d': 300,
  'IV/a': 400,
  'IV/b': 550,
  'IV/c': 700,
  'IV/d': 850,
  'IV/e': 1050,
};

// Koefisien Angka Kredit per Tahun dari Penilaian Kinerja Guru (E-SKP Permenpan RB 1/2023)
// Golongan Guru terbagi atas:
// 1. Ahli Pratama (III/a, III/b) -> Koefisien dasar 12.5 per tahun
// 2. Ahli Muda (III/c, III/d) -> Koefisien dasar 25 per tahun
// 3. Ahli Madya (IV/a, IV/b, IV/c) -> Koefisien dasar 37.5 per tahun
// 4. Ahli Utama (IV/d, IV/e) -> Koefisien dasar 50 per tahun
export const SKP_STANDARD_COEFFICIENT = {
  'Ahli Pertama': 12.5,
  'Ahli Muda': 25.0,
  'Ahli Madya': 37.5,
  'Ahli Utama': 50.0
};

export const SKP_RATING_MULTIPLIERS = {
  'Sangat Baik': 1.5, // 150% as requested by user
  'Baik': 1.0,        // 100% as requested by user
  'Cukup': 0.75,      // 75%
  'Kurang': 0.50,     // 50%
  'Sangat Kurang': 0.25 // 25%
};

export const getTeacherLevel = (gol: GolonganID): 'Ahli Pertama' | 'Ahli Muda' | 'Ahli Madya' | 'Ahli Utama' => {
  if (gol === 'III/a' || gol === 'III/b') return 'Ahli Pertama';
  if (gol === 'III/c' || gol === 'III/d') return 'Ahli Muda';
  if (gol === 'IV/a' || gol === 'IV/b' || gol === 'IV/c') return 'Ahli Madya';
  return 'Ahli Utama';
};

export const getMinimalPangkat = (gol: GolonganID): number => {
  if (gol === 'III/a') return 50.0;
  if (gol === 'III/b') return 100.0;
  if (gol === 'III/c') return 100.0;
  if (gol === 'III/d') return 150.0;
  if (gol === 'IV/a') return 150.0;
  if (gol === 'IV/b') return 300.0;
  if (gol === 'IV/c') return 450.0;
  return 0.0;
};

export const getMinimalJenjang = (gol: GolonganID): number => {
  if (gol === 'III/a') return 100.0;
  if (gol === 'III/b') return 100.0;
  if (gol === 'III/c') return 200.0;
  if (gol === 'III/d') return 200.0;
  if (gol === 'IV/a') return 450.0;
  if (gol === 'IV/b') return 450.0;
  if (gol === 'IV/c') return 450.0;
  return 0.0;
};

