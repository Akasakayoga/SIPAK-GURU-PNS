import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit, Building, MapPin, Search, LayoutGrid, List, Filter } from "lucide-react";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { toast, swal } from "../lib/toast";

export interface School {
  id: string; // NPSN is used as ID
  npsn: string;
  name: string;
  address?: string;
  city?: string;
  principalName?: string;
  principalNip?: string;
  principalStatus?: "definitif" | "plt" | "plh";
}

interface SchoolManagementTabProps {
  userRole?: string;
  userSchool?: string;
}

export default function SchoolManagementTab({ userRole, userSchool }: SchoolManagementTabProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingSchool, setIsAddingSchool] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterCity, setFilterCity] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState("");

  const uniqueCities = React.useMemo(() => {
    const citiesSet = new Set<string>();
    schools.forEach(s => {
      if (s.city && s.city.trim()) {
        citiesSet.add(s.city.toUpperCase().trim());
      }
    });
    return Array.from(citiesSet).sort();
  }, [schools]);

  const [form, setForm] = useState({
    npsn: "",
    name: "",
    address: "",
    city: "",
    principalName: "",
    principalNip: "",
    principalStatus: "definitif" as "definitif" | "plt" | "plh"
  });

  // Listen to schools collection
  useEffect(() => {
    const path = "schools";
    const unsubscribe = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const list: School[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            npsn: data.npsn || docSnap.id,
            name: data.name || "",
            address: data.address || "",
            city: data.city || "",
            principalName: data.principalName || "",
            principalNip: data.principalNip || "",
            principalStatus: data.principalStatus || "definitif"
          });
        });
        // Sort alphabetically by school name
        list.sort((a, b) => a.name.localeCompare(b.name));
        setSchools(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleCreateOrUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const npsnTrimmed = form.npsn.trim();
    const nameTrimmed = form.name.toUpperCase().trim();

    if (!npsnTrimmed || !nameTrimmed) {
      setErrorMsg("NPSN dan Nama Sekolah wajib diisi!");
      return;
    }

    if (!/^\d+$/.test(npsnTrimmed) || npsnTrimmed.length < 4 || npsnTrimmed.length > 12) {
      setErrorMsg("NPSN harus berupa angka (4 hingga 12 digit)!");
      return;
    }

    try {
      const payload = {
        npsn: npsnTrimmed,
        name: nameTrimmed,
        address: form.address.trim(),
        city: form.city.trim(),
        principalName: form.principalName.trim(),
        principalNip: form.principalNip.trim(),
        principalStatus: form.principalStatus
      };

      if (editingSchool) {
        // Edit mode
        try {
          await setDoc(doc(db, "schools", editingSchool.id), payload);
          swal.fire({
            title: "Data Unit Kerja Disinkronkan!",
            text: `Data instansi "${nameTrimmed}" beserta kop surat, detail kepala sekolah, dan NIP penilai berhasil diselaraskan di cloud database!`,
            icon: "success",
            confirmButtonText: "Selesai"
          });
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.WRITE, `schools/${editingSchool.id}`);
          toast.error(`Gagal memperbarui data sekolah: ${nameTrimmed}`);
        }
      } else {
        // Add mode
        // Check duplicate NPSN
        if (schools.some((s) => s.npsn === npsnTrimmed)) {
          setErrorMsg("NPSN sudah terdaftar di database!");
          swal.fire({
            title: "Duplikasi NPSN!",
            text: `Nomor NPSN "${npsnTrimmed}" tersebut sudah terdaftar di database cloud Anda!`,
            icon: "warning"
          });
          return;
        }
        try {
          await setDoc(doc(db, "schools", npsnTrimmed), payload);
          swal.fire({
            title: "Sekolah Baru Terdaftar!",
            text: `Instansi "${nameTrimmed}" (NPSN: ${npsnTrimmed}) telah sukses didaftarkan dan siap dihubungkan dengan berkas Guru PNS.`,
            icon: "success",
            confirmButtonText: "Selesai"
          });
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.WRITE, `schools/${npsnTrimmed}`);
          toast.error(`Gagal mendaftarkan data sekolah baru: ${nameTrimmed}`);
        }
      }

      setIsAddingSchool(false);
      setEditingSchool(null);
      setForm({
        npsn: "",
        name: "",
        address: "",
        city: "",
        principalName: "",
        principalNip: "",
        principalStatus: "definitif"
      });
    } catch (err: any) {
      setErrorMsg("Gagal menyimpan data sekolah: " + (err.message || String(err)));
    }
  };

  const startEdit = (school: School) => {
    setEditingSchool(school);
    setForm({
      npsn: school.npsn,
      name: school.name,
      address: school.address || "",
      city: school.city || "",
      principalName: school.principalName || "",
      principalNip: school.principalNip || "",
      principalStatus: school.principalStatus || "definitif"
    });
    setIsAddingSchool(true);
    setErrorMsg("");
  };

  const [pendingDelete, setPendingDelete] = useState<School | null>(null);

  const handleDeleteSchool = (school: School) => {
    setPendingDelete(school);
  };

  const executeDeleteSchool = async () => {
    if (!pendingDelete) return;
    try {
      try {
        await deleteDoc(doc(db, "schools", pendingDelete.id));
        swal.fire({
          title: "Instansi Dihapus!",
          text: `Sekolah "${pendingDelete.name}" beserta master data pendukungnya berhasil dihapus secara permanen.`,
          icon: "success",
          confirmButtonText: "Selesai"
        });
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.DELETE, `schools/${pendingDelete.id}`);
        toast.error(`Gagal menghapus data sekolah: ${pendingDelete.name}`);
      }
    } catch (err: any) {
      swal.fire({
        title: "Gagal Menghapus!",
        text: "Gagal menghapus data instansi: " + (err.message || String(err)),
        icon: "error"
      });
    } finally {
      setPendingDelete(null);
    }
  };

  const filteredSchools = schools.filter((s) => {
    if (userRole === "school_admin" && userSchool) {
      return s.name.toUpperCase().trim() === userSchool.toUpperCase().trim();
    }
    if (filterCity && s.city?.toUpperCase().trim() !== filterCity) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.npsn.includes(q) ||
      s.city?.toLowerCase().includes(q) ||
      s.address?.toLowerCase().includes(q)
    );
  });

  const isSchoolAdmin = userRole === "school_admin";

  return (
    <div id="school-management-tab" className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-teal-650 tracking-wider">SIPAK-GURU Hub</span>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            {isSchoolAdmin ? "Informasi & Data Sekolah Anda" : "Master Data Sekolah"}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {isSchoolAdmin 
              ? "Sesuaikan detail penandatangan, alamat, kota, dan status PLT/PLH kepala sekolah penilai kinerja untuk unit kerja Anda."
              : "Kelola pendaftaran sekolah, unit kerja, NPSN, dan nama kepala sekolah penilai kinerja untuk otomatisasi tanda tangan."
            }
          </p>
        </div>

        {!isSchoolAdmin && (userRole === "super_admin" || userRole === "admin") && (
          <button
            onClick={() => {
              setEditingSchool(null);
              setForm({
                npsn: "",
                name: "",
                address: "",
                city: "",
                principalName: "",
                principalNip: "",
                principalStatus: "definitif"
              });
              setIsAddingSchool(!isAddingSchool);
              setErrorMsg("");
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm select-none"
          >
            <Plus className="w-4 h-4" /> TAMBAH SEKOLAH MASTER
          </button>
        )}
      </div>

      {isAddingSchool && (
        <form onSubmit={handleCreateOrUpdateSchool} className="bg-white border-2 border-teal-500 p-6 rounded-2xl shadow-md space-y-4 animate-slideDown text-slate-800">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <Building className="w-4 h-4 text-teal-600" />
              {isSchoolAdmin 
                ? "Sesuaikan Detail Kepala Sekolah & Kop Unit Kerja" 
                : (editingSchool ? "Hubungkan Ulang / Edit Sekolah Master" : "Daftarkan Instansi Sekolah Baru")
              }
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsAddingSchool(false);
                setEditingSchool(null);
                setErrorMsg("");
              }}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              Batal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-550 mb-1">
                NOMOR NPSN SEKOLAH (8 DIGIT)* {isSchoolAdmin && <span className="text-rose-500">(Kunci Admin)</span>}
              </label>
              <input
                type="text"
                maxLength={12}
                placeholder="Contoh: 20219182"
                disabled={editingSchool !== null || isSchoolAdmin}
                value={form.npsn}
                onChange={(e) => setForm({ ...form, npsn: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500 disabled:bg-slate-100 disabled:text-slate-500 font-mono text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-550 mb-1">
                NAMA LENGKAP SEKOLAH* {isSchoolAdmin && <span className="text-rose-500">(Kunci Admin)</span>}
              </label>
              <input
                type="text"
                placeholder="Contoh: SMAN 1 BANDUNG"
                disabled={isSchoolAdmin}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500 uppercase text-slate-850 disabled:bg-slate-100 disabled:text-slate-500 font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-550 mb-1">NAMA KEPALA SEKOLAH PENILAI</label>
              <input
                type="text"
                placeholder="Contoh: Dr. H. Dadang, M.Pd."
                value={form.principalName}
                onChange={(e) => setForm({ ...form, principalName: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-550 mb-1">STATUS JABATAN KEPALA SEKOLAH</label>
              <select
                value={form.principalStatus || "definitif"}
                onChange={(e) => setForm({ ...form, principalStatus: e.target.value as "definitif" | "plt" | "plh" })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500 font-bold text-slate-700 bg-white"
              >
                <option value="definitif">DEFINITIF (Biasa)</option>
                <option value="plt">PLT (Pelaksana Tugas)</option>
                <option value="plh">PLH (Pelaksana Harian)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-550 mb-1">NIP KEPALA SEKOLAH</label>
              <input
                type="text"
                placeholder="Contoh: 197412121998011001"
                value={form.principalNip}
                onChange={(e) => setForm({ ...form, principalNip: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500 font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-550 mb-1">KOTA / KABUPATEN</label>
              <input
                type="text"
                placeholder="Contoh: KOTA BANDUNG"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500 uppercase text-slate-800"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-550 mb-1">ALAMAT LENGKAP SEKOLAH</label>
              <input
                type="text"
                placeholder="Contoh: Jl. Dr. Radjiman No. 6"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-teal-500 text-slate-800"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-150 text-rose-700 text-xs font-semibold rounded-lg">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAddingSchool(false);
                setEditingSchool(null);
                setErrorMsg("");
              }}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
            >
              BATAL
            </button>
            <button
              type="submit"
              className="py-2.5 px-5 bg-teal-600 hover:bg-teal-550 text-white font-bold text-xs rounded-lg cursor-pointer shadow-xs animate-pulse"
            >
              {editingSchool ? "SIMPAN PERUBAHAN DATA ➔" : "DAFTARKAN MASTER ➔"}
            </button>
          </div>
        </form>
      )}

      {/* Search & View Toggle Panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari nama sekolah, NPSN, atau alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-teal-500 focus:bg-white text-slate-800 font-bold"
            />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-teal-500 focus:bg-white text-slate-800 font-bold"
            >
              <option value="">Semua Kabupaten / Kota ({uniqueCities.length})</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end md:self-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white text-teal-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Tampilan Kartu (Grid)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kartu</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white text-teal-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Tampilan Daftar (Tabel)"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Daftar</span>
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase font-black text-[9px] border-b border-slate-100 select-none">
                  <th className="p-4">NPSN</th>
                  <th className="p-4">Nama Sekolah</th>
                  <th className="p-4">Alamat & Kota</th>
                  <th className="p-4">Kepala Sekolah Penilai</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Opsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredSchools.map((school) => {
                  const matchedSchoolName = userSchool ? userSchool.toUpperCase().trim() : "";
                  const isThisSchoolUser = isSchoolAdmin && school.name.toUpperCase().trim() === matchedSchoolName;
                  const canUserEdit = userRole === "super_admin" || userRole === "admin" || isThisSchoolUser;

                  return (
                    <tr key={school.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono font-bold text-teal-700">
                        {school.npsn}
                      </td>
                      <td className="p-4 font-bold text-slate-900 uppercase">
                        <div className="flex items-center gap-1.5">
                          <span>{school.name}</span>
                          {isThisSchoolUser && (
                            <span className="bg-teal-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase font-sans animate-pulse">
                              SAYA
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">
                        {school.address || "-"}
                        {school.city && <div className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">{school.city}</div>}
                      </td>
                      <td className="p-4 text-slate-700">
                        <div className="font-bold">
                          {school.principalName
                            ? `${
                                school.principalStatus === "plt"
                                  ? "Plt. "
                                  : school.principalStatus === "plh"
                                  ? "Plh. "
                                  : ""
                              }${school.principalName}`
                            : "-"}
                        </div>
                        {school.principalNip && <div className="text-[10px] text-slate-400 font-mono">NIP: {school.principalNip}</div>}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          school.principalStatus === "plt" || school.principalStatus === "plh"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-teal-50 text-teal-800 border border-teal-200"
                        }`}>
                          {school.principalStatus || "definitif"}
                        </span>
                      </td>
                      <td className="p-4 text-right select-none">
                        {canUserEdit && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(school)}
                              className="p-1.5 rounded transition-colors text-slate-500 hover:bg-teal-50 hover:text-teal-600 cursor-pointer"
                              title="Sesuaikan Data Sekolah"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {(userRole === "super_admin" || userRole === "admin") && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSchool(school)}
                                className="p-1.5 rounded transition-colors text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                title="Hapus Data Sekolah"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredSchools.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic font-medium">
                      Sekolah tidak ditemukan...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid of schools list */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSchools.map((school) => {
          const matchedSchoolName = userSchool ? userSchool.toUpperCase().trim() : "";
          const isThisSchoolUser = isSchoolAdmin && school.name.toUpperCase().trim() === matchedSchoolName;
          const canUserEdit = userRole === "super_admin" || userRole === "admin" || isThisSchoolUser;

          return (
            <div
              key={school.id}
              className={`bg-white rounded-xl border p-5 space-y-3 hover:shadow-xs transition-all relative flex flex-col justify-between ${
                isThisSchoolUser ? "border-teal-500 ring-2 ring-teal-50" : "border-slate-205 hover:border-teal-500"
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex justify-between items-start gap-1">
                  <span className="bg-teal-50 border border-teal-100 text-teal-800 text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono">
                    NPSN: {school.npsn}
                  </span>

                  {canUserEdit && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(school)}
                        className="text-slate-500 hover:text-teal-600 border border-slate-200 hover:border-teal-300 rounded px-2 py-1 text-[10px] font-bold flex items-center gap-1 transition-colors bg-white hover:bg-teal-50 cursor-pointer"
                        title="Sesuaikan Data Sekolah"
                      >
                        <Edit className="w-3 h-3 text-teal-650" />
                        {isThisSchoolUser ? "SESUAIKAN DATA" : "EDIT"}
                      </button>
                      {(userRole === "super_admin" || userRole === "admin") && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSchool(school)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                          title="Hapus Data Sekolah"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-slate-900 tracking-tight uppercase flex items-center gap-1.5 animate-fadeIn">
                    <span>{school.name}</span>
                    {isThisSchoolUser && (
                      <span className="bg-teal-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase font-sans animate-pulse">
                        SAYA
                      </span>
                    )}
                  </h4>
                  {school.address && (
                    <p className="text-[11px] text-slate-500 flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span>{school.address}{school.city ? `, ${school.city}` : ""}</span>
                    </p>
                  )}
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-105 space-y-1 text-[11px] text-slate-650">
                  <p className="font-bold text-slate-600 border-b border-dashed border-slate-205 pb-1 mb-1 uppercase tracking-tight flex justify-between items-center">
                    <span>Kepala Sekolah Penilai Penandatangan</span>
                    {school.principalStatus && school.principalStatus !== "definitif" && (
                      <span className="bg-amber-100 text-amber-805 border border-amber-200 text-[8px] font-black uppercase px-1 py-0.5 rounded">
                        {school.principalStatus}
                      </span>
                    )}
                  </p>
                  <p>
                    <strong>Nama:</strong>{" "}
                    {school.principalName
                      ? `${
                          school.principalStatus === "plt"
                            ? "Plt. "
                            : school.principalStatus === "plh"
                            ? "Plh. "
                            : ""
                        }${school.principalName}`
                      : "-"}
                  </p>
                  <p><strong>NIP:</strong> {school.principalNip || "-"}</p>
                </div>
              </div>
            </div>
          );
        })}
        {filteredSchools.length === 0 && !loading && (
          <div className="col-span-full bg-white p-10 border border-slate-200 rounded-xl text-center space-y-2 max-w-sm mx-auto">
            <Building className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-xs font-black text-slate-850 uppercase">Sekolah Tidak Ditemukan</h4>
            <p className="text-[11px] text-slate-500">Pencarian untuk "{searchQuery}" tidak menemukan kecocokan.</p>
          </div>
        )}
      </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn text-slate-100">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-100 uppercase tracking-tight">Hapus Data Sekolah Master</h3>
              <p className="text-xs text-slate-400">
                Apakah Anda yakin ingin menghapus data sekolah <strong className="text-white">"{pendingDelete.name}" (NPSN: {pendingDelete.npsn})</strong>?
                Data ini akan dilepaskan sepenuhnya.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold text-xs rounded-xl border border-slate-705 cursor-pointer transition-colors"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={executeDeleteSchool}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl border border-rose-500 cursor-pointer transition-colors"
              >
                YA, HAPUS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
