# SIPAK-GURU Hub 🎓💼
> **Sistem Integrasi Penilaian & Angka Kredit Guru PNS**  
> *Cabang Dinas Pendidikan Wilayah XIII Dinas Pendidikan Provinsi Jawa Barat (Ciamis, Banjar, Pangandaran)*

![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=Vite&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

---

## 🌟 Visual Preview

<div align="center">
  <img src="./src/assets/images/readme_banner_1782409268625.jpg" alt="SIPAK-GURU Hub Header Banner" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);" />
</div>

---

## 📌 Tentang SIPAK-GURU Hub

**SIPAK-GURU Hub** adalah platform manajemen administrasi kepegawaian modern yang dirancang khusus untuk memfasilitasi proses perhitungan, integrasi, dan rekapitulasi **Angka Kredit (AK)** bagi **Guru PNS** di wilayah kerja **KCD Wilayah XIII Dinas Pendidikan Provinsi Jawa Barat**. 

Aplikasi ini disesuaikan sepenuhnya dengan regulasi terbaru **PERMENPAN RB Nomor 1 Tahun 2023** tentang Jabatan Fungsional, yang mengalihkan fokus penilaian angka kredit dari butir kegiatan tradisional ke hasil **Konversi Predikat Kinerja Evaluasi SKP (Sasaran Kinerja Pegawai)** tahunan atau periodik secara instan, aman, dan transparan.

---

## 🛠️ Spesifikasi Teknologi (Tech Stack)

Sistem ini dikembangkan menggunakan arsitektur modern berbasis cloud yang ringan, cepat, aman, dan responsif:

*   **Bahasa Pemrograman**: `TypeScript` untuk menjamin keamanan tipe (*type safety*) dan keandalan kode skala besar.
*   **Framework Frontend**: `React 18+` dengan dukungan compiler super cepat `Vite`.
*   **Sistem Styling**: `Tailwind CSS` untuk antarmuka presisi tinggi, adaptif (*responsive design*), serta mematuhi rasio kontras aksesibilitas.
*   **Manajemen Animasi**: `@motion/react` untuk micro-interaction, transisi tab, dan transisi halaman login yang halus.
*   **Ikonografi**: `Lucide React` untuk visualisasi tombol dan navigasi yang bersih dan seragam.
*   **Database Engine**: `Firebase Firestore` (NoSQL database terdistribusi di Google Cloud) untuk sinkronisasi data instan.
*   **Sistem Autentikasi**: `Firebase Authentication` yang membagi akses berdasarkan hak otoritas pengguna (*Role-Based Access Control*).

---

## 👥 Pengguna Sistem (Aktor) & Otoritas

Aplikasi dirancang dengan sistem multi-level user yang terisolasi secara aman:

1.  **Super Admin (Cabang Dinas Pendidikan Wilayah XIII)**
    *   Melihat rekap data guru PNS secara menyeluruh se-KCD XIII.
    *   Mengelola, menambah, dan menghapus akun instansi sekolah.
    *   Mengevaluasi distribusi golongan pegawai.
2.  **Admin Sekolah / Operator Instansi**
    *   Mengelola pangkalan data Guru PNS yang aktif di bawah instansinya masing-masing (misal: SMAN 2 Ciamis).
    *   Mengonfigurasi pengaturan kop surat dinas dan penandatangan dokumen (Kepala Sekolah definitif, Plt, atau Plh) dengan tanda tangan elektronik (TTE).
    *   Menambahkan, menyunting, dan menghapus log evaluasi E-SKP tahunan/periodik milik guru.
    *   Menyimpan tautan berkas fisik digital (*Cloud Storage Links*) seperti SK Pangkat, PAK Integrasi 2022, Ijazah, dan dokumen bukti fisik evaluasi.

---

## 🚀 Fitur-Fitur Utama

### 1. Pangkalan Guru PNS & Berkas Digital (*Cloud Link Storage*)
*   Penyimpanan profil lengkap Guru PNS meliputi Nama, NIP, Golongan saat ini, Sekolah, hingga Angka Kredit Penyesuaian/Integrasi tahun 2022.
*   **Integrasi Tautan Awan**: Setiap profil dilengkapi dengan penyimpanan tautan berkas fisik ke platform cloud storage pilihan Anda (Google Drive, Dropbox, dll.) untuk dokumen **SK Kenaikan Pangkat, PAK Integrasi 2022, Ijazah Terakhir, dan Berkas Pendukung lainnya**.

### 2. Log Evaluasi E-SKP Periodik & Tahunan
*   Pencatatan riwayat penilaian kinerja (SKP) tahunan atau rentang bulan kustom.
*   Dilengkapi tautan unggah berkas evaluasi SKP asli dan bukti fisik sertifikat pendukung.
*   Menghitung perolehan Angka Kredit Konversi secara otomatis berdasarkan jenjang jabatan guru (Ahli Pertama, Ahli Muda, Ahli Madya, Ahli Utama) dan predikat penilaian (Sangat Baik, Baik, Cukup, Kurang, Sangat Kurang).

