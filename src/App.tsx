import React, { useState, useEffect, useMemo } from "react";
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
  Settings,
  Users,
  School,
  Building,
  Upload,
  Download,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Terminal
} from "lucide-react";
import { 
  collection, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  setDoc,
  getDoc,
  getDocs
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { TeacherProfile, SKPEvaluation, GolonganID, KopSettings } from "./types";
import { GOLONGAN_LIST, getTeacherLevel, GOLONGAN_BASE_VALS, getMinimalPangkat, getMinimalJenjang } from "./data/golonganData";
import DashboardTab from "./components/DashboardTab";
import ActivityLogTab from "./components/ActivityLogTab";
import CalculatorTab from "./components/CalculatorTab";
import RegulationsTab from "./components/RegulationsTab";
import OfficialPAKReport from "./components/OfficialPAKReport";
import KopAdminTab from "./components/KopAdminTab";
import UserManagementTab from "./components/UserManagementTab";
import SchoolManagementTab from "./components/SchoolManagementTab";
import LoggingManagementTab from "./components/LoggingManagementTab";
import { toast, swal } from "./lib/toast";

// Helper to safely parse decimal values in Indonesian format (supporting commas)
export const parseFloatValue = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim().replace(',', '.');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};


export interface AppUser {
  username: string;
  password?: string;
  role: 'super_admin' | 'school_admin';
  school: string;
  displayName: string;
}

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
  // Authentication states (custom database sessions)
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Login input states
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLogining, setIsLogining] = useState(false);

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

  const [isImporting, setIsImporting] = useState(false);
  const [teacherEvalsCache, setTeacherEvalsCache] = useState<Record<string, number>>({});
  const [teacherPendCache, setTeacherPendCache] = useState<Record<string, number>>({});

  // Layout View Mode & Pagination states (especially for admin/super_admin view toggling)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Filters and Sorting states for teacher database
  const [filterSchool, setFilterSchool] = useState<string>("");
  const [filterGolongan, setFilterGolongan] = useState<string>("");
  const [filterEligibility, setFilterEligibility] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("name_asc");

  // Selected teacher states
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [evaluations, setEvaluations] = useState<SKPEvaluation[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "activities" | "calculator" | "regulations" | "pak_report" | "kop_admin" | "user_management">("dashboard");
  const [adminView, setAdminView] = useState<"teachers" | "users" | "kop" | "calculator" | "regulations" | "schools" | "logs">("teachers");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [schoolsList, setSchoolsList] = useState<{ id: string, name: string, npsn: string, principalName?: string, principalNip?: string, principalStatus?: 'definitif' | 'plt' | 'plh' }[]>([]);

  // Custom confirmation dialog states
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<{ id: string, name: string } | null>(null);

  // Elegant Toast notifications state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }[]>([]);
  // SweetAlert modal state
  const [activeSwal, setActiveSwal] = useState<{ id: string; title: string; text: string; icon: 'success' | 'error' | 'info' | 'warning'; confirmButtonText?: string } | null>(null);

  // Listen to sipak_toast events
  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: 'success' | 'error' | 'info' | 'warning' }>;
      const { message, type } = customEvent.detail;
      const id = Math.random().toString(36).substring(2, 9);
      
      setToasts(prev => [...prev, { id, message, type }]);

      // Auto remove after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    };

    const handleSwalEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ title: string; text: string; icon: 'success' | 'error' | 'info' | 'warning'; confirmButtonText?: string }>;
      const { title, text, icon, confirmButtonText } = customEvent.detail;
      setActiveSwal({
        id: Math.random().toString(36).substring(2, 9),
        title,
        text,
        icon,
        confirmButtonText: confirmButtonText || "OK, Selesai"
      });
    };

    window.addEventListener('sipak_toast', handleToastEvent);
    window.addEventListener('sipak_swal', handleSwalEvent);

    // Global Error and Promise Rejection logging
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message?.includes('websocket') || event.message?.includes('HMR')) return;
      import('./lib/logger').then(({ logEvent }) => {
        logEvent(`Runtime Error: ${event.message} at ${event.filename}:${event.lineno}`, 'error').catch(() => {});
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const errorMsg = reason instanceof Error ? reason.message : String(reason);
      if (errorMsg.includes('websocket') || errorMsg.includes('HMR')) return;
      import('./lib/logger').then(({ logEvent }) => {
        logEvent(`Unhandled Promise Rejection: ${errorMsg}`, 'error').catch(() => {});
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('sipak_toast', handleToastEvent);
      window.removeEventListener('sipak_swal', handleSwalEvent);
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

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
      row6: 'BANDUNG - 40171',
      tteLogoType: 'default',
      tteLogoUrl: '',
      tteLogoBase64: '',
      tteTextHeader: 'Ditandatangani secara elektronik oleh :'
    };
  });

  // Ensure default admin & school operator profiles exist in Firestore
  const ensureDefaultUsers = async () => {
    try {
      const defaultAccounts = [
        {
          username: "admin",
          password: "adminpaskonversi",
          school: "ALL",
          role: "super_admin" as const,
          displayName: "Super Admin Dinas Pendidikan"
        },
        {
          username: "sman2ciamis",
          password: "sman2ciamis123",
          school: "SMAN 2 CIAMIS",
          role: "school_admin" as const,
          displayName: "Admin SMAN 2 Ciamis"
        },
        {
          username: "sman1ciamis",
          password: "sman1ciamis123",
          school: "SMAN 1 CIAMIS",
          role: "school_admin" as const,
          displayName: "Admin SMAN 1 Ciamis"
        }
      ];

      for (const acc of defaultAccounts) {
        const dRef = doc(db, "app_users", acc.username);
        await setDoc(dRef, acc, { merge: true });
      }
    } catch (e) {
      console.warn("Muted credential initialization (offline capability preserved):", e);
    }
  };

  // Load session & configuration on Mount
  useEffect(() => {
    const saved = localStorage.getItem("sipak_current_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (err) {
        localStorage.removeItem("sipak_current_user");
      }
    }
    
    ensureDefaultUsers().finally(() => {
      setAuthLoading(false);
    });
  }, []);

  // Load settings from Firestore on Login
  useEffect(() => {
    if (!user) return;

    const docId = `kop_${user.username}`;
    const docRef = doc(db, "settings", docId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setKopSettings(prev => {
          if (
            prev.logoType === data.logoType &&
            prev.customLogoUrl === data.customLogoUrl &&
            prev.row1 === data.row1 &&
            prev.row2 === data.row2 &&
            prev.row3 === data.row3 &&
            prev.row4 === data.row4 &&
            prev.row5 === data.row5 &&
            prev.row6 === data.row6 &&
            prev.tteLogoType === data.tteLogoType &&
            prev.tteLogoUrl === data.tteLogoUrl &&
            prev.tteLogoBase64 === data.tteLogoBase64 &&
            prev.tteTextHeader === data.tteTextHeader &&
            prev.tteTextJabatan1 === data.tteTextJabatan1 &&
            prev.tteTextJabatan2 === data.tteTextJabatan2
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
            row6: data.row6 || '',
            tteLogoType: (data.tteLogoType as 'default' | 'url' | 'upload') || 'default',
            tteLogoUrl: data.tteLogoUrl || '',
            tteLogoBase64: data.tteLogoBase64 || '',
            tteTextHeader: data.tteTextHeader || 'Ditandatangani secara elektronik oleh :',
            tteTextJabatan1: data.tteTextJabatan1 || '',
            tteTextJabatan2: data.tteTextJabatan2 || ''
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

    const docId = `kop_${user.username}`;
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
          row6: kopSettings.row6 || '',
          tteLogoType: kopSettings.tteLogoType || 'default',
          tteLogoUrl: kopSettings.tteLogoUrl || '',
          tteLogoBase64: kopSettings.tteLogoBase64 || '',
          tteTextHeader: kopSettings.tteTextHeader || 'Ditandatangani secara elektronik oleh :',
          tteTextJabatan1: kopSettings.tteTextJabatan1 || '',
          tteTextJabatan2: kopSettings.tteTextJabatan2 || ''
        });
      } catch (err) {
        console.error("Gagal mencadangkan KOP ke Firestore:", err);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [kopSettings, user]);

  // Listen to schools collection in real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "schools"),
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setSchoolsList(list);
      },
      (err) => {
        console.error("Gagal memuat list sekolah master:", err);
      }
    );
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
          const itemSchool = (data.school || "").trim().toUpperCase();
          const userSchool = (user.school || "").trim().toUpperCase();
          
          // Tenant Isolation: If school operator, only show teachers of their school
          if (user.role === 'school_admin' && itemSchool !== userSchool) {
            return;
          }

          list.push({
            id: docSnap.id,
            name: data.name || "",
            nip: data.nip || "",
            school: data.school || "",
            currentGolongan: data.currentGolongan || "III/c",
            targetGolongan: data.targetGolongan || "III/d",
            baseAK: parseFloatValue(data.baseAK) || 0,
            akIntegrasi2022: parseFloatValue(data.akIntegrasi2022) || 0,
            akPendidikan: parseFloatValue(data.akPendidikan) || 0,
            ratingSKP: data.ratingSKP || "Baik",
            workDurationYears: parseFloatValue(data.workDurationYears) || 1,
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
            pejabatPenilaiGolongan: data.pejabatPenilaiGolongan || "",
            pejabatPenilaiStatus: data.pejabatPenilaiStatus || "definitif",
            skPangkatFileLink: data.skPangkatFileLink || "",
            pakIntegrasiFileLink: data.pakIntegrasiFileLink || "",
            ijazahFileLink: data.ijazahFileLink || "",
            additionalFileLink: data.additionalFileLink || ""
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
            customMonths: Number(evalData.customMonths) || 12,
            skpFileLink: evalData.skpFileLink || "",
            evidenceFileLink: evalData.evidenceFileLink || ""
          });
        });
        // Sort newest first
        evalsList.sort((a, b) => b.year - a.year || b.period.localeCompare(a.period));
        setEvaluations(evalsList);

        // Update caches reactively
        const sumAK = evalsList.reduce((sum, item) => sum + (item.creditEarned || 0), 0);
        const sumPend = evalsList.reduce((sum, item) => sum + (item.akPendidikan || 0), 0);
        setTeacherEvalsCache(prev => ({ ...prev, [selectedTeacherId]: sumAK }));
        setTeacherPendCache(prev => ({ ...prev, [selectedTeacherId]: sumPend }));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `teachers/${selectedTeacherId}/evaluations`);
      }
    );

    return () => unsubscribe();
  }, [selectedTeacherId]);

  // Load evaluations sum cache in list/dashboard fungsional view
  const teachersIdsKey = teachers.map(t => t.id).join(",");
  useEffect(() => {
    if (teachers.length === 0) return;
    
    const loadCache = async () => {
      // Async loop to fetch aggregates
      for (const t of teachers) {
        t.id && getDocs(collection(db, "teachers", t.id, "evaluations"))
          .then(snap => {
            let sumAK = 0;
            let sumPend = 0;
            snap.forEach(d => {
              const val = d.data();
              sumAK += Number(val.creditEarned) || 0;
              sumPend += Number(val.akPendidikan) || 0;
            });
            setTeacherEvalsCache(prev => {
              if (prev[t.id] === sumAK) return prev;
              return { ...prev, [t.id]: sumAK };
            });
            setTeacherPendCache(prev => {
              if (prev[t.id] === sumPend) return prev;
              return { ...prev, [t.id]: sumPend };
            });
          })
          .catch(e => console.warn("Failed to fetch valuations for teacher " + t.id, e));
      }
    };
    
    loadCache();
  }, [teachersIdsKey]);

  // Reset pagination page when search or itemsPerPage or filters are modified
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage, filterSchool, filterGolongan, filterEligibility, sortBy]);

  // Handle User login (Username / Password Verification with local fallback)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLogining(true);

    const uName = loginUsername.trim().toLowerCase();
    const pWord = loginPassword.trim();

    if (!uName || !pWord) {
      setLoginError("Harap isi seluruh kolom login!");
      setIsLogining(false);
      return;
    }

    // Modern local hardcoded fallback profiles (provides instant offline testing in VSCODE)
    const defaultAccounts = [
      {
        username: "admin",
        password: "adminpaskonversi",
        school: "ALL",
        role: "super_admin" as const,
        displayName: "Super Admin Dinas Pendidikan"
      },
      {
        username: "sman2ciamis",
        password: "sman2ciamis123",
        school: "SMAN 2 CIAMIS",
        role: "school_admin" as const,
        displayName: "Admin SMAN 2 Ciamis"
      },
      {
        username: "sman1ciamis",
        password: "sman1ciamis123",
        school: "SMAN 1 CIAMIS",
        role: "school_admin" as const,
        displayName: "Admin SMAN 1 Ciamis"
      }
    ];

    try {
      // 1. Fetch from Firestore app_users collection
      const docRef = doc(db, "app_users", uName);
      let sessionUser: AppUser | null = null;

      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.password === pWord) {
            sessionUser = {
              username: uName,
              displayName: data.displayName || uName,
              role: data.role || "school_admin",
              school: data.school || ""
            };
          } else {
            setLoginError("Kombinasi password yang dimasukkan salah!");
            setIsLogining(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Firestore query failed, searching local fallback (preserves offline testing):", err);
      }

      // 2. Offline Fallback Check (if cloud is unreachable or doc not updated yet)
      if (!sessionUser) {
        const matchedLocal = defaultAccounts.find(acc => acc.username === uName && acc.password === pWord);
        if (matchedLocal) {
          sessionUser = {
            username: matchedLocal.username,
            displayName: matchedLocal.displayName,
            role: matchedLocal.role,
            school: matchedLocal.school
          };
        }
      }

      // 3. Final authentication verdict
      if (sessionUser) {
        setUser(sessionUser);
        localStorage.setItem("sipak_current_user", JSON.stringify(sessionUser));
        setActiveTab("dashboard");
        setLoginUsername("");
        setLoginPassword("");
        swal.fire({
          title: "Login Berhasil!",
          text: `Selamat datang kembali, ${sessionUser.displayName}! Anda berhasil masuk sebagai ${sessionUser.role === 'super_admin' ? 'Super Admin KCD XIII' : 'Admin Unit Kerja'}.`,
          icon: "success",
          confirmButtonText: "Masuk ke Dashboard"
        });
      } else {
        if (!loginError) {
          const errText = "Akun Pengguna tidak ditemukan! Hubungi Super Admin KCD XIII Dinas Pendidikan.";
          setLoginError(errText);
          swal.fire({
            title: "Gagal Masuk!",
            text: errText,
            icon: "error",
            confirmButtonText: "Coba Lagi"
          });
        }
      }
    } catch (err) {
      console.error(err);
      const errText = "Terjadi kesalahan sistem saat menghubungi database cloud!";
      setLoginError(errText);
      swal.fire({
        title: "Kesalahan Sistem!",
        text: errText,
        icon: "error"
      });
    } finally {
      setIsLogining(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    setLogoutConfirmOpen(true);
  };

  // Actual Logout Action (bypasses window.confirm sandbox issues)
  const executeLogout = () => {
    const oldName = user?.displayName || "Pengguna";
    setUser(null);
    setSelectedTeacherId(null);
    setProfile(null);
    setEvaluations([]);
    setAdminView("teachers");
    localStorage.removeItem("sipak_current_user");
    localStorage.removeItem("sipak_kop_settings");
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
    setLogoutConfirmOpen(false);
    swal.fire({
      title: "Keluar Berhasil!",
      text: `Sampai jumpa kembali, ${oldName}! Anda telah berhasil keluar dari SIPAK-GURU Hub dengan aman.`,
      icon: "info",
      confirmButtonText: "Kembali ke Beranda"
    });
  };

  // Add new teacher profile to database
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!newTeacherForm.name || !newTeacherForm.nip) {
      toast.warning("Harap lengkapi Nama Lengkap dan NIP Guru PNS!");
      return;
    }

    const assignedSchool = user.role === 'school_admin' ? user.school : newTeacherForm.school;

    // Fast-lookup principal details from schoolsList master data
    const matchedSchool = schoolsList.find(s => s.name.toUpperCase().trim() === assignedSchool.toUpperCase().trim());
    const principalName = matchedSchool?.principalName || "";
    const principalNip = matchedSchool?.principalNip || "";

    try {
      const data: Omit<TeacherProfile, 'createdBy' | 'createdAt' | 'updatedAt'> = {
        name: newTeacherForm.name.toUpperCase().trim(),
        nip: newTeacherForm.nip.replace(/\s+/g, ""),
        school: assignedSchool.toUpperCase().trim(),
        currentGolongan: newTeacherForm.currentGolongan,
        targetGolongan: newTeacherForm.targetGolongan,
        baseAK: parseFloatValue(newTeacherForm.baseAK),
        akIntegrasi2022: parseFloatValue(newTeacherForm.akIntegrasi2022),
        akPendidikan: 0,
        ratingSKP: "Baik",
        workDurationYears: 3,
        karpegNumber: newTeacherForm.karpegNumber.toUpperCase().trim(),
        gender: newTeacherForm.gender,
        birthPlaceDate: "",
        tmtCurrentPangkat: "",
        tmtCurrentJabatan: "",
        unitKerja: `${assignedSchool.toUpperCase().trim()} KABUPATEN CIAMIS CABANG PENDIDIKAN WILAYAH XIII`,
        instansiBiro: "PEMERINTAH PROVINSI JAWA BARAT",
        nomorSuratKonversi: "",
        nomorSuratAkumulasi: "",
        nomorSuratPenetapan: "",
        tempatDitetapkan: "Bandung",
        tanggalPenetapan: "",
        pejabatPenilaiTitle: matchedSchool ? "KEPALA SEKOLAH" : "KEPALA CABANG PENDIDIKAN",
        pejabatPenilaiInstansi: matchedSchool ? assignedSchool.toUpperCase().trim() : "PROVINSI JAWA BARAT",
        pejabatPenilaiNama: principalName,
        pejabatPenilaiNip: principalNip,
        pejabatPenilaiGolongan: "",
        pejabatPenilaiStatus: matchedSchool?.principalStatus || "definitif"
      };

      const docRef = await addDoc(collection(db, "teachers"), {
        ...data,
        createdBy: user.username,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      swal.fire({
        title: "Pendaftaran Sukses!",
        text: `Guru PNS "${newTeacherForm.name.toUpperCase().trim()}" berhasil disimpan ke cloud database. Silakan lengkapi angka kredit atau berkas penilaian SKP sekarang!`,
        icon: "success",
        confirmButtonText: "Mulai Lengkapi Data"
      });
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

  // Export Teachers to CSV
  const handleExportTeachersToCSV = () => {
    const headers = [
      "Nama Lengkap",
      "NIP Pegawai",
      "Jenis Kelamin",
      "Golongan Saat Ini",
      "Target Golongan Transisi",
      "AK PAK Integrasi 2022",
      "AK Pondasi Transisi",
      "Nomor Kartu Pegawai (Karpeg)",
      "Sekolah Unit Kerja"
    ];

    const rows = filteredTeachers.map(t => [
      t.name,
      t.nip,
      t.gender || "Laki-Laki",
      t.currentGolongan,
      t.targetGolongan,
      t.akIntegrasi2022 || 0,
      t.baseAK || 0,
      t.karpegNumber || "",
      t.school || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sipak_guru_pns_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download standard CSV import template
  const handleDownloadTemplateCSV = () => {
    const headers = [
      "Nama Lengkap",
      "NIP Pegawai",
      "Jenis Kelamin",
      "Golongan Saat Ini",
      "Target Golongan Transisi",
      "AK PAK Integrasi 2022",
      "AK Pondasi Transisi",
      "Nomor Kartu Pegawai (Karpeg)",
      "Sekolah Unit Kerja"
    ];

    const sampleRow = [
      "Drs. GURU CONTOH, M.Pd.",
      "198505242010111002",
      "Laki-Laki",
      "III/c",
      "III/d",
      "25.5",
      "200",
      "C45678912",
      user?.school || "SMAN 1 Kawali"
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), sampleRow.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_import_guru_sipak.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper parser for simple CSV strings
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length <= 1) return [];
    
    const results = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const row: string[] = [];
      let insideQuote = false;
      let currentField = "";
      
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          row.push(currentField.trim());
          currentField = "";
        } else {
          currentField += char;
        }
      }
      row.push(currentField.trim());
      
      const cleanRow = row.map(f => f.replace(/^["']|["']$/g, "").trim());
      if (cleanRow.length === 0 || !cleanRow[0]) continue;
      
      results.push(cleanRow);
    }
    return results;
  };

  // Handle local CSV import parsing and saving to Firestore
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      try {
        const rows = parseCSV(text);
        if (rows.length === 0) {
          swal.fire({
            title: "File Kosong!",
            text: "Tidak ada data guru yang valid terbaca dari file CSV tersebut.",
            icon: "warning"
          });
          return;
        }

        let importCount = 0;
        let skippedCount = 0;

        for (const row of rows) {
          const name = row[0] || "";
          const nip = (row[1] || "").replace(/\s+/g, "");

          if (!name || nip.length < 10) {
            skippedCount++;
            continue;
          }

          const gender = (row[2] === "Perempuan" ? "Perempuan" : "Laki-Laki") as "Laki-Laki" | "Perempuan";
          const currentGolongan = (row[3] || "III/c") as GolonganID;
          const targetGolongan = (row[4] || "III/d") as GolonganID;
          const akIntegrasi2022 = Number(row[5]) || 0;
          const baseAK = Number(row[6]) || 200;
          const karpegNumber = row[7] || "";
          
          // Tenant protection boundaries
          const assignedSchool = user?.role === 'school_admin' ? user.school : (row[8] || "SMAN 1 KAWALI");

          const matchedSchool = schoolsList.find(s => s.name.toUpperCase().trim() === assignedSchool.toUpperCase().trim());
          const principalName = matchedSchool?.principalName || "";
          const principalNip = matchedSchool?.principalNip || "";

          const teacherDoc = {
            name: name.toUpperCase().trim(),
            nip: nip,
            school: assignedSchool.toUpperCase().trim(),
            currentGolongan,
            targetGolongan,
            baseAK,
            akIntegrasi2022,
            akPendidikan: 0,
            ratingSKP: "Baik" as const,
            workDurationYears: 3,
            karpegNumber: karpegNumber.toUpperCase().trim(),
            birthPlaceDate: "",
            gender,
            tmtCurrentPangkat: "",
            tmtCurrentJabatan: "",
            unitKerja: `${assignedSchool.toUpperCase().trim()} KABUPATEN CIAMIS CABANG PENDIDIKAN WILAYAH XIII`,
            instansiBiro: "PEMERINTAH PROVINSI JAWA BARAT",
            nomorSuratKonversi: "",
            nomorSuratAkumulasi: "",
            nomorSuratPenetapan: "",
            tempatDitetapkan: "Bandung",
            tanggalPenetapan: "",
            pejabatPenilaiTitle: matchedSchool ? "KEPALA SEKOLAH" : "KEPALA CABANG PENDIDIKAN",
            pejabatPenilaiInstansi: matchedSchool ? assignedSchool.toUpperCase().trim() : "PROVINSI JAWA BARAT",
            pejabatPenilaiNama: principalName,
            pejabatPenilaiNip: principalNip,
            pejabatPenilaiGolongan: "",
            pejabatPenilaiStatus: matchedSchool?.principalStatus || ("definitif" as const)
          };

          await addDoc(collection(db, "teachers"), {
            ...teacherDoc,
            createdBy: user?.username || "admin",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          importCount++;
        }

        swal.fire({
          title: "Impor Berhasil!",
          text: `Berhasil mengimpor ${importCount} data guru.${skippedCount > 0 ? ` (${skippedCount} baris dilewati karena format data tidak valid/kosong)` : ""}`,
          icon: "success",
          confirmButtonText: "Selesai"
        });
        setIsImporting(false);
      } catch (err: any) {
        swal.fire({
          title: "Impor Gagal!",
          text: "Terjadi kesalahan saat memproses data CSV: " + (err.message || String(err)),
          icon: "error"
        });
      }
    };
    reader.readAsText(file);
  };

  // Instantiates the default test educator Antan Kustiawan directly inside Firestore
  const handleCreateDemoTeacher = async () => {
    if (!user) return;
    try {
      setLoadingTeachers(true);
      const activeSchool = user.role === 'school_admin' ? user.school : "SMAN 2 CIAMIS";
      
      const teacherDemo = {
        name: "ANTAN KUSTIAWAN, S.Pd, M.Pd.",
        nip: "198606192011011001",
        school: activeSchool,
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
        unitKerja: `${activeSchool} KABUPATEN CIAMIS CABANG PENDIDIKAN WILAYAH XIII`,
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
        pejabatPenilaiGolongan: "Pembina Tk.I",
        pejabatPenilaiStatus: "definitif"
      };

      const docRef = await addDoc(collection(db, "teachers"), {
        ...teacherDemo,
        createdBy: user.username,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const teacherId = docRef.id;

      // Add evaluation logs for Antan
      for (const item of DEFAULT_EVALUATIONS) {
        await addDoc(collection(db, "teachers", teacherId, "evaluations"), {
          ...item,
          createdBy: user.username,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      toast.success("Akun Contoh Guru (Antan Kustiawan, S.Pd, M.Pd.) berhasil diinisialisasi beserta 3 log penilaian SKP!");
    } catch (err) {
      console.error("Creation failed", err);
      toast.error("Gagal melakukan instansiasi akun contoh.");
    } finally {
      setLoadingTeachers(false);
    }
  };

  // Delete a teacher profile and all child structures
  const handleDeleteTeacher = async (id: string, name: string) => {
    setTeacherToDelete({ id, name });
  };

  // Actual Delete Action (bypasses window.confirm sandbox issues)
  const executeDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    const { id, name } = teacherToDelete;
    try {
      await deleteDoc(doc(db, "teachers", id));
      if (selectedTeacherId === id) {
        setSelectedTeacherId(null);
        setProfile(null);
        setEvaluations([]);
      }
      toast.success(`Data riwayat Guru "${name}" berhasil dihapus secara permanen.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `teachers/${id}`);
    } finally {
      setTeacherToDelete(null);
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
    
    // Ensure all numeric values are cleanly parsed floats/numbers
    const parsedUpdated: TeacherProfile = {
      ...updated,
      baseAK: parseFloatValue(updated.baseAK),
      akIntegrasi2022: parseFloatValue(updated.akIntegrasi2022),
      akPendidikan: parseFloatValue(updated.akPendidikan),
      workDurationYears: parseFloatValue(updated.workDurationYears) || 1
    };

    // Set local state immediately for instant responsive live view and printing
    setProfile(parsedUpdated);

    try {
      // Clean undefined properties and system internal fields to prevent Firestore rule violations
      const cleanData: any = {};
      Object.entries(parsedUpdated).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'createdAt' && key !== 'createdBy') {
          cleanData[key] = value;
        }
      });

      await updateDoc(doc(db, "teachers", selectedTeacherId), {
        ...cleanData,
        updatedAt: serverTimestamp()
      });

      toast.success("Data pegawai berhasil disimpan ke cloud database.");
    } catch (err) {
      console.error("Firestore update failed:", err);
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
        skpFileLink: newEval.skpFileLink || "",
        evidenceFileLink: newEval.evidenceFileLink || "",
        createdBy: user.username,
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

  // Filter & sort teachers based on search query, school filter, golongan filter, eligibility filter, and sorting choice
  const filteredTeachers = useMemo(() => {
    let list = teachers.filter(t => {
      // 1. Text Search query
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.nip.includes(searchQuery) ||
        t.school.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 2. School Filter
      if (filterSchool && t.school !== filterSchool) return false;

      // 3. Golongan Filter
      if (filterGolongan && t.currentGolongan !== filterGolongan) return false;

      // 4. Eligibility Filter
      if (filterEligibility) {
        const sumAK = teacherEvalsCache[t.id] || 0;
        const sumPend = teacherPendCache[t.id] || 0;
        const totalPendidikanAK = (t.akPendidikan || 0) + sumPend;
        const currentTotalAK = (t.akIntegrasi2022 || 0) + sumAK + totalPendidikanAK;

        const minimalPangkat = getMinimalPangkat(t.currentGolongan);
        const minimalJenjang = getMinimalJenjang(t.currentGolongan);

        const isCrossingJenjang = getTeacherLevel(t.currentGolongan) !== getTeacherLevel(t.targetGolongan);
        const isEligible = isCrossingJenjang 
          ? (currentTotalAK >= minimalPangkat && currentTotalAK >= minimalJenjang)
          : (currentTotalAK >= minimalPangkat);

        if (filterEligibility === "eligible" && !isEligible) return false;
        if (filterEligibility === "not_eligible" && isEligible) return false;
      }

      return true;
    });

    // 5. Sorting choice
    list.sort((a, b) => {
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "name_desc") {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === "nip") {
        return a.nip.localeCompare(b.nip);
      }
      if (sortBy === "ak_desc" || sortBy === "ak_asc") {
        const sumAK_A = teacherEvalsCache[a.id] || 0;
        const sumPend_A = teacherPendCache[a.id] || 0;
        const totalAK_A = (a.akIntegrasi2022 || 0) + sumAK_A + (a.akPendidikan || 0) + sumPend_A;

        const sumAK_B = teacherEvalsCache[b.id] || 0;
        const sumPend_B = teacherPendCache[b.id] || 0;
        const totalAK_B = (b.akIntegrasi2022 || 0) + sumAK_B + (b.akPendidikan || 0) + sumPend_B;

        return sortBy === "ak_desc" ? totalAK_B - totalAK_A : totalAK_A - totalAK_B;
      }
      return 0;
    });

    return list;
  }, [teachers, searchQuery, filterSchool, filterGolongan, filterEligibility, sortBy, teacherEvalsCache, teacherPendCache]);

  const stats = useMemo(() => {
    let total = teachers.length;
    let eligible = 0;
    let totalAK = 0;

    teachers.forEach(t => {
      const sumAK = teacherEvalsCache[t.id] || 0;
      const sumPend = teacherPendCache[t.id] || 0;
      const totalPendidikanAK = (t.akPendidikan || 0) + sumPend;
      const currentTotalAK = (t.akIntegrasi2022 || 0) + sumAK + totalPendidikanAK;
      totalAK += currentTotalAK;

      const minimalPangkat = getMinimalPangkat(t.currentGolongan);
      const minimalJenjang = getMinimalJenjang(t.currentGolongan);

      const isCrossingJenjang = getTeacherLevel(t.currentGolongan) !== getTeacherLevel(t.targetGolongan);
      const isEligible = isCrossingJenjang 
        ? (currentTotalAK >= minimalPangkat && currentTotalAK >= minimalJenjang)
        : (currentTotalAK >= minimalPangkat);

      if (isEligible) {
        eligible++;
      }
    });

    return {
      total,
      eligible,
      notEligible: total - eligible,
      avgAK: total > 0 ? (totalAK / total) : 0
    };
  }, [teachers, teacherEvalsCache, teacherPendCache]);

  const hasPagination = !!user;
  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const indexOfLastItem = safeCurrentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTeachers = hasPagination 
    ? filteredTeachers.slice(indexOfFirstItem, indexOfLastItem)
    : filteredTeachers;
  const activeViewMode = hasPagination ? viewMode : 'grid';

  const maxPageVisible = 5;
  const getPageNumbers = () => {
    const pages = [];
    let startPage = Math.max(1, safeCurrentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxPageVisible - 1);
    
    if (endPage - startPage < maxPageVisible - 1) {
      startPage = Math.max(1, endPage - maxPageVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Render Custom confirmation modals
  const renderConfirmModals = () => {
    return (
      <>
        {/* Logout Confirmation Modal */}
        {logoutConfirmOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn text-slate-100">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-5 text-center">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <LogOut className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-100 uppercase tracking-tight font-sans">Konfirmasi Keluar</h3>
                <p className="text-xs text-slate-400 font-sans">
                  Apakah Anda yakin ingin keluar dari portal administrasi SIPAK-GURU? Anda perlu masuk kembali menggunakan kredensial Anda untuk melanjutkan pekerjaan.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl border border-slate-700/80 cursor-pointer transition-colors font-sans"
                >
                  BATAL
                </button>
                <button
                  type="button"
                  onClick={executeLogout}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl border border-rose-500 cursor-pointer transition-colors font-sans"
                >
                  YA, KELUAR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Teacher Confirmation Modal */}
        {teacherToDelete && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn text-slate-100">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-100 uppercase tracking-tight text-rose-500 font-sans font-black">Peringatan Keras Penghapusan</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Apakah Anda yakin ingin menghapus data Guru PNS bernama <strong className="text-white">"{teacherToDelete.name}"</strong>? 
                  Tindakan ini tidak dapat dibatalkan. Seluruh dokumen angka kredit dan riwayat E-SKP yang bersangkutan akan dihapus secara permanen dari server awan (cloud).
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTeacherToDelete(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold text-xs rounded-xl border border-slate-705 cursor-pointer transition-colors font-sans"
                >
                  BATALKAN
                </button>
                <button
                  type="button"
                  onClick={executeDeleteTeacher}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl border border-rose-500 cursor-pointer transition-colors shadow-lg shadow-rose-950/30 font-sans"
                >
                  YA, HAPUS PERMANEN
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

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

  // --- UNAUTHENTICATED LOGIN VIEW (Username & Password Portal) ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 font-sans flex flex-col justify-between text-slate-100 select-none relative overflow-hidden">
        <style>{`
          @keyframes floatBlob1 {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(40px, -60px) scale(1.15); }
            66% { transform: translate(-30px, 30px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          @keyframes floatBlob2 {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(-50px, 40px) scale(0.85); }
            66% { transform: translate(40px, -30px) scale(1.1); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          @keyframes floatBlob3 {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(35px, 35px) scale(1.1); }
            66% { transform: translate(-40px, -40px) scale(0.85); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob1 {
            animation: floatBlob1 20s infinite alternate ease-in-out;
          }
          .animate-blob2 {
            animation: floatBlob2 25s infinite alternate ease-in-out;
          }
          .animate-blob3 {
            animation: floatBlob3 18s infinite alternate ease-in-out;
          }
        `}</style>

        {/* Ambient Animated Abstract Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-blob1"></div>
          <div className="absolute top-1/2 left-1/4 w-[450px] h-[450px] bg-teal-500/10 rounded-full blur-[120px] animate-blob2"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[110px] animate-blob3"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-amber-500/5 rounded-full blur-[90px] animate-blob1"></div>
        </div>

        {/* Decorative Top header */}
        <div className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800/40 py-3 text-center text-[10px] tracking-widest font-mono text-teal-400 z-10 relative">
          SISTEM KEAMANAN TERINTEGRASI • CABANG DINAS PENDIDIKAN WILAYAH XIII
        </div>
 
        {/* Login main frame */}
        <div className="max-w-md w-full mx-auto px-4 py-12 flex-1 flex flex-col justify-center z-10 relative">
          <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl relative overflow-hidden space-y-6">
            
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500"></div>
 
            {/* Shield & Crest Header */}
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-20 flex items-center justify-center filter drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/9/99/Coat_of_arms_of_West_Java.svg" 
                  alt="Logo Provinsi Jawa Barat" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
 
              <div className="text-center">
                <span className="block text-[9px] font-black tracking-widest text-emerald-400 uppercase">PORTAL ADMINISTRASI KANTOR</span>
                <h1 className="text-xl font-extrabold text-slate-100 uppercase tracking-tight">SIPAK-GURU PNS</h1>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                  Sistem Informasi Perhitungan Angka Kredit Integrasi Guru Cabang Dinas Pendidikan Wilayah XIII Dinas Pendidikan Provinsi Jawa Barat
                </p>
              </div>
            </div>
 
            <div className="border-t border-slate-800/50 my-1"></div>
 
            {/* Login control form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="bg-rose-950/30 backdrop-blur-md border border-rose-800/50 text-rose-200 text-xs p-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Akun (Username)</label>
                <input
                  type="text"
                  placeholder="Contoh: admin atau sman2ciamis"
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl p-3 text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kata Sandi (Password)</label>
                <input
                  type="password"
                  placeholder="Masukkan password akun Anda"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl p-3 text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLogining}
                className={`w-full py-3 px-4 bg-teal-600 hover:bg-teal-505 active:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-teal-900/20 cursor-pointer transition-all border border-teal-500 select-none ${isLogining ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLogining ? "MEMVERIFIKASI AUTENTIKASI..." : "MASUK KE PORTAL SIPAK"}
              </button>
            </form>
 
            {/* Security disclaimer */}
            <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/60 text-[10px] text-slate-400 leading-relaxed font-sans space-y-1">
              <span className="font-bold text-emerald-400 block uppercase">Catatan Verifikasi Otoritas:</span>
              <p>Masing-masing pendaftaran sekolah diatur tersendiri untuk mengelola guru instansinya. Super Admin KCD XIII memegang kendali rekapitulasi data global.</p>
              <div className="pt-1.5 text-slate-500 font-mono text-[9px]">
                <p>Default Demo Sekolah: sman2ciamis / sman2ciamis123</p>
              </div>
            </div>
 
          </div>
        </div>
 
        {/* Clean footer */}
        <div className="bg-slate-900/30 border-t border-slate-900/40 py-4 text-center text-[10px] text-slate-500 font-mono z-10 relative">
          © 2026 CABANG DINAS PENDIDIKAN WILAYAH XIII PROVINSI JAWA BARAT • PERMENPAN RB NO. 1/2023
        </div>
 
      </div>
    );
  }
 
  // --- AUTHENTICATED: GURU PNS REGISTRY / LISTING VIEW ---
  if (selectedTeacherId === null || profile === null) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col md:flex-row relative">
        
        {/* Mobile Header Bar (Only visible on mobile) */}
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center text-white z-20 print:hidden select-none w-full">
          <div className="flex items-center gap-2">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/9/99/Coat_of_arms_of_West_Java.svg" 
              alt="Logo Jabar" 
              className="w-7 h-9 object-contain"
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="block text-[8px] font-black text-emerald-400 tracking-wider">SIPAK-GURU PNS</span>
              <span className="block text-[10px] font-bold text-slate-300">CABIN DISDIK JABAR XIII</span>
            </div>
          </div>
          <button 
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg focus:outline-none"
            title="Buka Menu"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Sidebar Overlay/Drawer */}
        {mobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden transition-all duration-300 print:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar Component (Persistent on Desktop, Drawer on Mobile) */}
        <aside className={`
          fixed md:sticky top-0 left-0 bottom-0 z-50 md:z-10
          w-72 bg-slate-900 border-r border-slate-850 text-slate-200 
          flex flex-col shrink-0 h-screen transition-transform duration-300 ease-in-out print:hidden
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}>
          {/* Sidebar Top Brand Header */}
          <div className="p-6 border-b border-slate-850 flex items-center gap-3 bg-slate-950/30">
            <div className="w-10 h-12 flex items-center justify-center shrink-0">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/9/99/Coat_of_arms_of_West_Java.svg" 
                alt="Logo Provinsi Jawa Barat" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="block text-[8px] font-black tracking-widest text-emerald-400 uppercase">PORTAL ADMINISTRASI</span>
              <h2 className="text-sm font-extrabold text-white tracking-tight uppercase">SIPAK-GURU PNS</h2>
              <span className="block text-[9px] text-slate-400 font-medium leading-tight">CDP WILAYAH XIII JABAR</span>
            </div>
          </div>

          {/* User Profile Info section in Sidebar */}
          <div className="p-4 mx-4 my-4 bg-slate-950/45 rounded-xl border border-slate-850/80 space-y-2 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/35 flex items-center justify-center">
                <User className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="truncate min-w-0">
                <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">AKTIF PETUGAS</span>
                <p className="text-xs font-bold text-slate-200 truncate leading-tight">{user.displayName || user.username}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-850/40">
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-900 px-2 py-0.5 rounded-md uppercase">
                {user.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN SEKOLAH'}
              </span>
              <div className="flex items-center gap-1 font-mono text-[9px] text-slate-500">
                <Clock className="w-3 h-3 text-slate-500 animate-pulse" />
                <span>ONLINE</span>
              </div>
            </div>
          </div>

          {/* Sidebar Navigation Items */}
          <nav className="flex-1 px-4 space-y-1.5 py-2 overflow-y-auto">
            <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 mb-2.5">WORKSPACE MENU</span>
            
            {/* 1. Pangkalan Guru PNS */}
            <button
              onClick={() => {
                setAdminView("teachers");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                adminView === "teachers"
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-950/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className={`w-4 h-4 ${adminView === "teachers" ? "text-white" : "text-emerald-500"}`} />
                <span>PANGKALAN GURU PNS</span>
              </div>
            </button>

            {/* 2. Manajemen Akun Sekolah (Super Admin only) */}
            {user.role === "super_admin" && (
              <button
                onClick={() => {
                  setAdminView("users");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                  adminView === "users"
                    ? "bg-teal-600 text-white shadow-lg shadow-teal-950/20"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className={`w-4 h-4 ${adminView === "users" ? "text-white" : "text-teal-400"}`} />
                  <span>MANAJEMEN AKUN</span>
                </div>
                <span className="bg-teal-950 text-teal-300 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-teal-850 uppercase">
                  SUPER
                </span>
              </button>
            )}

            {/* 3. Informasi / Master Data Sekolah */}
            <button
              onClick={() => {
                setAdminView("schools");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                adminView === "schools"
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-950/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <School className={`w-4 h-4 ${adminView === "schools" ? "text-white" : "text-emerald-500"}`} />
                <span>{user.role === 'school_admin' ? "INFORMASI SEKOLAH" : "MASTER DATA SEKOLAH"}</span>
              </div>
            </button>

            {/* 4. Atur Kop & Logo Surat */}
            <button
              onClick={() => {
                setAdminView("kop");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                adminView === "kop"
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-950/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className={`w-4 h-4 ${adminView === "kop" ? "text-white" : "text-blue-500"}`} />
                <span>KOP & LOGO SURAT</span>
              </div>
              <span className="bg-amber-950 text-amber-405 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-amber-900 uppercase">
                ADMIN
              </span>
            </button>

            {/* 5. Simulasi Kalkulator */}
            <button
              onClick={() => {
                setAdminView("calculator");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                adminView === "calculator"
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-950/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Calculator className={`w-4 h-4 ${adminView === "calculator" ? "text-white" : "text-pink-500"}`} />
                <span>SIMULASI KALKULATOR</span>
              </div>
            </button>

            {/* 6. Panduan & Regulasi */}
            <button
              onClick={() => {
                setAdminView("regulations");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                adminView === "regulations"
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-950/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className={`w-4 h-4 ${adminView === "regulations" ? "text-white" : "text-violet-500"}`} />
                <span>PANDUAN & REGULASI BKN</span>
              </div>
            </button>

            {/* 7. Logging & Error Management */}
            <button
              onClick={() => {
                setAdminView("logs");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                adminView === "logs"
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-950/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Terminal className={`w-4 h-4 ${adminView === "logs" ? "text-white" : "text-amber-500"}`} />
                <span>LOGGING MANAGEMENT</span>
              </div>
              <span className="bg-slate-900 text-amber-400 text-[8px] font-mono px-1.5 py-0.5 rounded border border-slate-750 uppercase">
                SYSTEM
              </span>
            </button>
          </nav>

          {/* Sidebar Bottom Session Controls & Exit */}
          <div className="p-4 border-t border-slate-850 space-y-3 bg-slate-950/20 select-none shrink-0">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white rounded-xl border border-slate-750 hover:border-rose-850 font-bold text-xs transition-all cursor-pointer shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" /> KELUAR PORTAL
            </button>
            <div className="text-center text-[9px] text-slate-500 font-mono tracking-tight leading-tight">
              SIPAK-GURU Hub v1.5 • 2026<br />Dinas Pendidikan Jabar
            </div>
          </div>
        </aside>

        {/* Content Container (takes up flex-1 on right) */}
        <main className="flex-1 flex flex-col justify-between min-h-0 bg-slate-50/70 overflow-x-hidden">
          
          {/* Top subtle workspace alert bar on desktop */}
          <div id="top-admin-banner" className="hidden md:flex bg-slate-900 text-slate-400 text-[10px] py-2 px-8 justify-between items-center border-b border-slate-950 select-none print:hidden shrink-0">
            <div className="flex items-center gap-1.5 font-mono">
              <Clock className="w-3 h-3 text-teal-400 animate-pulse" />
              <span className="uppercase text-slate-500">SISTEM INTEGRASI ANGKA KREDIT GURU PNS</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[9px]">
              <span>KCD Wil. XIII Ciamis Pangandaran Banjar</span>
            </div>
          </div>

          {/* Main workspace frame containing dynamic views */}
          <div className="p-4 sm:p-6 lg:p-8 flex-1 w-full max-w-7xl mx-auto space-y-6">

          {adminView === "teachers" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-teal-655 text-teal-600 tracking-wider">SIPAK-GURU Hub</span>
                  <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Pangkalan Data PAK Guru PNS</h1>
                  <p className="text-xs text-slate-500">Kelola perhitungan angka kredit mutasi promosi pangkat ratusan guru ASN dengan instan dan aman.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      setIsAddingTeacher(!isAddingTeacher);
                      setIsImporting(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> DAFTARKAN GURU BARU
                  </button>

                  <button
                    onClick={() => {
                      setIsImporting(!isImporting);
                      setIsAddingTeacher(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" /> IMPORT GURU (CSV)
                  </button>

                  <button
                    onClick={handleExportTeachersToCSV}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> EKSPORT SEMUA (.CSV)
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

              {/* Import CSV Section */}
              {isImporting && (
                <div className="bg-white border-2 border-emerald-500 p-6 rounded-2xl shadow-md space-y-4 animate-slideDown">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Upload className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-sm font-black text-slate-900 uppercase">Impor Data Guru via CSV</h3>
                    </div>
                    <button 
                      onClick={() => setIsImporting(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Batal
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-2">
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        Anda dapat mengimpor data guru secara massal menggunakan file Excel/CSV. 
                        Pastikan kolom di file Anda sesuai dengan format template kami agar proses pemetaan data berjalan sempurna.
                        Pemberitahuan: jika Anda masuk sebagai Administrator Sekolah, nama sekolah pada file impor akan otomatis disesuaikan secara aman dengan sekolah Anda.
                      </p>
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleDownloadTemplateCSV}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-705 text-slate-750 font-bold text-[11px] rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-teal-650 text-teal-600" /> Download Template CSV
                        </button>
                      </div>
                    </div>

                    <div className="border border-dashed border-emerald-300 bg-emerald-55 bg-emerald-50/20 p-6 rounded-xl text-center space-y-3 relative hover:bg-emerald-50/50 transition-colors">
                      <Upload className="w-8 h-8 text-emerald-500 mx-auto animate-bounce" />
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">Pilih file CSV Guru Anda</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Maksimal ukuran 5MB (.csv)</span>
                      </div>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportCSV}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                      {user.role === 'school_admin' ? (
                        <input
                          type="text"
                          value={user.school}
                          disabled
                          className="w-full text-xs border border-slate-300 bg-slate-100 rounded-lg p-2.5 text-slate-500 font-bold uppercase"
                        />
                      ) : (
                        <select
                          value={newTeacherForm.school}
                          onChange={e => setNewTeacherForm({ ...newTeacherForm, school: e.target.value })}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500 text-slate-800"
                          required
                        >
                          <option value="">-- PILIH UNIT KERJA SEKOLAH --</option>
                          {schoolsList.map(s => (
                            <option key={s.id} value={s.name}>{s.name} (NPSN: {s.id})</option>
                          ))}
                        </select>
                      )}
                      {user.role === 'super_admin' && schoolsList.length === 0 && (
                        <p className="text-[10px] text-rose-600 mt-1">
                          ⚠️ Belum ada sekolah terdaftar di database. Silakan daftarkan di menu Master Data Sekolah terlebih dahulu.
                        </p>
                      )}
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

              {/* Dynamic Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
                {/* Total Teachers */}
                <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 p-5 rounded-2xl border border-teal-100/70 shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-teal-600 rounded-xl text-white">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-teal-700 uppercase tracking-wider font-mono">Total PNS</span>
                    <h3 className="text-xl font-black text-slate-950 mt-0.5">{stats.total} <span className="text-[11px] text-teal-600 font-bold">Guru</span></h3>
                  </div>
                </div>

                {/* Eligible */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 rounded-2xl border border-emerald-100/70 shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-emerald-600 rounded-xl text-white">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider font-mono">Layak Naik Pangkat</span>
                    <h3 className="text-xl font-black text-slate-950 mt-0.5">{stats.eligible} <span className="text-[11px] text-emerald-600 font-bold">Guru</span></h3>
                  </div>
                </div>

                {/* Ineligible */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-5 rounded-2xl border border-amber-100/70 shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-amber-500 rounded-xl text-white">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider font-mono">Belum Layak</span>
                    <h3 className="text-xl font-black text-slate-950 mt-0.5">{stats.notEligible} <span className="text-[11px] text-amber-600 font-bold">Guru</span></h3>
                  </div>
                </div>

                {/* Avg AK */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-5 rounded-2xl border border-indigo-100/70 shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 rounded-xl text-white">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider font-mono">Rata-Rata AK</span>
                    <h3 className="text-xl font-black text-slate-950 mt-0.5">{stats.avgAK.toFixed(2)} <span className="text-[11px] text-indigo-600 font-bold">AK</span></h3>
                  </div>
                </div>
              </div>

              {/* Filters & Search Control Panel */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight">Penyaringan & Sortir Pangkalan Data</span>
                  </div>
                  {(searchQuery || filterSchool || filterGolongan || filterEligibility || sortBy !== "name_asc") && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setFilterSchool("");
                        setFilterGolongan("");
                        setFilterEligibility("");
                        setSortBy("name_asc");
                      }}
                      className="text-[10px] text-rose-600 hover:text-rose-700 font-black flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 cursor-pointer transition-colors"
                    >
                      RESET SEMUA FILTER
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Search Query */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono">Pencarian Kata Kunci</label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Cari guru berdasarkan Nama, NIP, atau Sekolah..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-teal-500 focus:bg-white text-slate-800 font-bold"
                      />
                    </div>
                  </div>

                  {/* Filter Sekolah / Unit Kerja */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono">Unit Kerja Sekolah</label>
                    {user?.role === 'school_admin' ? (
                      <input
                        type="text"
                        value={user.school || "Sekolah Anda"}
                        disabled
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-500 font-bold"
                      />
                    ) : (
                      <select
                        value={filterSchool}
                        onChange={e => setFilterSchool(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs focus:outline-teal-500 focus:bg-white text-slate-700 font-bold"
                      >
                        <option value="">Semua Sekolah</option>
                        {schoolsList.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Filter Golongan */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono">Golongan Aktif</label>
                    <select
                      value={filterGolongan}
                      onChange={e => setFilterGolongan(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs focus:outline-teal-500 focus:bg-white text-slate-700 font-bold"
                    >
                      <option value="">Semua Golongan</option>
                      {GOLONGAN_LIST.map(g => (
                        <option key={g.id} value={g.id}>{g.id} - Himpunan {g.pangkatTarget}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter Status Kelayakan */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono">Status Kelayakan Kenaikan</label>
                    <select
                      value={filterEligibility}
                      onChange={e => setFilterEligibility(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs focus:outline-teal-500 focus:bg-white text-slate-700 font-bold"
                    >
                      <option value="">Semua Kelayakan</option>
                      <option value="eligible">Layak Naik Pangkat / Jenjang</option>
                      <option value="not_eligible">Belum Layak (Kurang AK)</option>
                    </select>
                  </div>

                  {/* Sort By Choice */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono">Urutkan Berdasarkan</label>
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs focus:outline-teal-500 focus:bg-white text-slate-700 font-bold"
                    >
                      <option value="name_asc">Nama (A-Z)</option>
                      <option value="name_desc">Nama (Z-A)</option>
                      <option value="nip">NIP Pegawai</option>
                      <option value="ak_desc">Angka Kredit Terbanyak</option>
                      <option value="ak_asc">Angka Kredit Tersedikit</option>
                    </select>
                  </div>

                  {/* Export Filtered Buttons */}
                  <div className="md:col-span-2 flex items-end">
                    {(filterSchool || filterGolongan || filterEligibility || searchQuery) ? (
                      <button
                        onClick={handleExportTeachersToCSV}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-800 font-bold text-xs rounded-xl transition-all cursor-pointer border border-teal-150 border-teal-200 shadow-xs"
                      >
                        <Download className="w-4 h-4 text-teal-600" />
                        <span>EKSPORT HASIL FILTER ({filteredTeachers.length} GURU)</span>
                      </button>
                    ) : (
                      <div className="text-[11px] text-slate-400 font-medium pb-2">
                        💡 Gunakan penyaringan di atas untuk mengisolasi data guru tertentu.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Control Bar for Admin / School Admin */}
              {user && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">TAMPILAN:</span>
                    <div className="inline-flex bg-slate-200/60 p-1 rounded-lg border border-slate-300/40">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                          viewMode === "grid"
                            ? "bg-white text-teal-700 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Grid / Kartu</span>
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                          viewMode === "list"
                            ? "bg-white text-teal-700 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>Tabel / List</span>
                      </button>
                    </div>
                  </div>

                  {/* Items per Page Selector & Stats */}
                  <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                    <div className="text-[11px] text-slate-500 font-medium">
                      Total: <span className="font-bold text-slate-800">{filteredTeachers.length}</span> Guru
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">BARIS PER HALAMAN:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="text-xs bg-white border border-slate-300 rounded-lg py-1 px-2.5 focus:outline-teal-500 font-bold text-slate-700"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

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
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-450 text-slate-955 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer border border-amber-400"
                        >
                          <Sparkles className="w-4 h-4" /> Instansiasi Otomatis Guru Antan Kustiawan
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {activeViewMode === 'list' ? (
                    /* Beautiful Table View */
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                              <th className="py-3 px-4">Nama Lengkap & NIP</th>
                              <th className="py-3 px-4">Sekolah Unit Kerja</th>
                              <th className="py-3 px-4">Golongan</th>
                              <th className="py-3 px-4">AK Kumulatif</th>
                              <th className="py-3 px-4">Status Kelayakan</th>
                              <th className="py-3 px-4 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {currentTeachers.map((teacher) => {
                              const sumAK = teacherEvalsCache[teacher.id] || 0;
                              const sumPend = teacherPendCache[teacher.id] || 0;
                              const totalPendidikanAK = (teacher.akPendidikan || 0) + sumPend;
                              const currentTotalAK = (teacher.akIntegrasi2022 || 0) + sumAK + totalPendidikanAK;

                              const minimalPangkat = getMinimalPangkat(teacher.currentGolongan);
                              const minimalJenjang = getMinimalJenjang(teacher.currentGolongan);

                              const isCrossingJenjang = getTeacherLevel(teacher.currentGolongan) !== getTeacherLevel(teacher.targetGolongan);
                              const targetAK = isCrossingJenjang ? minimalJenjang : minimalPangkat;
                              
                              const shortfall = targetAK - currentTotalAK;
                              const isEligible = isCrossingJenjang 
                                ? (currentTotalAK >= minimalPangkat && currentTotalAK >= minimalJenjang)
                                : (currentTotalAK >= minimalPangkat);

                              return (
                                <tr key={teacher.id} className="hover:bg-slate-50/70 transition-colors text-xs">
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-slate-900 leading-tight">{teacher.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">NIP: {teacher.nip}</div>
                                  </td>
                                  <td className="py-3 px-4 text-slate-600 font-medium max-w-xs truncate">
                                    {teacher.school || "-"}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="inline-block bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 font-mono">
                                      {teacher.currentGolongan} ➔ {teacher.targetGolongan}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                                    {currentTotalAK.toFixed(3)} <span className="text-[10px] text-slate-400 font-normal">/ {targetAK.toFixed(3)}</span>
                                  </td>
                                  <td className="py-3 px-4">
                                    {isEligible ? (
                                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-2 py-1 rounded-md border border-emerald-200 uppercase tracking-tight">
                                        <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        <span>LAYAK {isCrossingJenjang ? "JENJANG" : "PANGKAT"}</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-extrabold px-2 py-1 rounded-md border border-amber-200 uppercase tracking-tight" title={`Kurang ${shortfall.toFixed(3)} AK`}>
                                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span>Kurang {shortfall.toFixed(1)} AK</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => handleSelectTeacher(teacher)}
                                        className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-800 font-bold text-[10px] rounded-lg transition-colors cursor-pointer border border-teal-100"
                                      >
                                        Kelola ➔
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
                                        title="Hapus Guru"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* Original Card Grid View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentTeachers.map(teacher => (
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

                            {/* Monitoring Kelayakan Naik Pangkat / Naik Jenjang */}
                            {(() => {
                              const sumAK = teacherEvalsCache[teacher.id] || 0;
                              const sumPend = teacherPendCache[teacher.id] || 0;
                              const totalPendidikanAK = (teacher.akPendidikan || 0) + sumPend;
                              const currentTotalAK = (teacher.akIntegrasi2022 || 0) + sumAK + totalPendidikanAK;

                              const minimalPangkat = getMinimalPangkat(teacher.currentGolongan);
                              const minimalJenjang = getMinimalJenjang(teacher.currentGolongan);

                              const isCrossingJenjang = getTeacherLevel(teacher.currentGolongan) !== getTeacherLevel(teacher.targetGolongan);
                              const targetAK = isCrossingJenjang ? minimalJenjang : minimalPangkat;
                              
                              const shortfall = targetAK - currentTotalAK;
                              const isEligible = isCrossingJenjang 
                                ? (currentTotalAK >= minimalPangkat && currentTotalAK >= minimalJenjang)
                                : (currentTotalAK >= minimalPangkat);

                              return (
                                <div className="pt-2.5 border-t border-slate-100 space-y-2">
                                  <div className="flex justify-between items-center text-[10px] font-bold">
                                    <span className="text-slate-450 text-slate-500 uppercase tracking-wider font-mono">STATUS KELAYAKAN</span>
                                    <span className="bg-slate-100 text-slate-800 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200">
                                      {currentTotalAK.toFixed(3)} / {targetAK.toFixed(3)} AK
                                    </span>
                                  </div>

                                  {isEligible ? (
                                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-emerald-250 border-emerald-200 uppercase tracking-tight">
                                      <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0 animate-pulse" />
                                      <span>
                                        {isCrossingJenjang 
                                          ? "LAYAK NAIK JENJANG & PANGKAT" 
                                          : "LAYAK NAIK PANGKAT"}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5">
                                      <div className="flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg border border-amber-200 uppercase tracking-tight">
                                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span className="truncate">
                                          Belum Layak (Kurang {shortfall.toFixed(3)} AK)
                                        </span>
                                      </div>
                                      {/* Small dynamic progress bar */}
                                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                                        <div 
                                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                          style={{ width: `${Math.min(100, Math.max(0, (currentTotalAK / targetAK) * 100))}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
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

                  {/* Pagination Controls */}
                  {hasPagination && totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-xs mt-6">
                      <div className="text-xs text-slate-500 font-medium">
                        Menampilkan <span className="font-bold text-slate-800">{indexOfFirstItem + 1}</span> sampai{" "}
                        <span className="font-bold text-slate-800">
                          {Math.min(indexOfLastItem, filteredTeachers.length)}
                        </span>{" "}
                        dari <span className="font-bold text-slate-800">{filteredTeachers.length}</span> guru PNS
                      </div>

                      <div className="flex items-center gap-1.5 self-center sm:self-auto">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={safeCurrentPage === 1}
                          className={`p-1.5 rounded-lg border text-slate-600 transition-colors cursor-pointer ${
                            safeCurrentPage === 1
                              ? "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                              : "bg-white border-slate-300 hover:bg-slate-50"
                          }`}
                          title="Halaman Sebelumnya"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {getPageNumbers().map(pageNum => (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg transition-all cursor-pointer border ${
                              safeCurrentPage === pageNum
                                ? "bg-teal-600 border-teal-600 text-white shadow-xs"
                                : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                          }`}
                          >
                            {pageNum}
                          </button>
                        ))}

                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={safeCurrentPage === totalPages}
                          className={`p-1.5 rounded-lg border text-slate-600 transition-colors cursor-pointer ${
                            safeCurrentPage === totalPages
                              ? "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                              : "bg-white border-slate-300 hover:bg-slate-50"
                          }`}
                          title="Halaman Berikutnya"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {adminView === "users" && user.role === "super_admin" && (
            <UserManagementTab />
          )}

          {adminView === "schools" && (
            <SchoolManagementTab userRole={user.role} userSchool={user.school} />
          )}

          {adminView === "kop" && (
            <KopAdminTab
              kopSettings={kopSettings}
              setKopSettings={setKopSettings}
            />
          )}

          {adminView === "calculator" && (
            <CalculatorTab />
          )}

          {adminView === "regulations" && (
            <RegulationsTab />
          )}

          {adminView === "logs" && (
            <LoggingManagementTab />
          )}

        </div>

        {/* Footer */}
        <footer className="bg-slate-900 border-t border-slate-950 py-6 px-6 text-center text-xs text-slate-400 select-none shrink-0">
          <p className="font-bold text-slate-300">SIPAK-GURU Hub © 2026</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Cabang Dinas Pendidikan Wilayah XIII Provinsi Jawa Barat</p>
        </footer>

        {renderConfirmModals()}
        </main>
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
          <span>Petugas: <strong>{user.displayName || user.username}</strong></span>
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

              {user.role === "super_admin" && (
                <button
                  onClick={() => setActiveTab("user_management")}
                  id="sidebar-nav-user-management"
                  className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "user_management"
                      ? "bg-teal-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-teal-600" />
                    MANAJEMEN PENGGUNA
                  </span>
                  <span className="bg-teal-100 text-teal-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase select-none">
                    SUPER
                  </span>
                </button>
              )}
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

              {activeTab === "user_management" && user.role === "super_admin" && (
                <UserManagementTab />
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

      {renderConfirmModals()}

      {/* Beautiful Toast Notifications Container */}
      <div className="fixed bottom-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          let icon = <AlertCircle className="w-4 h-4 text-teal-600 font-bold shrink-0" />;
          let bgColor = "bg-white text-slate-850 border-slate-200";
          let accentColor = "bg-teal-600";
          if (t.type === 'success') {
            icon = <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />;
            bgColor = "bg-emerald-50 text-emerald-950 border-emerald-200";
            accentColor = "bg-emerald-600";
          } else if (t.type === 'error') {
            icon = <AlertCircle className="w-4 h-4 text-rose-650 shrink-0 font-extrabold" />;
            bgColor = "bg-rose-50 text-rose-950 border-rose-200";
            accentColor = "bg-rose-650";
          } else if (t.type === 'warning') {
            icon = <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />;
            bgColor = "bg-amber-50 text-amber-950 border-amber-200";
            accentColor = "bg-amber-650";
          } else if (t.type === 'info') {
            icon = <Award className="w-4 h-4 text-teal-650 shrink-0" />;
            bgColor = "bg-teal-50 text-teal-950 border-teal-200";
            accentColor = "bg-teal-650";
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${bgColor} animate-slideIn transition-all duration-300 relative overflow-hidden`}
              style={{
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              }}
            >
              {/* Visual indicators */}
              <div className="pt-0.5">
                {icon}
              </div>
              
              <div className="flex-1 text-[11px] font-black leading-snug">
                {t.message}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
                className="text-slate-450 hover:text-slate-650 cursor-pointer shrink-0 text-[10px] font-bold"
              >
                ✕
              </button>

              {/* Dynamic bottom progress bar */}
              <div 
                className={`absolute bottom-0 left-0 h-0.5 ${accentColor} animate-toastProgress`} 
              />
            </div>
          );
        })}
      </div>

      {/* Stunning SweetAlert Immersive Modal Center Popup */}
      {activeSwal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-all duration-300">
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 text-center border border-slate-100 animate-swalBounce overflow-hidden relative"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Top illustrative gradient border accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500" />
            
            <div className="mt-4 flex justify-center">
              {activeSwal.icon === 'success' && (
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 animate-swalPulse">
                  <Sparkles className="w-8 h-8 text-emerald-600 animate-pulse" />
                </div>
              )}
              {activeSwal.icon === 'info' && (
                <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center border border-teal-100 animate-swalPulse">
                  <Award className="w-8 h-8 text-teal-650 animate-bounce" />
                </div>
              )}
              {activeSwal.icon === 'warning' && (
                <div className="w-16 h-16 rounded-full bg-amber-55/10 flex items-center justify-center border border-amber-200">
                  <AlertCircle className="w-8 h-8 text-amber-600 animate-bounce" />
                </div>
              )}
              {activeSwal.icon === 'error' && (
                <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100">
                  <AlertCircle className="w-8 h-8 text-rose-650 animate-pulse" />
                </div>
              )}
            </div>

            <h3 className="mt-5 text-[14px] font-black text-slate-900 uppercase tracking-tight">
              {activeSwal.title}
            </h3>
            
            <p className="mt-3 text-[11px] text-slate-500 font-bold leading-relaxed px-2">
              {activeSwal.text}
            </p>

            <div className="mt-6">
              <button
                onClick={() => setActiveSwal(null)}
                className="w-full py-3 px-5 bg-teal-600 hover:bg-teal-555 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                {activeSwal.confirmButtonText || "OK, SELESAI ➔"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
