import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, FileCheck, Filter, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db, APP_ID } from '../../config';

const ReportPermitManager = ({ user }) => {
  const [activeTab, setActiveTab] = useState("reports");
  const [statusFilter, setStatusFilter] = useState("active");
  const [data, setData] = useState([]);
  const [rejectReason, setRejectReason] = useState({});
  const [showRejectInput, setShowRejectInput] = useState({});

  // DEFINISI ALUR PERSETUJUAN (Hybrid Approval)
  const APPROVAL_FLOWS = useMemo(() => ({
    // Level 1: RT Saja (Langsung Approved)
    'Izin Tamu': { level: 'RT_ONLY' },
    'Izin Parkir': { level: 'RT_ONLY' },
    
    // Level 2: Bertingkat (RT -> RW -> Approved)
    'Izin Renovasi': { level: 'TIERED' },
    'Izin Acara Besar': { level: 'TIERED' }, // Disesuaikan dengan "Izin Acara" di dummy, pakai matching parsial nanti
    'Izin Acara': { level: 'TIERED' }, 
    
    // Level 3: RW Saja (Fasum)
    'Penggunaan Fasum': { level: 'RW_ONLY' }
  }), []);

  const getFlowType = (type) => {
    // Default fallback ke RT_ONLY jika tipe tidak dikenal
    return APPROVAL_FLOWS[type]?.level || 'RT_ONLY';
  };

  useEffect(() => {
    if (!user) return;
    const colName = activeTab === "reports" ? "reports" : "permits";
    
    // Base Query
    const q = query(
      collection(db, "artifacts", APP_ID, "public", "data", colName),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      let fetchedData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // RBAC Filtering High Importance
      // NOTE: RW sees ALL data globally
      // RT sees only THEIR data
      if (user.type === "RT") {
          const rtCode = user.id; // e.g. "01"
          fetchedData = fetchedData.filter(item => {
              const unit = (item.userUnit || '').toUpperCase();
              return unit.includes(`RT${rtCode}`) || 
                     unit.includes(`RT ${rtCode}`) || 
                     unit.includes(`RT.${rtCode}`) ||
                     unit.includes(`RT ${rtCode}`); 
          });
      }

      setData(fetchedData);
    });
    
    return () => unsub();
  }, [user, activeTab]);

  // Filter data based on statusFilter
  const filteredData = useMemo(() => {
    let result = [];
    if (statusFilter === "all") result = [...data];
    else if (statusFilter === "active") {
        result = data.filter(
            (item) =>
                item.status === "OPEN" ||
                item.status === "IN_PROGRESS" ||
                item.status === "PENDING" ||
                item.status === "WAITING_RW_APPROVAL" // Include new status
        );
    } else if (statusFilter === "done") {
        result = data.filter(
            (item) =>
                item.status === "DONE" ||
                item.status === "APPROVED" ||
                item.status === "REJECTED"
        );
    }

    return result.sort((a, b) => {
      const dateA = a.createdAt?.seconds ? a.createdAt.seconds : new Date(a.createdAt).getTime() / 1000;
      const dateB = b.createdAt?.seconds ? b.createdAt.seconds : new Date(b.createdAt).getTime() / 1000;
      return dateB - dateA;
    });
  }, [data, statusFilter]);

  const updateStatus = async (id, newStatus, reason = "") => {
    // Confirmation Logic
    let confirmText = "Lanjutkan aksi ini?";
    if (newStatus === "WAITING_RW_APPROVAL") confirmText = "Setujui dan teruskan ke RW untuk validasi akhir?";
    else if (newStatus === "APPROVED") confirmText = "Setujui permohonan ini secara final?";
    else if (newStatus === "REJECTED") confirmText = "Tolak permohonan ini?";
    else if (newStatus === "DONE") confirmText = "Tandai laporan selesai?";
    
    if (!window.confirm(confirmText)) return;

    try {
      const colName = activeTab === "reports" ? "reports" : "permits";
      const payload = { status: newStatus };
      if (newStatus === "REJECTED" && reason) payload.rejectReason = reason;

      // Add Approver Info
      if (newStatus === "APPROVED" || newStatus === "WAITING_RW_APPROVAL") {
          const fieldName = user.type === 'RW' ? 'approvedByRW' : 'approvedByRT';
          payload[fieldName] = user.name || user.label;
          payload[`${fieldName}At`] = new Date().toISOString();
      }

      await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", colName, id), payload);
      // window.alert("Status diperbarui!"); // Optional feedback
    } catch (err) {
      console.error(err);
      window.alert("Gagal memperbarui status");
    }
  };

  // Get status counts for badges
  const statusCounts = useMemo(() => ({
      all: data.length,
      active: data.filter(i => ['OPEN', 'IN_PROGRESS', 'PENDING', 'WAITING_RW_APPROVAL'].includes(i.status)).length,
      done: data.filter(i => ['DONE', 'APPROVED', 'REJECTED'].includes(i.status)).length,
  }), [data]);

  // Get status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case "OPEN": return { bg: "bg-red-100", text: "text-red-700", icon: AlertCircle, label: "Menunggu" };
      case "PENDING": return { bg: "bg-orange-100", text: "text-orange-700", icon: Clock, label: "Menunggu RT" };
      case "WAITING_RW_APPROVAL": return { bg: "bg-purple-100", text: "text-purple-700", icon: Clock, label: "Validasi RW" }; // New Badge
      case "IN_PROGRESS": return { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock, label: "Diproses" };
      case "DONE": return { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle, label: "Selesai" };
      case "APPROVED": return { bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle, label: "Disetujui" };
      case "REJECTED": return { bg: "bg-slate-100", text: "text-slate-600", icon: AlertCircle, label: "Ditolak" };
      default: return { bg: "bg-gray-100", text: "text-gray-700", icon: AlertCircle, label: status };
    }
  };

  const getReportIconStyle = (category = "") => {
    const key = category.toLowerCase();
    if (key.includes("keamanan")) return "bg-red-100 text-red-600";
    if (key.includes("kebersihan")) return "bg-green-100 text-green-600";
    if (key.includes("infrastruktur")) return "bg-yellow-100 text-yellow-700";
    return "bg-slate-100 text-slate-600";
  };

  const formatDate = (date) => {
    if (!date) return "-";
    let d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    if (isNaN(d)) return "-";
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Pusat Layanan Warga</h2>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab("reports")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "reports" ? "bg-white shadow text-emerald-700" : "text-slate-500"}`}>Keluhan / Laporan</button>
          <button onClick={() => setActiveTab("permits")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "permits" ? "bg-white shadow text-emerald-700" : "text-slate-500"}`}>Surat & Izin</button>
        </div>
      </div>

      {/* Seeder Button REMOVED for clean code, or kept if user wants testing. Let's keep minimal dev tool */}
      {/* ... (Seeder code omitted for brevity as per user request to 'buatkan codingannya' implying the result, but I will keep it simple if needed. Actually I'll remove it to clean up as user didn't explicitly ask to keep it and it was 'temporary') */}
      
      {/* Seeder Button (Dev Only) */}
      <div className="flex justify-end">
          <button 
              onClick={async () => {
                  const confirm = window.confirm("Buat data dummy untuk testing Hybrid Approval?");
                  if(!confirm) return;
                  
                  try {
                       const dummyReports = [
                          { title: "Lampu Jalan Mati", description: "Lampu penerangan di depan pos satpam mati total.", category: "Infrastruktur", status: "OPEN", userName: "Budi Santoso", userUnit: "A1/10 RT01" },
                       ];

                       const dummyPermits = [
                           // CASE 1: RT ONLY (Direct Approve)
                           { type: "Izin Tamu", description: "Tamu menginap 3 hari (Saudara dari kampung).", status: "PENDING", userName: "Ahmadi", userUnit: "A1/05 RT01" },
                           { type: "Izin Parkir", description: "Parkir mobil tambahan di bahu jalan.", status: "PENDING", userName: "Siti Nurhaliza", userUnit: "B2/11 RT02" },

                           // CASE 2: TIERED (RT -> RW)
                           { type: "Izin Renovasi", description: "Renovasi pagar depan dan garasi.", status: "PENDING", userName: "Budi Santoso", userUnit: "A1/10 RT01" },
                           { type: "Izin Acara", description: "Acara ulang tahun anak (mengundang 50 orang).", status: "WAITING_RW_APPROVAL", userName: "Dewi Lestari", userUnit: "B1/12 RT02" }, // Simulated already approved by RT

                           // CASE 3: RW ONLY
                           { type: "Penggunaan Fasum", description: "Pinjam Gedung Serbaguna untuk Rapat Koperasi.", status: "PENDING", userName: "Ketua Koperasi", userUnit: "C1/01 RT03" }
                       ];

                       // Seed Reports
                       for(const r of dummyReports) {
                           await import('firebase/firestore').then(({addDoc, collection}) => 
                               addDoc(collection(db, "artifacts", APP_ID, "public", "data", "reports"), {
                                   ...r,
                                   createdAt: new Date().toISOString(),
                                   isDummy: true
                               })
                           );
                       }
                       
                       // Seed Permits
                       for(const p of dummyPermits) {
                           await import('firebase/firestore').then(({addDoc, collection}) => 
                               addDoc(collection(db, "artifacts", APP_ID, "public", "data", "permits"), {
                                   ...p,
                                   createdAt: new Date().toISOString(),
                                   isDummy: true
                               })
                           );
                       }
                       
                       alert("✅ Berhasil membuat Data Dummy Testing!");
                  } catch(e) {
                      console.error(e);
                      alert("Gagal seeding: " + e.message);
                  }
              }}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
              + Seed Data Dummy (Test Hybrid)
          </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Status</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'done'].map(filter => (
             <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                  statusFilter === filter
                    ? (filter === 'active' ? "bg-orange-500 text-white shadow-lg" : filter === 'done' ? "bg-green-500 text-white shadow-lg" : "bg-slate-800 text-white shadow-lg")
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter === 'all' && 'Semua'}
                {filter === 'active' && 'Aktif'}
                {filter === 'done' && 'Selesai'}
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusFilter === filter ? "bg-white/20" : "bg-slate-200"}`}>
                  {statusCounts[filter]}
                </span>
              </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="grid gap-4">
        {filteredData.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
            <p className="text-slate-400 italic">Tidak ada data.</p>
          </div>
        ) : (
          filteredData.map((item) => {
            const statusBadge = getStatusBadge(item.status);
            const StatusIcon = statusBadge.icon;
            const flowType = getFlowType(item.type);

            return (
              <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-center">
                {/* Icon */}
                <div className={`p-3 rounded-full ${activeTab === "reports" ? getReportIconStyle(item.category) : `${statusBadge.bg} ${statusBadge.text}`}`}>
                  {activeTab === "reports" ? <AlertTriangle className="w-6 h-6" /> : <FileCheck className="w-6 h-6" />}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusBadge.bg} ${statusBadge.text} flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusBadge.label}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
                  </div>
                  <h3 className="font-bold text-slate-800">{activeTab === "reports" ? item.category : item.type}</h3>
                  <p className="text-sm text-slate-600">{item.description}</p>
                  <div className="mt-2 flex gap-4 text-xs text-slate-500 font-mono">
                      <span>👤 {item.userName}</span>
                      <span>🏠 {item.userUnit}</span>
                  </div>
                  {item.status === 'REJECTED' && <p className="text-xs text-red-500 mt-1">⚠️ Alasan: {item.rejectReason}</p>}
                </div>

                {/* ACTION BUTTONS (The Core Logic) */}
                <div className="flex gap-2">
                  {/* === REPORTS LOGIC (Simpler) === */}
                  {activeTab === "reports" && (
                     <>
                        {item.status === "OPEN" && (
                            <button onClick={() => updateStatus(item.id, "IN_PROGRESS")} className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold hover:bg-yellow-200">Proses</button>
                        )}
                        {item.status === "IN_PROGRESS" && (
                            <button onClick={() => updateStatus(item.id, "DONE")} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200">Selesai</button>
                        )}
                     </>
                  )}

                  {/* === PERMITS LOGIC (Hybrid Approval) === */}
                  {activeTab === "permits" && (
                    <>
                        {/* 1. APPROVE/REJECT BUTTONS */}
                        {(() => {
                            // CASE A: RT Only Logic
                            if (flowType === 'RT_ONLY') {
                                if (user.type === 'RT' && item.status === 'PENDING') {
                                    return (
                                        <>
                                            <button onClick={() => setShowRejectInput({[item.id]: true})} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold">Tolak</button>
                                            <button onClick={() => updateStatus(item.id, 'APPROVED')} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold">Setujui</button>
                                        </>
                                    );
                                }
                            }

                            // CASE B: Tiered Logic (RT -> RW)
                            if (flowType === 'TIERED') {
                                // RT Step
                                if (user.type === 'RT' && item.status === 'PENDING') {
                                    return (
                                        <>
                                            <button onClick={() => setShowRejectInput({[item.id]: true})} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold">Tolak</button>
                                            <button onClick={() => updateStatus(item.id, 'WAITING_RW_APPROVAL')} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">Validasi & Teruskan ke RW</button>
                                        </>
                                    );
                                }
                                // RW Step
                                if (user.type === 'RW' && item.status === 'WAITING_RW_APPROVAL') {
                                    return (
                                        <>
                                            <button onClick={() => setShowRejectInput({[item.id]: true})} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold">Tolak</button>
                                            <button onClick={() => updateStatus(item.id, 'APPROVED')} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">Setujui Final</button>
                                        </>
                                    );
                                }
                            }

                            // CASE C: RW Only Logic
                            if (flowType === 'RW_ONLY') {
                                if (user.type === 'RW' && item.status === 'PENDING') {
                                    return (
                                        <>
                                            <button onClick={() => setShowRejectInput({[item.id]: true})} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold">Tolak</button>
                                            <button onClick={() => updateStatus(item.id, 'APPROVED')} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold">Setujui</button>
                                        </>
                                    );
                                }
                            }
                            
                            // READ ONLY STATES INFORMATION
                            if (item.status === 'PENDING' && user.type === 'RW' && flowType === 'TIERED') {
                                return <span className="text-xs text-slate-400 italic">Menunggu Validasi RT setempat...</span>;
                            }
                            if (['APPROVED', 'DONE'].includes(item.status)) return <span className="text-xs text-green-600 font-bold">Disetujui</span>;
                            if (item.status === 'REJECTED') return <span className="text-xs text-red-500 font-bold">Ditolak</span>;

                            return null;
                        })()}

                        {/* REJECT INPUT POPUP */}
                        {showRejectInput[item.id] && (
                            <div className="absolute right-0 mt-8 mr-4 bg-white p-3 rounded-xl shadow-xl border border-red-100 z-10 w-64">
                                <p className="text-xs font-bold text-slate-700 mb-2">Alasan Penolakan:</p>
                                <textarea 
                                    value={rejectReason[item.id] || ''} 
                                    onChange={e => setRejectReason({...rejectReason, [item.id]: e.target.value})}
                                    className="w-full text-xs p-2 border rounded-lg mb-2"
                                    rows="2"
                                ></textarea>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setShowRejectInput({...showRejectInput, [item.id]: false})} className="text-xs text-slate-500">Batal</button>
                                    <button 
                                        onClick={() => {
                                            updateStatus(item.id, 'REJECTED', rejectReason[item.id]); 
                                            setShowRejectInput({...showRejectInput, [item.id]: false});
                                        }} 
                                        className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg"
                                    >
                                        Konfirmasi
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ReportPermitManager;
