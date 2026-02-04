import React, { useState, useEffect } from "react";
import {
  UserPlus,
  Plus,
  X,
  Trash2,
  Users,
  Search,
  AlertTriangle,
  Eye,
  Edit2,
  Phone,
  Briefcase,
  Home,
  Globe,
  Loader2,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
  where,
  getDoc,
} from "firebase/firestore";
import { db, APP_ID } from "../../config";
import { usePermissions } from "../../hooks/usePermissions";

/**
 * Resident Manager Component
 * CRUD operations for resident data (Data Warga)
 *
 * Permissions:
 * - RW: Can view all residents
 * - RT: Can CRUD residents in their RT scope
 */
const ResidentManager = ({ user }) => {
  // Permission system
  const perms = usePermissions(user);

  const [residents, setResidents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    resident: null,
  });
  const [detailModal, setDetailModal] = useState({
    open: false,
    resident: null,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRtFilter, setSelectedRtFilter] = useState("ALL");
  const [formData, setFormData] = useState({
    name: "",
    unit: "",
    phone: "",
    job: "",
    status: "Tetap",
    isSingle: false,
    family: [],
  });
  const [familyTemp, setFamilyTemp] = useState({ name: "", relation: "Istri" });
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ ...toast, show: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Realtime listener for residents collection with scope filtering
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "artifacts", APP_ID, "public", "data", "residents"),
      orderBy("unit"),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        let fetchedData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Apply scope filtering based on permissions
        if (perms.isRT) {
          // RT only sees residents in their RT
          const rtCode = perms.rtNumber; // e.g. "01"
          fetchedData = fetchedData.filter((resident) => {
            // Method 1: Check explicit RT field (New Standard)
            if (resident.rt) {
              return resident.rt === rtCode;
            }

            // Method 2: Fallback to string matching (Legacy Data)
            const unit = (resident.unit || "").toUpperCase();
            // Match "RT01", "RT 01", "RT.01", "RT. 01"
            return (
              unit.includes(`RT${rtCode}`) ||
              unit.includes(`RT ${rtCode}`) ||
              unit.includes(`RT.${rtCode}`) ||
              unit.includes(`RT. ${rtCode}`)
            );
          });
        }
        // RW sees all residents (no filtering)

        setResidents(fetchedData);
      },
      (err) => console.log(err),
    );

    return () => unsub();
  }, [user, perms.isRT, perms.rtNumber]);

  // Reset form data
  const resetForm = () => {
    setFormData({
      name: "",
      unit: "",
      rt: "",
      phone: "",
      job: "",
      status: "Tetap",
      isSingle: false,
      family: [],
    });
    setFamilyTemp({ name: "", relation: "Istri" });
    setIsEditMode(false);
    setEditingId(null);
  };

  // Open modal for create
  const openCreateModal = () => {
    resetForm();
    // Pre-fill RT if user is RT
    if (perms.isRT) {
      setFormData((prev) => ({ ...prev, rt: perms.rtNumber }));
    }
    setIsModalOpen(true);
  };

  // Open modal for edit
  const openEditModal = (resident) => {
    // Extract RT from string "A1/10 (RT 01)" -> "01" usually, or fallback to saved 'rt' field if we add it
    // Ideally we should start saving 'rt' field separately.
    // For legacy data, we might need to parse.
    let rtValue = resident.rt || "";
    if (!rtValue && resident.unit) {
      const match = resident.unit.match(/\(RT (\d+)\)/);
      if (match) rtValue = match[1];
    }

    setFormData({
      name: resident.name || "",
      unit: resident.unit || "",
      rt: rtValue,
      phone: resident.phone || "",
      job: resident.job || "",
      status: resident.status || "Tetap",
      isSingle: resident.isSingle || false,
      family: Array.isArray(resident.family) ? resident.family : [], // Strict array check
    });
    setEditingId(resident.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Handle form submit - Create or Update resident
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required job field
    if (!formData.job || !formData.job.trim()) {
      alert("Pekerjaan wajib diisi!");
      return;
    }
    
    try {
      // Logic for Final Unit String
      // Combine unit input "A1/10" with RT "01" -> "A1/10 (RT 01)"
      const rtNum = perms.isRT ? (perms.rtNumber || formData.rt) : formData.rt;
      
      // Robust regex to clean existing RT suffix (handles " (RT 01)", "(RT.01)", etc)
      const pureUnit = formData.unit.replace(/\s*\(RT.*?\)$/i, "").trim(); 

      // If user forgot to put RT in unit string, append it standardly
      const finalUnit = `${pureUnit} (RT ${rtNum})`;

      // Auto-add pending family member if user forgot to click "+"
      let finalFamily = [...(formData.family || [])];
      if (familyTemp.name.trim()) {
        finalFamily.push({
          name: familyTemp.name,
          relation: familyTemp.relation || "Anak",
        });
        // Clear temp
        setFamilyTemp({ name: "", relation: "Anak" });
      }

      const payload = {
        ...formData,
        unit: finalUnit, // Display Unit string
        rt: rtNum, // Explicit RT field for robust filtering
        family: finalFamily,
      };

      console.log("Saving resident payload:", payload);

      if (isEditMode && editingId) {
        // Update existing resident
        await updateDoc(
          doc(
            db,
            "artifacts",
            APP_ID,
            "public",
            "data",
            "residents",
            editingId,
          ),
          {
            ...payload,
            updatedAt: new Date().toISOString(),
          },
        );

        // SYNC to User Profile if linked
        const currentResident = residents.find((r) => r.id === editingId);
        if (currentResident?.linkedUid) {
          try {
            await updateDoc(
              doc(
                db,
                "artifacts",
                APP_ID,
                "users",
                currentResident.linkedUid,
                "profile",
                "main",
              ),
              {
                ...payload,
                updatedAt: new Date().toISOString(),
              },
            );
            console.log("Synced update to User Profile:", currentResident.linkedUid);
          } catch (syncErr) {
            console.error("Failed to sync user profile:", syncErr);
            // Non-blocking error, user still updated in main list
          }
        }
      } else {
        // Create new resident
        await addDoc(
          collection(db, "artifacts", APP_ID, "public", "data", "residents"),
          {
            ...payload,
            createdAt: new Date().toISOString(),
          },
        );
      }

      // Close modal and reset form FIRST (immediate feedback)
      setIsModalOpen(false);
      resetForm();
      
      // Show success toast
      setToast({
        show: true,
        message: isEditMode ? "Data warga berhasil diperbarui!" : "Warga baru berhasil ditambahkan!",
        type: "success"
      });
    } catch (error) {
      console.error("Error saving resident:", error);
      alert("Gagal menyimpan data warga! Error: " + error.message);
    }
  };

  // Handle delete with confirmation modal
  const handleDelete = async () => {
    if (!deleteModal.resident) return;
    try {
      // Check for linkedUid to clean up User data
      const residentId = deleteModal.resident.id;
      const residentRef = doc(
        db,
        "artifacts",
        APP_ID,
        "public",
        "data",
        "residents",
        residentId,
      );
      const residentSnap = await getDoc(residentRef);

      if (residentSnap.exists()) {
        const data = residentSnap.data();
        if (data.linkedUid) {
          // Also delete the synced Synced User Profile
          // We delete profile/main. We could also delete the user root doc but let's stick to profile as that's what we synced.
          await deleteDoc(
            doc(
              db,
              "artifacts",
              APP_ID,
              "users",
              data.linkedUid,
              "profile",
              "main",
            ),
          );
          console.log(`Deleted linked user profile for UID: ${data.linkedUid}`);
        }
      }

      // Delete the Resident document
      await deleteDoc(residentRef);
      setDeleteModal({ open: false, resident: null });
    } catch (error) {
      console.error("Error deleting resident:", error);
      alert("Gagal menghapus data warga!");
    }
  };

  // Add family member to form
  const addFamilyMember = () => {
    if (!familyTemp.name) return;
    setFormData({ ...formData, family: [...formData.family, familyTemp] });
    setFamilyTemp({ name: "", relation: "Anak" });
  };

  // Remove family member from form
  const removeFamilyMember = (index) => {
    setFormData({
      ...formData,
      family: formData.family.filter((_, idx) => idx !== index),
    });
  };

  // Filter residents by search term and RT (for RW)
  const filteredResidents = residents.filter((r) => {
    // 1. Check Search Term
    const matchesSearch =
      r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.unit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.phone?.includes(searchTerm);

    // 2. Check RT Filter (only if RW and filter is not ALL)
    let matchesRt = true;
    if (perms.isRW && selectedRtFilter !== "ALL") {
      if (r.rt) {
        // New standard: check explicit RT field
        matchesRt = r.rt === selectedRtFilter;
      } else {
        // Fallback: check unit string for "RT XX"
        // Normalizes "RT01", "RT 01", "RT.01" to match selected "01"
        const unitUpper = (r.unit || "").toUpperCase();
        matchesRt =
          unitUpper.includes(`RT${selectedRtFilter}`) ||
          unitUpper.includes(`RT ${selectedRtFilter}`) ||
          unitUpper.includes(`RT.${selectedRtFilter}`) ||
          unitUpper.includes(`RT. ${selectedRtFilter}`);
      }
    }

    return matchesSearch && matchesRt;
  });

  // Get relation color
  const getRelationColor = (relation) => {
    switch (relation) {
      case "Istri":
        return "bg-pink-100 text-pink-700";
      case "Suami":
        return "bg-blue-100 text-blue-700";
      case "Anak":
        return "bg-green-100 text-green-700";
      case "Ortu":
        return "bg-purple-100 text-purple-700";
      case "ART":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 animate-fade-in flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg ${
          toast.type === "success" 
            ? "bg-emerald-600 text-white" 
            : "bg-red-600 text-white"
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
          }`}>
            {toast.type === "success" ? "✓" : "✕"}
          </div>
          <span className="font-medium">{toast.message}</span>
          <button 
            onClick={() => setToast({ ...toast, show: false })}
            className="ml-2 hover:opacity-80"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Manajemen Data Warga
          </h2>
          <p className="text-slate-500 text-sm">
            Total {residents.length} kepala keluarga terdaftar
            {perms.isRT && (
              <span className="font-semibold text-emerald-600">
                {" "}
                • RT {perms.rtNumber}
              </span>
            )}
            {perms.isRW && (
              <span className="text-blue-600"> • Mode Monitoring</span>
            )}
          </p>
        </div>

        {/* Create button only for RT */}
        {perms.isRT && (
          <button
            onClick={openCreateModal}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 text-sm shadow-lg shadow-emerald-200 flex items-center gap-2 transition-all hover:scale-105"
          >
            <UserPlus className="w-4 h-4" /> Tambah Warga
          </button>
        )}
      </div>

      {/* Read-only Notice for RW */}
      {perms.isRW && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-blue-900 mb-1">
              Mode Monitoring (Read-Only)
            </h4>
            <p className="text-sm text-blue-700">
              Anda dapat melihat data warga dari seluruh RT untuk keperluan
              monitoring. Untuk menambah, mengubah, atau menghapus data warga,
              silakan koordinasi dengan RT terkait.
            </p>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* RT Filter Dropdown (Only for RW) */}
        {perms.isRW && (
          <div className="w-full md:w-48 flex-shrink-0">
             <select
              value={selectedRtFilter}
              onChange={(e) => setSelectedRtFilter(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-medium text-slate-700 h-[46px]"
            >
              <option value="ALL">Semua RT</option>
              {[...Array(10)].map((_, i) => {
                const num = String(i + 1).padStart(2, "0");
                return (
                  <option key={num} value={num}>
                    RT {num}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, unit, atau kontak..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm h-[46px]"
          />
        </div>
      </div>

      {/* Modal Create/Edit Warga */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-800">
                  {isEditMode ? "Edit Data Warga" : "Tambah Data Warga"}
                </h3>
                <p className="text-sm text-slate-500">
                  {isEditMode
                    ? "Perbarui data kepala keluarga"
                    : "Isi data kepala keluarga baru"}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* RT Selection Logic & Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">
                    Wilayah RT
                  </label>
                  {perms.isRW ? (
                    <select
                      required
                      value={formData.rt || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, rt: e.target.value })
                      }
                      className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Pilih RT...</option>
                      {[...Array(10)].map((_, i) => {
                        const num = String(i + 1).padStart(2, "0");
                        return (
                          <option key={num} value={num}>
                            RT {num}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={`RT ${perms.rtNumber || ""}`}
                      disabled
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-bold"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">
                    Unit / Blok Rumah
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: A1/10"
                    value={formData.unit?.replace(/ \(RT \d+\)$/, "") || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-400">
                    Masukkan blok saja (misal: A1/10). Sistem otomatis label RT.
                  </p>
                </div>
              </div>

              {/* Nama Kepala Keluarga */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">
                  Nama Kepala Keluarga
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">
                    No. WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">
                    Pekerjaan <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={
                      [
                        "Wiraswasta",
                        "PNS",
                        "TNI/Polri",
                        "Karyawan Swasta",
                        "Guru/Dosen",
                        "Dokter",
                        "Mahasiswa",
                        "Pelajar",
                        "Ibu Rumah Tangga",
                        "Pensiunan",
                        "Tidak Bekerja",
                      ].includes(formData.job)
                        ? formData.job
                        : formData.job === ""
                          ? ""
                          : "_CUSTOM_"
                    }
                    onChange={(e) => {
                      if (e.target.value === "_CUSTOM_") {
                        setFormData({ ...formData, job: " " });
                      } else {
                        setFormData({ ...formData, job: e.target.value });
                      }
                    }}
                  >
                    <option value="">-- Pilih Pekerjaan --</option>
                    <option value="Wiraswasta">Wiraswasta</option>
                    <option value="PNS">PNS</option>
                    <option value="TNI/Polri">TNI/Polri</option>
                    <option value="Karyawan Swasta">Karyawan Swasta</option>
                    <option value="Guru/Dosen">Guru/Dosen</option>
                    <option value="Dokter">Dokter</option>
                    <option value="Mahasiswa">Mahasiswa</option>
                    <option value="Pelajar">Pelajar</option>
                    <option value="Ibu Rumah Tangga">Ibu Rumah Tangga</option>
                    <option value="Pensiunan">Pensiunan</option>
                    <option value="Tidak Bekerja">Tidak Bekerja</option>
                    <option value="_CUSTOM_">Lainnya (Isi Manual)</option>
                  </select>
                  {/* Show text input if 'Lainnya' selected or custom value */}
                  {formData.job !== "" &&
                    ![
                      "Wiraswasta",
                      "PNS",
                      "TNI/Polri",
                      "Karyawan Swasta",
                      "Guru/Dosen",
                      "Dokter",
                      "Mahasiswa",
                      "Pelajar",
                      "Ibu Rumah Tangga",
                      "Pensiunan",
                      "Tidak Bekerja",
                    ].includes(formData.job) && (
                      <input
                        className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none mt-2"
                        placeholder="Tulis nama pekerjaan..."
                        value={formData.job.trim()}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            job: e.target.value || " ",
                          })
                        }
                        required
                      />
                    )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">
                  Status Tempat Tinggal
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Tetap">Warga Tetap</option>
                  <option value="Kontrak">Ngontrak / Sewa</option>
                  <option value="Kost">Kost</option>
                </select>
              </div>

              {/* Single/Lajang Checkbox */}
              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="isSingle"
                  checked={formData.isSingle}
                  onChange={(e) =>
                    setFormData({ ...formData, isSingle: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label
                  htmlFor="isSingle"
                  className="text-sm font-medium text-slate-700 cursor-pointer select-none"
                >
                  Lajang / Belum Menikah
                </label>
              </div>

              {/* Family Members Section - Hidden when Single */}
              {!formData.isSingle && (
                <div className="border-t border-slate-100 pt-4">
                  <label className="text-sm font-bold text-slate-600 mb-2 block">
                    Anggota Keluarga
                  </label>

                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Nama Anggota"
                      value={familyTemp.name}
                      onChange={(e) =>
                        setFamilyTemp({ ...familyTemp, name: e.target.value })
                      }
                      className="flex-1 p-2 rounded-lg border border-slate-200 text-sm"
                    />
                    <select
                      value={familyTemp.relation}
                      onChange={(e) =>
                        setFamilyTemp({ ...familyTemp, relation: e.target.value })
                      }
                      className="p-2 rounded-lg border border-slate-200 text-sm bg-white"
                    >
                      <option value="Istri">Istri</option>
                      <option value="Suami">Suami</option>
                      <option value="Anak">Anak</option>
                      <option value="Orang Tua">Orang Tua</option>
                      <option value="ART">ART</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                    <button
                      type="button"
                      onClick={addFamilyMember}
                      className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(formData.family || []).map((member, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-sm"
                      >
                        <div>
                          <span className="font-bold text-slate-700">
                            {member.name}
                          </span>
                          <span className="text-slate-500 mx-2">•</span>
                          <span className="text-slate-500">
                            {member.relation}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFamilyMember(idx)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {(!formData.family || formData.family.length === 0) && (
                      <p className="text-xs text-slate-400 italic text-center py-2">
                        Belum ada anggota keluarga ditambahkan
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:scale-[1.02] active:scale-95 mt-4"
              >
                Simpan Data Warga
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal - View Family Members */}
      {detailModal.open && detailModal.resident && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-800">
                  Detail Data Warga
                </h3>
                <p className="text-sm text-slate-500">
                  Informasi lengkap kepala keluarga
                </p>
              </div>
              <button
                onClick={() => setDetailModal({ open: false, resident: null })}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Resident Info */}
            <div className="space-y-4">
              {/* Header Card */}
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
                <h4 className="font-bold text-xl">
                  {detailModal.resident.name}
                </h4>
                <div className="flex items-center gap-2 mt-2 opacity-90">
                  <Home className="w-4 h-4" />
                  <span className="text-sm">
                    Unit {detailModal.resident.unit}
                  </span>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Phone className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Kontak</span>
                  </div>
                  <p className="font-bold text-slate-800 font-mono">
                    {detailModal.resident.phone}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Briefcase className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">
                      Pekerjaan
                    </span>
                  </div>
                  <p className="font-bold text-slate-800">
                    {detailModal.resident.job || "-"}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="bg-slate-50 rounded-xl p-4">
                <span className="text-xs font-bold uppercase text-slate-500">
                  Status Hunian
                </span>
                <div className="mt-2">
                  <span
                    className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                      detailModal.resident.status === "Tetap"
                        ? "bg-green-100 text-green-700"
                        : detailModal.resident.status === "Kontrak"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {detailModal.resident.status}
                  </span>
                </div>
              </div>

              {/* Family Members */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    <h5 className="font-bold text-slate-800">
                      Anggota Keluarga
                    </h5>
                  </div>
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                    {(detailModal.resident.family?.length || 0) + 1} Orang
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Kepala Keluarga */}
                  <div className="flex items-center gap-3 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                      {detailModal.resident.name?.charAt(0) || "K"}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">
                        {detailModal.resident.name}
                      </p>
                      <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                        Kepala Keluarga
                      </span>
                    </div>
                  </div>

                  {/* Family Members */}
                  {detailModal.resident.family?.length > 0 ? (
                    detailModal.resident.family.map((member, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100"
                      >
                        <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-white font-bold">
                          {member.name?.charAt(0) || "?"}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-800">
                            {member.name}
                          </p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${getRelationColor(member.relation)}`}
                          >
                            {member.relation}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-slate-400 text-sm py-4">
                      Tidak ada anggota keluarga lain
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              {/* Edit button - Only for RT users */}
              {perms.isRT && (
                <button
                  onClick={() => {
                    setDetailModal({ open: false, resident: null });
                    openEditModal(detailModal.resident);
                  }}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> Edit Data
                </button>
              )}
              <button
                onClick={() => setDetailModal({ open: false, resident: null })}
                className={`py-3 px-4 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors ${perms.isRW ? 'w-full' : 'flex-1'}`}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-2">
                Konfirmasi Hapus
              </h3>
              <p className="text-slate-500 text-sm mb-6">
                Apakah Anda yakin ingin menghapus data warga <br />
                <span className="font-bold text-slate-800">
                  {deleteModal.resident?.name}
                </span>{" "}
                - Unit{" "}
                <span className="font-bold">{deleteModal.resident?.unit}</span>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setDeleteModal({ open: false, resident: null })
                  }
                  className="flex-1 py-3 px-4 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Residents Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">
                  Unit/Blok
                </th>
                <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">
                  Kepala Keluarga
                </th>
                <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">
                  Kontak
                </th>
                <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">
                  Pekerjaan
                </th>
                <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-center">
                  Jml Anggota
                </th>
                <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResidents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">
                    {searchTerm
                      ? "Tidak ada data yang cocok dengan pencarian"
                      : "Belum ada data warga"}
                  </td>
                </tr>
              ) : (
                filteredResidents.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                        {r.unit}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{r.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === "Tetap"
                              ? "bg-green-100 text-green-700"
                              : r.status === "Kontrak"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-600 font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                        {r.phone}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">{r.job || "-"}</td>
                    <td className="p-4 text-center">
                      <span className="bg-slate-100 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700">
                        {(r.family?.length || 0) + 1} Org
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        {/* View Button - Always visible */}
                        <button
                          onClick={() =>
                            setDetailModal({ open: true, resident: r })
                          }
                          className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                          title="Lihat detail & anggota keluarga"
                        >
                          <Eye className="w-4 h-4" />
                          {perms.isRW && <span className="text-xs font-medium">Detail</span>}
                        </button>

                        {/* Edit & Delete - Only for RT (own residents) */}
                        {perms.isRT && r.rt === perms.rtNumber && (
                          <>
                            <button
                              onClick={() => openEditModal(r)}
                              className="text-amber-500 hover:text-amber-700 p-2 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit data warga"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteModal({ open: true, resident: r })
                              }
                              className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus data warga"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResidentManager;
