import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  ClipboardList, 
  Calculator, 
  BookOpen, 
  Printer, 
  RefreshCw, 
  FileText, 
  Clock,
  User,
  Search,
  Plus,
  Trash2,
  LogOut,
  Sparkles,
  Award,
  AlertCircle,
  GraduationCap,
  Settings
} from "lucide-react";
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from "firebase/auth";
import { 
  collection, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  setDoc 
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "./firebase";
import { TeacherProfile, SKPEvaluation, GolonganID, KopSettings } from "./types";
import { GOLONGAN_LIST, getTeacherLevel, GOLONGAN_BASE_VALS, getMinimalPangkat, getMinimalJenjang } from "./data/golonganData";
import DashboardTab from "./components/DashboardTab";
import ActivityLogTab from "./components/ActivityLogTab";
import CalculatorTab from "./components/CalculatorTab";
import RegulationsTab from "./components/RegulationsTab";
import OfficialPAKReport from "./components/OfficialPAKReport";
import KopAdminTab from "./components/KopAdminTab";

const DEFAULT_EVALUATIONS: Omit<SKPEvaluation, 'id'>[] = [
  {
    year: 2023,
    period: "September s.d Desember",
    rating: "Baik",
    level: "Ahli Muda",
    coefficient: 25,
    multiplier: 1.0,
    creditEarned: 8.333,
    notes: "September s.d Desember",
    startDate: "2023-09-01",
    endDate: "2023-12-31",
    isCustomRange: true,
    customMonths: 4
  },
  {
    year: 2024,
    period: "Tahunan",
    rating: "Baik",
    level: "Ahli Muda",
    coefficient: 25,
    multiplier: 1.0,
    creditEarned: 25.0,
    notes: "Januari s.d Desember",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    isCustomRange: false,
    customMonths: 12
  },
  {
    year: 2025,
    period: "Tahunan",
    rating: "Baik",
    level: "Ahli Muda",
    coefficient: 25,
    multiplier: 1.0,
    creditEarned: 25.0,
    notes: "Januari s.d Desember",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    isCustomRange: false,
    customMonths: 12
  }
];

export default function App() {
  // Authentication states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Multi-teacher registry states
  const [teachers, setTeachers] = useState<(TeacherProfile & { id: string, evaluationsCount?: number })[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);

  // Form states for new teacher
  const [newTeacherForm, setNewTeacherForm] = useState({
    name: "",
    nip: "",
    school: "",
    currentGolongan: "III/c" as GolonganID,
    targetGolongan: "III/d" as GolonganID,
    baseAK: 200,
    akIntegrasi2022: 25,
    akPendidikan: 0,
    karpegNumber: "",
    gender: "Laki-Laki" as "Laki-Laki" | "Perempuan"
  });

  // Selected teacher states
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [evaluations, setEvaluations] = useState<SKPEvaluation[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "activities" | "calculator" | "regulations" | "pak_report" | "kop_admin">("dashboard");

  // Admin Kop & Logo settings
  const [kopSettings, setKopSettings] = useState<KopSettings>(() => {
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

  // Load settings from Firestore on Login
  useEffect(() => {
    if (!user) return;

    const docId = `kop_${user.uid}`;
    const docRef = doc(db, "settings", docId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Compare with current local state to prevent unnecessary updates
        setKopSettings(prev => {
          if (
            prev.logoType === data.logoType &&
            prev.customLogoUrl === data.customLogoUrl &&
            prev.row1 === data.row1 &&
            prev.row2 === data.row2 &&
            prev.row3 === data.row3 &&
            prev.row4 === data.row4 &&
            prev.row5 === data.row5 &&
            prev.row6 === data.row6
          ) {
            return prev; // No change
          }
          return {
            logoType: (data.logoType as 'svg-jabar' | 'url') || 'svg-jabar',
            customLogoUrl: data.customLogoUrl || '',
            row1: data.row1 || '',
            row2: data.row2 || '',
            row3: data.row3 || '',
            row4: data.row4 || '',
            row5: data.row5 || '',
            row6: data.row6 || ''
          };
        });
      }
    }, (error) => {
      console.warn("Muted settings fetch on missing document: ", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Save settings to Firestore and LocalStorage
  useEffect(() => {
    localStorage.setItem('sipak_kop_settings', JSON.stringify(kopSettings));

    if (!user) return;

    const docId = `kop_${user.uid}`;
    const docRef = doc(db, "settings", docId);

    const timer = setTimeout(async () => {
      try {
        await setDoc(docRef, {
          logoType: kopSettings.logoType,
          customLogoUrl: kopSettings.customLogoUrl || '',
          row1: kopSettings.row1 || '',
          row2: kopSettings.row2 || '',
          row3: kopSettings.row3 || '',
          row4: kopSettings.row4 || '',
          row5: kopSettings.row5 || '',
          row6: kopSettings.row6 || ''
        });
      } catch (err) {
        console.error("Gagal mencadangkan KOP ke Firestore:", err);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [kopSettings, user]);

  // Track global auth status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setAuthLoading(false);
      if (!usr) {
        setSelectedTeacherId(null);
        setProfile(null);
        setEvaluations([]);
        localStorage.removeItem('sipak_kop_settings');
        setKopSettings({
          logoType: 'svg-jabar',
          customLogoUrl: '',
          row1: 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
          row2: 'DINAS PENDIDIKAN',
          row3: 'Jalan. Dr. Radjiman No. 6 Telp (022) 4264813 Fax. (022) 4264881',
          row4: 'Website : disdik.jabarprov.go.id',
          row5: 'e-mail: disdik@jabar.prov.go.id / sekretariatdisdikjabar@gmail.com',
          row6: 'BANDUNG - 40171'
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to teachers database collection in real-time
  useEffect(() => {
    if (!user) {
      setTeachers([]);
      setLoadingTeachers(false);
      return;
    }

    setLoadingTeachers(true);
    const unsubscribe = onSnapshot(
      collection(db, "teachers"),
      (snapshot) => {
        const list: (TeacherProfile & { id: string, evaluationsCount?: number })[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            name: data.name || "",
            nip: data.nip || "",
            school: data.school || "",
            currentGolongan: data.currentGolongan || "III/c",
            targetGolongan: data.targetGolongan || "III/d",
            baseAK: Number(data.baseAK) || 0,
            akIntegrasi2022: Number(data.akIntegrasi2022) || 0,
            akPendidikan: Number(data.akPendidikan) || 0,
            ratingSKP: data.ratingSKP || "Baik",
            workDurationYears: Number(data.workDurationYears) || 1,
            karpegNumber: data.karpegNumber || "",
            birthPlaceDate: data.birthPlaceDate || "",
            gender: data.gender || "Laki-Laki",
            tmtCurrentPangkat: data.tmtCurrentPangkat || "",
            tmtCurrentJabatan: data.tmtCurrentJabatan || "",
            unitKerja: data.unitKerja || "",
            instansiBiro: data.instansiBiro || "PEMERINTAH PROVINSI JAWA BARAT",
            nomorSuratKonversi: data.nomorSuratKonversi || "",
            nomorSuratAkumulasi: data.nomorSuratAkumulasi || "",
            nomorSuratPenetapan: data.nomorSuratPenetapan || "",
            tempatDitetapkan: data.tempatDitetapkan || "Bandung",
            tanggalPenetapan: data.tanggalPenetapan || "",
            pejabatPenilaiTitle: data.pejabatPenilaiTitle || "",
            pejabatPenilaiInstansi: data.pejabatPenilaiInstansi || "PROVINSI JAWA BARAT",
            pejabatPenilaiNama: data.pejabatPenilaiNama || "",
            pejabatPenilaiNip: data.pejabatPenilaiNip || "",
            pejabatPenilaiGolongan: data.pejabatPenilaiGolongan || ""
          });
        });
        setTeachers(list);
        setLoadingTeachers(false);
      },
      (err) => {
        console.error("Failed to load teachers registry:", err);
        setLoadingTeachers(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Listen to evaluations subcollection for the active selected teacher
  useEffect(() => {
    if (!selectedTeacherId) {
      setEvaluations([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "teachers", selectedTeacherId, "evaluations"),
      (snapshot) => {
        const evalsList: SKPEvaluation[] = [];
        snapshot.forEach((docSnap) => {
          const evalData = docSnap.data();
          evalsList.push({
            id: docSnap.id,
            year: Number(evalData.year) || new Date().getFullYear(),
            period: evalData.period || "Tahunan",
            rating: evalData.rating || "Baik",
            level: evalData.level || "Ahli Muda",
            coefficient: Number(evalData.coefficient) || 0,
            multiplier: Number(evalData.multiplier) || 0,
            creditEarned: Number(evalData.creditEarned) || 0,
            akPendidikan: Number(evalData.akPendidikan) || 0,
            notes: evalData.notes || "",
            startDate: evalData.startDate || "",
            endDate: evalData.endDate || "",
            isCustomRange: evalData.isCustomRange || false,
            customMonths: Number(evalData.customMonths) || 12
          });
        });
        // Sort newest first
        evalsList.sort((a, b) => b.year - a.year || b.period.localeCompare(a.period));
        setEvaluations(evalsList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `teachers/${selectedTeacherId}/evaluations`);
      }
    );

    return () => unsubscribe();
  }, [selectedTeacherId]);

  // Handle User login (Google Redirect / Popup)
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login verification failed:", err);
      alert("Gagal Masuk Portal: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    if (window.confirm("Buka konfirmasi: Anda yakin ingin keluar dari portal manajemen?")) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Logout failed:", err);
      }
    }
  };

  // Add new teacher profile to database
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!newTeacherForm.name || !newTeacherForm.nip) {
      alert("Harap lengkapi nama dan NIP Guru PNS!");
      return;
    }

    try {
      const data: Omit<TeacherProfile, 'createdBy' | 'createdAt' | 'updatedAt'> = {
        name: newTeacherForm.name.toUpperCase(),
        nip: newTeacherForm.nip.replace(/\s+/g, ""),
        school: newTeacherForm.school.toUpperCase(),
        currentGolongan: newTeacherForm.currentGolongan,
        targetGolongan: newTeacherForm.targetGolongan,
        baseAK: Number(newTeacherForm.baseAK),
        akIntegrasi2022: Number(newTeacherForm.akIntegrasi2022),
        akPendidikan: 0,
        ratingSKP: "Baik",
        workDurationYears: 3,
        karpegNumber: newTeacherForm.karpegNumber.toUpperCase(),
        gender: newTeacherForm.gender,
        birthPlaceDate: "",
        tmtCurrentPangkat: "",
        tmtCurrentJabatan: "",
        unitKerja: newTeacherForm.school.toUpperCase(),
        instansiBiro: "PEMERINTAH PROVINSI JAWA BARAT",
        nomorSuratKonversi: "",
        nomorSuratAkumulasi: "",
        nomorSuratPenetapan: "",
        tempatDitetapkan: "Bandung",
        tanggalPenetapan: "",
        pejabatPenilaiTitle: "KEPALA CABANG PENDIDIKAN",
        pejabatPenilaiInstansi: "PROVINSI JAWA BARAT",
        pejabatPenilaiNama: "",
        pejabatPenilaiNip: "",
        pejabatPenilaiGolongan: ""
      };

      const docRef = await addDoc(collection(db, "teachers"), {
        ...data,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      alert(`Guru PNS bernama ${newTeacherForm.name} berhasil didaftarkan di cloud database!`);
      setIsAddingTeacher(false);
      // Reset form
      setNewTeacherForm({
        name: "",
        nip: "",
        school: "",
        currentGolongan: "III/c",
        targetGolongan: "III/d",
        baseAK: 200,
        akIntegrasi2022: 25,
        akPendidikan: 0,
        karpegNumber: "",
        gender: "Laki-Laki"
      });

      // Instantly open the teacher
      handleSelectTeacher({ ...data, id: docRef.id });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "teachers");
    }
  };

  // Instantiates the default test educator Antan Kustiawan directly inside Firestore
  const handleCreateDemoTeacher = async () => {
    if (!user) return;
    try {
      setLoadingTeachers(true);
      const teacherDemo = {
        name: "ANTAN KUSTIAWAN, S.Pd, M.Pd.",
        nip: "198606192011011001",
        school: "SMAN 2 CIAMIS",
        currentGolongan: "III/c" as const,
        targetGolongan: "III/d" as const,
        baseAK: 200.0,
        akIntegrasi2022: 25.0,
        ratingSKP: "Baik" as const,
        workDurationYears: 3,
        karpegNumber: "B03023705",
        birthPlaceDate: "CIAMIS, 19-06-1986",
        gender: "Laki-Laki" as const,
        tmtCurrentPangkat: "01-04-2024",
        tmtCurrentJabatan: "24-08-2023",
        unitKerja: "SMAN 2 CIAMIS KABUPATEN CIAMIS CABANG PENDIDIKAN WILAYAH XIII",
        instansiBiro: "PEMERINTAH PROVINSI JAWA BARAT",
        nomorSuratKonversi: "1523/KPG.03.03/KCD XIII",
        nomorSuratAkumulasi: "1524/KPG.03.03/KCD XIII",
        nomorSuratPenetapan: "1525/KPG.03.03/KCD XIII",
        tempatDitetapkan: "Bandung",
        tanggalPenetapan: "02 April 2026",
        pejabatPenilaiTitle: "KEPALA CABANG PENDIDIKAN WILAYAH XIII",
        pejabatPenilaiInstansi: "PROVINSI JAWA BARAT",
        pejabatPenilaiNama: "DWI YANTI ESTRININGRUM, S.Sos., M.Pd.",
        pejabatPenilaiNip: "19741212 200212 2 003",
        pejabatPenilaiGolongan: "Pembina Tk.I"
      };

      const docRef = await addDoc(collection(db, "teachers"), {
        ...teacherDemo,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const teacherId = docRef.id;

      // Add evaluation logs for Antan
      for (const item of DEFAULT_EVALUATIONS) {
        await addDoc(collection(db, "teachers", teacherId, "evaluations"), {
          ...item,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      alert("Guru Contoh (Antan Kustiawan, S.Pd, M.Pd.) berhasil dibuat secara otomatis beserta 3 evaluasi log di database cloud Anda!");
    } catch (err) {
      console.error("Creation failed", err);
      alert("Gagal melakukan instansiasi: " + String(err));
    } finally {
      setLoadingTeachers(false);
    }
  };

  // Delete a teacher profile and all child structures
  const handleDeleteTeacher = async (id: string, name: string) => {
    if (window.confirm(`PERINGATAN KERAS: Apakah Anda yakin ingin menghapus data Guru PNS bernama "${name}"? Seluruh dokumen dan riwayat E-SKP ybs akan terhapus permanen.`)) {
      try {
        await deleteDoc(doc(db, "teachers", id));
        if (selectedTeacherId === id) {
          setSelectedTeacherId(null);
          setProfile(null);
          setEvaluations([]);
        }
        alert(`Data Guru ${name} berhasil dibersihkan dari database.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `teachers/${id}`);
      }
    }
  };

  // Load selected teacher profile into reactive state
  const handleSelectTeacher = (teacher: TeacherProfile & { id: string }) => {
    setSelectedTeacherId(teacher.id);
    setProfile(teacher);
    setActiveTab("dashboard");
  };

  // Update profile in database
  const handleProfileChange = async (updated: TeacherProfile) => {
    if (!selectedTeacherId) return;
    try {
      await updateDoc(doc(db, "teachers", selectedTeacherId), {
        ...updated,
        updatedAt: serverTimestamp()
      });
      setProfile(updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teachers/${selectedTeacherId}`);
    }
  };

  // Add E-SKP evaluation
  const handleAddEvaluation = async (newEval: SKPEvaluation) => {
    if (!selectedTeacherId || !user) return;
    try {
      const evalDoc = {
        year: Number(newEval.year),
        period: newEval.period,
        rating: newEval.rating,
        level: newEval.level,
        coefficient: Number(newEval.coefficient),
        multiplier: Number(newEval.multiplier),
        creditEarned: Number(newEval.creditEarned),
        akPendidikan: Number(newEval.akPendidikan) || 0,
        notes: newEval.notes || "",
        startDate: newEval.startDate || "",
        endDate: newEval.endDate || "",
        isCustomRange: newEval.isCustomRange || false,
        customMonths: Number(newEval.customMonths) || 12,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await addDoc(collection(db, "teachers", selectedTeacherId, "evaluations"), evalDoc);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `teachers/${selectedTeacherId}/evaluations`);
    }
  };

  // Delete evaluation
  const handleDeleteEvaluation = async (evaluationId: string) => {
    if (!selectedTeacherId) return;
    try {
      await deleteDoc(doc(db, "teachers", selectedTeacherId, "evaluations", evaluationId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `teachers/${selectedTeacherId}/evaluations/${evaluationId}`);
    }
  };

  const handlePrint = () => {
    setActiveTab("pak_report");
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Filter teachers based on user query
  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.nip.includes(searchQuery) ||
    t.school.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Authenticating Loader
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center font-sans text-white select-none">
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl flex flex-col items-center max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-full border-t-4 border-l-4 border-teal-500 animate-spin"></div>
          <div>
            <h3 className="font-bold text-slate-100 text-base">Memuat Portal SIPAK-GURU</h3>
            <p className="text-xs text-slate-450 mt-1">Menghubungkan ke secure cloud service...</p>
          </div>
        </div>
      </div>
    );
  }

  // --- UNAUTHENTICATED LOGIN VIEW ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 font-sans flex flex-col justify-between text-slate-100 select-none">
        
        {/* Decorative Top header */}
        <div className="bg-teal-950 border-b border-teal-900/60 py-3 text-center text-[10px] tracking-widest font-mono text-teal-300">
          SISTEM KEAMANAN TERINTEGRASI • PROVINSI JAWA BARAT
        </div>

        {/* Login main frame */}
        <div className="max-w-md w-full mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden space-y-6">
            
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500"></div>

            {/* Shield & Crest Header */}
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-18 text-teal-400">
                {/* Embedded West Java Shield in solid vector format */}
                <svg viewBox="0 0 100 110" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <ellipse cx="50" cy="50" rx="37" ry="48" fill="#fec309" stroke="#111111" strokeWidth="1.2" />
                  <ellipse cx="50" cy="50" rx="35" ry="46" fill="#15a03d" stroke="#111111" strokeWidth="0.8" />
                  <circle cx="50" cy="50" r="12" fill="#0f4cc5" />
                  <path d="M44 46 L47 43 L53 43 L56 46 Z" fill="#ffffff" />
                  <polygon points="50,22 53,28 60,28 55,32 57,38 50,34 43,38 45,32 40,28 47,28" fill="#ffffff" />
                </svg>
              </div>

              <div className="text-center">
                <span className="block text-[9px] font-black tracking-widest text-emerald-400 uppercase">PORTAL ADMINISTRASI KANTOR</span>
                <h1 className="text-xl font-extrabold text-slate-100 uppercase tracking-tight">SIPAK-GURU PNS</h1>
                <p className="text-[11px] text-slate-450 leading-relaxed mt-1">
                  Sistem Informasi Perhitungan Angka Kredit Integrasi Guru Dinas Pendidikan Provinsi Jawa Barat
                </p>
              </div>
            </div>

            <div className="border-t border-slate-800/80 my-2"></div>

            {/* Login control */}
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-900/10 cursor-pointer transition-all border border-emerald-500"
            >
              <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.564-4.458 10.564-10.74 0-.723-.078-1.275-.173-1.685H12.24z"/>
              </svg>
              Masuk dengan Akun Google
            </button>

            {/* Security disclaimer */}
            <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 text-[10px] text-slate-450 leading-relaxed font-sans space-y-1">
              <span className="font-bold text-amber-500 block uppercase">Catatan Verifikasi Otoritas:</span>
              <p>Hanya petugas, administrator kantor dinas, atau guru terverifikasi yang didaftarkan pada domain internal yang memiliki otorisasi penuh untuk mengelola pangkalan data di server ini.</p>
            </div>

          </div>
        </div>

        {/* Clean footer */}
        <div className="bg-slate-900/60 py-4 text-center text-[10px] text-slate-500 font-mono">
          © 2026 DINAS PENDIDIKAN PROVINSI JAWA BARAT • PERMENPAN RB NO. 1/2023
        </div>

      </div>
    );
  }

  // --- AUTHENTICATED: GURU PNS REGISTRY / LISTING VIEW ---
  if (selectedTeacherId === null || profile === null) {
    return (
      <div className="min-h-screen bg-slate-50/60 font-sans text-slate-800 flex flex-col justify-between">
        
        {/* Authenticated Top Admin Alert bar */}
        <div id="top-admin-banner" className="bg-teal-950 text-teal-200 text-[11px] py-2 px-6 flex flex-col sm:flex-row justify-between items-center gap-2 border-b border-teal-900 font-mono select-none print:hidden">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-300 animate-pulse fill-teal-950" />
            <span className="uppercase text-teal-100">Portal Pegawai Dinas Pendidikan Jabar</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Petugas: <strong>{user.email}</strong></span>
            <button 
              onClick={handleLogout}
              className="bg-teal-900 hover:bg-teal-850 border border-teal-700 text-teal-300 px-2.5 py-0.5 rounded flex items-center gap-1 cursor-pointer font-bold text-[10px] transition-colors"
            >
              <LogOut className="w-3 h-3" /> Keluar
            </button>
          </div>
        </div>

        {/* Dashboard Main Workspace */}
        <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-teal-650 tracking-wider">SIPAK-GURU Hub</span>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Pangkalan Data PAK Guru PNS</h1>
              <p className="text-xs text-slate-500">Kelola perhitungan angka kredit mutasi promosi pangkat ratusan guru ASN dengan instan dan aman.</p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsAddingTeacher(!isAddingTeacher)}
                className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> DAFTARKAN GURU BARU
              </button>

              {teachers.length === 0 && (
                <button
                  onClick={handleCreateDemoTeacher}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-450 text-slate-900 font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> KREASI GURU CONTOH
                </button>
              )}
            </div>
          </div>

          {/* Form Modal/Section to Add Teacher */}
          {isAddingTeacher && (
            <div className="bg-white border-2 border-teal-500 p-6 rounded-2xl shadow-md space-y-4 animate-slideDown">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-teal-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase">Formulir Registrasi PNS Baru</h3>
                </div>
                <button 
                  onClick={() => setIsAddingTeacher(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  Batal
                </button>
              </div>

              <form onSubmit={handleCreateTeacher} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">NAMA LENGKAP (GELAR PENUH)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Drs. HARIS FIRDAUS, M.Pd."
                    value={newTeacherForm.name}
                    onChange={e => setNewTeacherForm({ ...newTeacherForm, name: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">NIP (18 ANGKA)</label>
                  <input
                    type="text"
                    maxLength={18}
                    placeholder="Contoh: 198606192011011001"
                    value={newTeacherForm.nip}
                    onChange={e => setNewTeacherForm({ ...newTeacherForm, nip: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">UNIT KERJA SEKOLAH</label>
                  <input
                    type="text"
                    placeholder="Contoh: SMAN 1 BANDUNG"
                    value={newTeacherForm.school}
                    onChange={e => setNewTeacherForm({ ...newTeacherForm, school: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">NOMOR KARTU PEGAWAI (KARPEG)</label>
                  <input
                    type="text"
                    placeholder="Contoh: B03023705"
                    value={newTeacherForm.karpegNumber}
                    onChange={e => setNewTeacherForm({ ...newTeacherForm, karpegNumber: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">GOLONGAN SAAT INI</label>
                  <select
                    value={newTeacherForm.currentGolongan}
                    onChange={e => {
                      const val = e.target.value as GolonganID;
                      const Bases: Record<string, number> = {
                        'III/a': 100, 'III/b': 150, 'III/c': 200, 'III/d': 300,
                        'IV/a': 400, 'IV/b': 550, 'IV/c': 700, 'IV/d': 850, 'IV/e': 1050
                      };
                      setNewTeacherForm({ 
                        ...newTeacherForm, 
                        currentGolongan: val, 
                        baseAK: Bases[val] || 100
                      });
                    }}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500"
                  >
                    {GOLONGAN_LIST.map(g => (
                      <option key={g.id} value={g.id}>{g.id} - {g.pangkat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">TARGET GOLONGAN TRANSISI</label>
                  <select
                    value={newTeacherForm.targetGolongan}
                    onChange={e => setNewTeacherForm({ ...newTeacherForm, targetGolongan: e.target.value as GolonganID })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500"
                  >
                    {GOLONGAN_LIST.map(g => (
                      <option key={g.id} value={g.id}>{g.id} - Himpunan {g.pangkatTarget}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">AK PONDASI TRANSISI</label>
                  <input
                    type="number"
                    step="any"
                    value={newTeacherForm.baseAK}
                    onChange={e => setNewTeacherForm({ ...newTeacherForm, baseAK: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">AK PAK INTEGRASI 2022 (KONVERSI LAMA)</label>
                  <input
                    type="number"
                    step="any"
                    value={newTeacherForm.akIntegrasi2022}
                    onChange={e => setNewTeacherForm({ ...newTeacherForm, akIntegrasi2022: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">JENIS KELAMIN</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none text-slate-700">
                      <input 
                        type="radio" 
                        name="gender" 
                        checked={newTeacherForm.gender === 'Laki-Laki'} 
                        onChange={() => setNewTeacherForm({ ...newTeacherForm, gender: 'Laki-Laki' })}
                      /> Laki-Laki
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none text-slate-700">
                      <input 
                        type="radio" 
                        name="gender" 
                        checked={newTeacherForm.gender === 'Perempuan'} 
                        onChange={() => setNewTeacherForm({ ...newTeacherForm, gender: 'Perempuan' })}
                      /> Perempuan
                    </label>
                  </div>
                </div>

                <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Simpan & Kelola Guru ➔
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search Box */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Cari guru berdasarkan Nama, nomor NIP Pegawai, atau Sekolah..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none placeholder-slate-400"
            />
          </div>

          {/* Teachers list container */}
          {loadingTeachers ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
              <div className="w-10 h-10 rounded-full border-t-2 border-l-2 border-teal-600 animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500">Menghubungkan ke database cloud dan memuat data...</p>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-4 max-w-lg mx-auto">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm uppercase">Pangkalan Data Masih Kosong</h3>
                {searchQuery ? (
                  <p className="text-xs text-slate-500 mt-1">Pencarian untuk "{searchQuery}" tidak menemukan kecocokan di database.</p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 leading-normal mt-1">
                      Belum ada Guru PNS terdaftar untuk sekolah ini. Anda bisa menulis/mendaftarkan Guru PNS baru secara manual menggunakan tombol di atas, atau klik tombol di bawah untuk membuat instansiasi otomatis data contoh Guru Antan Kustiawan untuk pengetesan cepat.
                    </p>
                    <button
                      onClick={handleCreateDemoTeacher}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-450 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer border border-amber-400"
                    >
                      <Sparkles className="w-4 h-4" /> Instansiasi Otomatis Guru Antan Kustiawan
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeachers.map(teacher => (
                <div 
                  key={teacher.id} 
                  className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 hover:border-teal-500 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <span className="inline-block bg-teal-50 text-teal-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-teal-100 font-mono">
                        Golongan: {teacher.currentGolongan} ➔ {teacher.targetGolongan}
                      </span>
                      
                      <button
                        onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                        className="text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Hapus Guru"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-tight tracking-tight">{teacher.name}</h3>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">NIP: {teacher.nip}</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg text-[11px] space-y-1 text-slate-600 font-sans border border-slate-100">
                      <p><strong>Sekolah:</strong> {teacher.school || "Instansi belum diatur"}</p>
                      <p><strong>Karpeg:</strong> {teacher.karpegNumber || "-"}</p>
                      <div className="flex gap-4">
                        <p><strong>Integrasi 2022:</strong> {(teacher.akIntegrasi2022 || 0).toFixed(3)} AK</p>
                        {(teacher.akPendidikan || 0) > 0 && (
                          <p><strong>AK Pendidikan:</strong> {(teacher.akPendidikan || 0).toFixed(3)} AK</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectTeacher(teacher)}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-2 px-4 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer transition-colors"
                  >
                    Kelola Angka Kredit & Cetak PAK ➔
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <footer className="bg-slate-900 border-t border-slate-950 py-6 px-6 text-center text-xs text-slate-400 select-none">
          <p className="font-bold text-slate-300">SIPAK-GURU Hub © 2026</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Badan Kepegawaian Daerah & Dinas Pendidikan Pemerintah Provinsi Jawa Barat</p>
        </footer>

      </div>
    );
  }

  // --- AUTHENTICATED: SELECTED TEACHER ACTIVE WORKSPACE ---
  const golonganDetail = GOLONGAN_LIST.find(g => g.id === profile.currentGolongan) || GOLONGAN_LIST[0];
  const targetGolonganDetail = GOLONGAN_LIST.find(g => g.id === profile.targetGolongan) || GOLONGAN_LIST[1];

  // Core calculations linked to Firestore sub-collection array
  const totalSKPAC = evaluations.reduce((sum, item) => sum + (item.creditEarned || 0), 0);
  const totalPendidikanAK = (profile.akPendidikan || 0) + evaluations.reduce((sum, item) => sum + (item.akPendidikan || 0), 0);
  const currentTotalAK = (profile.akIntegrasi2022 || 0) + totalSKPAC + totalPendidikanAK;
  
  // Clean, modern alignment with BKN incremental standards (replaces flawed absolute targets)
  const targetAK = getMinimalPangkat(profile.currentGolongan);
  
  const rawNeededAK = targetAK - currentTotalAK;
  const neededAK = rawNeededAK > 0 ? rawNeededAK : 0;
  const progressPercent = Math.min(Math.round((currentTotalAK / targetAK) * 100), 100);
  const isEligible = currentTotalAK >= targetAK;

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-800 flex flex-col justify-between">
      
      {/* Top Banner Administration Alert */}
      <div id="top-admin-banner-workspace" className="bg-teal-950 text-teal-200 text-[11px] py-2 px-6 flex flex-col sm:flex-row justify-between items-center gap-2 border-b border-teal-900 font-mono select-none print:hidden">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-teal-300 animate-pulse fill-teal-950" />
          <span>PORTAL SIPAK-GURU • PEMBANGUNAN DOKUMEN PAK RESMI</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Petugas: <strong>{user.email}</strong></span>
          <button 
            onClick={handleLogout}
            className="bg-teal-900 hover:bg-teal-850 border border-teal-700 text-teal-300 px-2.5 py-0.5 rounded flex items-center gap-1 cursor-pointer font-bold text-[10px] transition-colors"
          >
            <LogOut className="w-3 h-3" /> Keluar
          </button>
        </div>
      </div>

      {/* Main Structural Framework */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        
        {/* Active Teacher Floating Context Banner */}
        <div className="bg-emerald-800 text-white p-4 rounded-xl shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-emerald-900 select-none print:hidden">
          <div>
            <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Sedang Mengelola Data Guru PNS:</p>
            <h2 className="text-lg font-black tracking-tight">{profile.name}</h2>
            <p className="text-xs font-mono text-emerald-200">
              NIP: {profile.nip} • {profile.school || "Instansi Belum Diatur"} • Tersebar {evaluations.length} E-SKP
            </p>
          </div>
          <button
            onClick={() => setSelectedTeacherId(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-emerald-900 hover:bg-emerald-950 border border-emerald-750 text-white rounded-lg transition-all cursor-pointer shadow-sm"
          >
            ⬅ KEMBALI KE REKAP GURU
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Navigation Sidebar (3 Cols on desktop) */}
          <aside className="lg:col-span-3 space-y-4 print:hidden">
            
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
              {/* Logo area */}
              <div className="flex items-center gap-2.5">
                <div className="bg-teal-600 text-white p-2 rounded-lg font-black text-lg tracking-wider shadow-xs">
                  S
                </div>
                <div>
                  <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">SIPAK-GURU KCD XIII</h1>
                  <p className="text-[10px] uppercase font-bold text-slate-400">PNS/ASN Career Tracker</p>
                </div>
              </div>
              
              <p className="text-xs text-slate-500 leading-normal">
                Perhitungan konversi angka kredit otomatis terstruktur yang disesuaikan dengan BKN dan Permenpan RB No. 1/2023.
              </p>
            </div>

            {/* Tab Button list */}
            <nav className="bg-white rounded-xl shadow-xs border border-slate-200 p-2 flex flex-col gap-1">
              <button
                onClick={() => setActiveTab("dashboard")}
                id="sidebar-nav-dashboard"
                className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4" />
                  DASHBOARD RINGKASAN
                </span>
              </button>

              <button
                onClick={() => setActiveTab("activities")}
                id="sidebar-nav-activities"
                className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "activities"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4" />
                  E-SKP EVALUASI LOG
                </span>
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'activities' ? 'bg-teal-700 text-teal-100' : 'bg-slate-100 text-slate-500'}`}>
                  {evaluations.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("pak_report")}
                id="sidebar-nav-pak-report"
                className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "pak_report"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4" />
                  BLANGKO PAK RESMI (3 HAL)
                </span>
                <span className="bg-amber-100/80 text-amber-950 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-200 uppercase select-none">
                  PDF
                </span>
              </button>

              <button
                onClick={() => setActiveTab("calculator")}
                id="sidebar-nav-calculator"
                className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "calculator"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Calculator className="w-4 h-4" />
                  SIMULASI & KALKULATOR
                </span>
              </button>

              <button
                onClick={() => setActiveTab("regulations")}
                id="sidebar-nav-regulations"
                className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "regulations"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4" />
                  PANDUAN & REGULASI BKN
                </span>
              </button>

              <button
                onClick={() => setActiveTab("kop_admin")}
                id="sidebar-nav-kop-admin"
                className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "kop_admin"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-emerald-600" />
                  MENU ADMIN: KOP & LOGO
                </span>
                <span className="bg-rose-100 text-rose-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase select-none">
                  ADMIN
                </span>
              </button>
            </nav>

            {/* Quick Actions Panel */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 space-y-2 text-xs">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aksi Cepat</span>
              
              <button
                onClick={handlePrint}
                id="print-btn"
                className="w-full flex items-center gap-2 px-3 py-2 border border-slate-250 hover:bg-slate-50 text-slate-700 font-semibold rounded cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                Cetak Dokumen PAK Resmi
              </button>
            </div>

          </aside>

          {/* Core Main Area Content Tab rendering (9 Cols on desktop) */}
          <main className="lg:col-span-9 space-y-6">
            
            {/* Print specific header - invisible on screen, visible during browser printing */}
            <div className="hidden print:block">
              <OfficialPAKReport
                profile={profile}
                setProfile={handleProfileChange}
                evaluations={evaluations}
                kopSettings={kopSettings}
                setKopSettings={setKopSettings}
              />
            </div>

            {/* Active Tab Screen Component */}
            <div className="print:hidden">
              {activeTab === "dashboard" && (
                <DashboardTab
                  profile={profile}
                  setProfile={handleProfileChange}
                  evaluations={evaluations}
                  golonganDetail={golonganDetail}
                  targetGolonganDetail={targetGolonganDetail}
                />
              )}
              
              {activeTab === "activities" && (
                <ActivityLogTab
                  evaluations={evaluations}
                  onAddEvaluation={handleAddEvaluation}
                  onDeleteEvaluation={handleDeleteEvaluation}
                  currentGolonganLevel={getTeacherLevel(profile.currentGolongan)}
                />
              )}

              {activeTab === "pak_report" && (
                <OfficialPAKReport
                  profile={profile}
                  setProfile={handleProfileChange}
                  evaluations={evaluations}
                  kopSettings={kopSettings}
                  setKopSettings={setKopSettings}
                />
              )}

              {activeTab === "calculator" && (
                <CalculatorTab />
              )}

              {activeTab === "regulations" && (
                <RegulationsTab />
              )}

              {activeTab === "kop_admin" && (
                <KopAdminTab
                  kopSettings={kopSettings}
                  setKopSettings={setKopSettings}
                />
              )}
            </div>

          </main>

        </div>

      </div>

      {/* Footer copyright info */}
      <footer className="bg-slate-900 border-t border-slate-950 py-6 px-6 text-center text-xs text-slate-400 print:hidden">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="font-bold text-slate-300">SIPAK-GURU © 2026</p>
            <p className="text-[10px] text-slate-500 font-medium">Sistem Perhitungan Portofolio Angka Kredit Integrasi Guru Dinas Pendidikan Provinsi Jawa Barat</p>
          </div>
          <div className="flex gap-4 text-[10px] select-none text-slate-500">
            <span>Buku Pedoman BKN</span>
            <span>•</span>
            <span>Konversi Nilai SKP</span>
            <span>•</span>
            <span>SInep BKN Online</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
