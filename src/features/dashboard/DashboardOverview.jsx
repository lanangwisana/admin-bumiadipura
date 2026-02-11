import React, { useState, useEffect } from 'react';
import { 
    Users, CreditCard, AlertTriangle, Shield, 
    Radio, Brain, Sparkles, RefreshCw, BookOpen, FileText,
    Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { doc, onSnapshot, collection, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import { db, APP_ID } from '../../config';
import { formatDate } from '../../utils';
import { callGeminiAPI } from '../../utils';
import { StatCard, BroadcastModal } from './components';

/**
 * Dashboard Overview Component
 * Features:
 * 1. Shortcut Broadcast - Pop Up dengan Judul Pengumuman dan Isi Pesan
 * 2. Ringkasan Data (Cards) - Total Warga, Tagihan Pending, Laporan Terbaru, Status Main Gate
 * 3. Laporan Terbaru (Table) - Max 3 laporan, urut tanggal terbaru, status laporan
 */
const DashboardOverview = ({ user, role }) => {
  const [stats, setStats] = useState({
    residents: 0,
    pendingBills: 0,
    openReports: 0,
    gateStatus: "Loading...",
  });
  const [recentReports, setRecentReports] = useState([]);
  const [dailyBriefing, setDailyBriefing] = useState("");
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Gate Status Listener
    const unsubGate = onSnapshot(
      doc(
        db,
        "artifacts",
        APP_ID,
        "public",
        "data",
        "iot_devices",
        "gate_main",
      ),
      (s) => {
        if (s.exists())
          setStats((prev) => ({
            ...prev,
            gateStatus: s.data().isOpen ? "TERBUKA" : "TERTUTUP",
          }));
      },
    );

    // Total Residents Listener
    const unsubResidents = onSnapshot(
      collection(db, "artifacts", APP_ID, "public", "data", "residents"),
      (s) => {
        let count = s.size;
        if (role?.type === "RT") {
          // Filter count for RT
          const rtCode = role?.id;
          const filtered = s.docs.filter((d) => {
            const u = (d.data().unit || "").toUpperCase();
            return (
              u.includes(`RT${rtCode}`) ||
              u.includes(`RT ${rtCode}`) ||
              u.includes(`RT.${rtCode}`)
            );
          });
          count = filtered.length;
        }
        setStats((prev) => ({ ...prev, residents: count }));
      },
    );

    // Pending IPL Listener
    const unsubBills = onSnapshot(
      query(
        collection(db, "artifacts", APP_ID, "public", "data", "billings"),
        where("status", "==", "PENDING_VERIFICATION"),
      ),
      (s) => {
        let bills = s.docs.map((d) => ({ id: d.id, ...d.data() }));

        if (role?.type === "RT") {
          const rtCode = String(role?.id).padStart(2, "0");

          bills = bills.filter((b) => b.rt === rtCode);
        }

        setStats((prev) => ({
          ...prev,
          pendingBills: bills.length,
        }));
      },
    );

    // Open Reports Count Listener
    const unsubReports = onSnapshot(
      query(
        collection(db, "artifacts", APP_ID, "public", "data", "reports"),
        where("status", "==", "OPEN"),
      ),
      (s) => {
        let count = s.size;
        if (role?.type === "RT") {
          const rtCode = role?.id;
          const filtered = s.docs.filter((d) => {
            const u = (d.data().userUnit || "").toUpperCase();
            return (
              u.includes(`RT${rtCode}`) ||
              u.includes(`RT ${rtCode}`) ||
              u.includes(`RT.${rtCode}`)
            );
          });
          count = filtered.length;
        }
        setStats((prev) => ({ ...prev, openReports: count }));
      },
    );

    // Recent Reports - Max 5 (then filter client-side for OPEN & IN_PROGRESS)
    const unsubList = onSnapshot(
      query(
        collection(db, "artifacts", APP_ID, "public", "data", "reports"),
        orderBy("createdAt", "desc"),
        limit(20), // Fetch more to allow for filtering
      ),
      (s) => {
        let allReports = s.docs.map((d) => ({ id: d.id, ...d.data() }));

        // RBAC Filter for Recent Reports
        if (role?.type === "RT") {
          const rtCode = role?.id;
          allReports = allReports.filter((r) => {
            const u = (r.userUnit || "").toUpperCase();
            return (
              u.includes(`RT${rtCode}`) ||
              u.includes(`RT ${rtCode}`) ||
              u.includes(`RT.${rtCode}`)
            );
          });
        }

        // Filter active reports (excluding DONE)
        const activeReports = allReports
          .filter((r) => r.status !== "DONE")
          .slice(0, 3);
        setRecentReports(activeReports);
      },
    );

    return () => {
      unsubGate();
      unsubResidents();
      unsubReports();
      unsubList();
      unsubBills();
    };
  }, [user, role]);

  // Generate AI Daily Briefing
  const generateBriefing = async () => {
    setIsGeneratingBriefing(true);
    const prompt = `Buat ringkasan harian admin: ${stats.residents} warga total, ${stats.openReports} laporan warga menunggu, status gerbang utama ${stats.gateStatus}. Berikan saran prioritas.`;
    const result = await callGeminiAPI(prompt);
    setDailyBriefing(result);
    setIsGeneratingBriefing(false);
  };

  // Send Broadcast to news collection
  const sendBroadcast = async (data) => {
    await addDoc(
      collection(db, "artifacts", APP_ID, "public", "data", "news"),
      {
        title: data.title,
        content: data.message, // Map 'message' from modal to 'content' for consistency
        cat: "Pengumuman",
        date: new Date().toLocaleDateString("id-ID"),
        sender: role.label,
        createdAt: new Date().toISOString(),
        image:
          "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80",
        color: "bg-red-100 text-red-700",
        // Tambahkan info pembuat untuk access control
        createdBy: role?.type === "RW" ? "RW" : `RT${role?.id}`,
        createdByUid: user?.uid || null,
        createdByName: role?.label || "Unknown",
      },
    );
    setShowBroadcast(false);
    alert("Broadcast terkirim!");
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case "OPEN":
        return {
          bg: "bg-red-100",
          text: "text-red-700",
          icon: AlertCircle,
          label: "Menunggu",
        };
      case "IN_PROGRESS":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-700",
          icon: Clock,
          label: "Diproses",
        };
      case "DONE":
        return {
          bg: "bg-green-100",
          text: "text-green-700",
          icon: CheckCircle,
          label: "Selesai",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-700",
          icon: AlertCircle,
          label: status,
        };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Broadcast Button */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
            Dashboard Utama
          </h2>
          <p className="text-slate-500 font-medium">
            Overview aktivitas Bumi Adipura hari ini.
          </p>
        </div>
        {/* Shortcut Broadcast Button */}
        <button
          onClick={() => setShowBroadcast(true)}
          className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 hover:from-red-700 hover:to-red-800 shadow-xl shadow-red-200 transition-all hover:scale-105 active:scale-95"
        >
          <Radio className="w-5 h-5 animate-pulse" />
          Buat Pengumuman
        </button>
      </div>

      {/* AI Insight Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 p-8 opacity-10">
          <Brain className="w-40 h-40 text-white" />
        </div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-300" />
                AI Daily Insight
              </h3>
              <p className="text-blue-100 mt-1">
                Asisten cerdas untuk efisiensi kerja admin.
              </p>
            </div>
            <button
              onClick={generateBriefing}
              disabled={isGeneratingBriefing}
              className="bg-white/20 hover:bg-white/30 px-5 py-2.5 rounded-xl text-sm font-bold backdrop-blur-md transition-colors flex items-center gap-2"
            >
              {isGeneratingBriefing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <BookOpen className="w-4 h-4" />
              )}
              {isGeneratingBriefing ? "Menganalisis..." : "Analisa Harian"}
            </button>
          </div>
          {dailyBriefing && (
            <div className="bg-black/20 p-5 rounded-2xl border border-white/10 backdrop-blur-sm animate-fade-in">
              <div className="prose prose-sm prose-invert max-w-none font-medium whitespace-pre-wrap leading-relaxed">
                {dailyBriefing}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ringkasan Data - Stats Grid */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          Ringkasan Data
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Warga"
            value={stats.residents}
            sub="Kepala Keluarga Terdaftar"
            icon={Users}
            color="bg-blue-500"
          />
          <StatCard
            title="Tagihan Pending"
            value={stats.pendingBills}
            sub="IPL Bulan Ini"
            icon={CreditCard}
            color="bg-orange-500"
          />
          <StatCard
            title="Laporan Terbaru"
            value={stats.openReports}
            sub="Menunggu Respon"
            icon={AlertTriangle}
            color="bg-red-500"
          />
          <StatCard
            title="Status Main Gate"
            value={stats.gateStatus}
            sub="IoT Realtime"
            icon={Shield}
            color={
              stats.gateStatus === "TERBUKA" ? "bg-red-500" : "bg-green-500"
            }
          />
        </div>
      </div>

      {/* Laporan Terbaru Table - Max 3, sorted by date, with status */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Laporan Warga Terbaru
          </h3>
          <span className="text-xs text-slate-400">
            Maksimal 3 laporan terbaru
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Deskripsi
                </th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pelapor
                </th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="text-center p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentReports.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="p-8 text-center text-slate-400 italic"
                  >
                    Tidak ada laporan baru.
                  </td>
                </tr>
              ) : (
                recentReports.map((r) => {
                  const statusBadge = getStatusBadge(r.status);
                  const StatusIcon = statusBadge.icon;

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4">
                        <span className="font-bold text-slate-800">
                          {r.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-slate-600 line-clamp-2 max-w-xs">
                          {r.description}
                        </p>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-slate-800 text-sm">
                            {r.userName}
                          </p>
                          <p className="text-xs text-slate-400">{r.userUnit}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-slate-600">
                          {formatDate(r.createdAt)}
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusBadge.bg} ${statusBadge.text}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusBadge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Broadcast Modal - Pop Up dengan Judul Pengumuman dan Isi Pesan */}
      <BroadcastModal
        isOpen={showBroadcast}
        onClose={() => setShowBroadcast(false)}
        onSubmit={sendBroadcast}
        role={role}
      />
    </div>
  );
};

export default DashboardOverview;