### 3. Ekspor Dokumen PAK Penyesuaian Resmi
*   Format laporan otomatis yang mematuhi standar dokumen lampiran BKN.
*   Menggunakan konfigurasi Kop Surat Resmi Pemerintah Provinsi Jawa Barat, lengkap dengan nomor surat, tempat, tanggal penetapan, serta jabatan penandatangan (Kepala Sekolah / Pejabat Penilai KCD).
*   Fitur cetak ramah cetak (*print-friendly*), otomatis menyembunyikan elemen UI sistem saat dokumen dicetak ke kertas atau disimpan sebagai PDF.

### 4. Simulasi Kalkulator Angka Kredit Instan
*   Kalkulator interaktif bagi guru untuk mensimulasikan perolehan Angka Kredit mereka dari kombinasi jenjang golongan, perolehan ijazah baru, predikat kinerja SKP, serta sisa angka kredit dari periode sebelumnya.
*   Menghasilkan kesimpulan apakah guru tersebut sudah layak (*eligible*) untuk naik pangkat ke golongan berikutnya atau masih memerlukan tambahan angka kredit.

### 5. Repositori Regulasi Kepegawaian BKN
*   Akses cepat ke berkas panduan penting (Permenpan RB No. 1/2023, Surat Edaran BKN, Tabel Koefisien AK Tahunan) untuk memudahkan pemahaman para aparatur sipil negara di lingkungan dinas.

---

## 🗄️ Skema Database (Firebase Firestore)

Struktur data didesain secara modular memanfaatkan konsep *subcollections* di Firestore untuk performa tinggi dan efisiensi query:

```yaml
/teachers (Collection)
  ├── {teacherId} (Document)
  │     ├── name: string
  │     ├── nip: string
  │     ├── school: string
  │     ├── currentGolongan: string  # Golongan aktif (misal: "III/c")
  │     ├── akIntegrasi2022: number  # AK Kumulatif Integrasi 2022
  │     ├── akPendidikan: number     # AK dari Ijazah baru
  │     ├── skPangkatFileLink: string  # Tautan Cloud SK Pangkat
  │     ├── pakIntegrasiFileLink: string  # Tautan Cloud PAK Integrasi
  │     ├── ijazahFileLink: string  # Tautan Cloud Ijazah
  │     ├── additionalFileLink: string  # Tautan Berkas Pendukung Lain
  │     │
  │     └── /evaluations (Subcollection)
  │           ├── {evaluationId} (Document)
  │                 ├── title: string       # Tahun/Periode penilaian
  │                 ├── ratingSKP: string   # Baik, Sangat Baik, dll.
  │                 ├── creditEarned: number # AK Konversi yang didapat
  │                 ├── skpFileLink: string  # Tautan Cloud berkas SKP
  │                 ├── evidenceFileLink: string # Tautan Cloud bukti fisik
  │                 ├── startDate / endDate: string
  │                 └── createdAt / updatedAt: timestamp
```

---

## 💻 Panduan Instalasi & Pengembangan Lokal

Jika Anda ingin menjalankan aplikasi ini di komputer lokal Anda:

### Prasyarat
*   **Node.js** versi 18 atau yang lebih baru.
*   **NPM** (biasanya disertakan dalam paket Node.js).

### Langkah-langkah
1.  **Clone Repositori**:
    ```bash
    git clone https://github.com/username/sipak-guru-hub.git
    cd sipak-guru-hub
    ```

2.  **Instalasi Dependensi**:
    ```bash
    npm install
    ```

3.  **Konfigurasi Environment**:
    Buat file `.env` di direktori root berdasarkan contoh `.env.example`:
    ```bash
    cp .env.example .env
    ```
    *Catatan: Platform AI Studio mengelola variabel ini secara aman di menu Settings untuk produksi.*

4.  **Jalankan Server Pengembangan**:
    ```bash
    npm run dev
    ```
    Aplikasi akan berjalan dan dapat diakses di browser melalui alamat `http://localhost:3000`.

5.  **Build untuk Produksi**:
    ```bash
    npm run build
    ```
    Hasil build statis yang dioptimalkan akan tersimpan di dalam folder `/dist` yang siap dideploy ke server production (seperti Cloud Run, Vercel, Netlify, atau Firebase Hosting).

---

## 🏛️ Penyelenggara & Dukungan
Sistem ini dibuat untuk mendukung akselerasi transformasi digital aparatur sipil negara demi mewujudkan pelayanan pendidikan Jawa Barat yang **Juara Lahir Batin**. Jika Anda mengalami kendala operasional, silakan hubungi operator kepegawaian Cabang Dinas Pendidikan Wilayah XIII Provinsi Jawa Barat.
