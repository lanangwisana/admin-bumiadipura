import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, FileCheck, Filter, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db, APP_ID } from '../../config';

const ReportPermitManager = ({ user }) => {
  const [activeTab, setActiveTab] = useState("reports");
  const [statusFilter, setStatusFilter] = useState("active"); // 'all' | 'active' | 'done'
  const [data, setData] = useState([]);
  const [rejectReason, setRejectReason] = useState({});
  const [showRejectInput, setShowRejectInput] = useState({});

  useEffect(() => {
    if (!user) return;
    const colName = activeTab === "reports" ? "reports" : "permits";
    const unsub = onSnapshot(
      query(
        collection(db, "artifacts", APP_ID, "public", "data", colName),
        orderBy("createdAt", "desc"),
      ),
      (s) => setData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
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
          item.status === "PENDING",
      );
    } else if (statusFilter === "done") {
      result = data.filter(
        (item) =>
          item.status === "DONE" ||
          item.status === "APPROVED" ||
          item.status === "REJECTED",
      );
    }

    return result.sort((a, b) => {
      const dateA = a.createdAt.seconds
        ? a.createdAt.seconds
        : new Date(a.createdAt).getTime() / 1000;
      const dateB = b.createdAt.seconds
        ? b.createdAt.seconds
        : new Date(b.createdAt).getTime() / 1000;
      return dateB - dateA;
    });
  }, [data, statusFilter]);

  const updateStatus = async (id, status, reason = "") => {
    const confirmText =
      status === "IN_PROGRESS"
        ? "Mulai proses laporan ini?"
        : status === "DONE"
          ? "Tandai laporan ini sebagai selesai?"
          : status === "APPROVED"
            ? "Setujui permohonan ini?"
            : status === "REJECTED"
              ? "Tolak permohonan ini?"
              : "Lanjutkan aksi ini?";

    const ok = window.confirm(confirmText);
    if (!ok) return;

    try {
      const colName = activeTab === "reports" ? "reports" : "permits";
      const payload = { status };

      if (status === "REJECTED" && reason) {
        payload.rejectReason = reason;
      }

      await updateDoc(
        doc(db, "artifacts", APP_ID, "public", "data", colName, id),
        payload,
      );

      window.alert("Berhasil memperbarui status");
    } catch (err) {
      console.error(err);
      window.alert("Gagal memperbarui status");
    }
  };

  // Get status counts for badges
  const statusCounts = useMemo(
    () => ({
      all: data.length,
      active: data.filter(
        (item) =>
          item.status === "OPEN" ||
          item.status === "IN_PROGRESS" ||
          item.status === "PENDING",
      ).length,
      done: data.filter(
        (item) =>
          item.status === "DONE" ||
          item.status === "APPROVED" ||
          item.status === "REJECTED",
      ).length,
    }),
    [data],
  );

  // Get status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case "OPEN":
      case "PENDING":
        return {
          bg: "bg-red-100",
          text: "text-red-700",
          icon: AlertCircle,
          label: status === "OPEN" ? "Menunggu" : "Pending",
        };
      case "IN_PROGRESS":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-700",
          icon: Clock,
          label: "Diproses",
        };
      case "DONE":
      case "APPROVED":
        return {
          bg: "bg-green-100",
          text: "text-green-700",
          icon: CheckCircle,
          label: status === "DONE" ? "Selesai" : "Disetujui",
        };
      case "REJECTED":
        return {
          bg: "bg-gray-100",
          text: "text-gray-700",
          icon: AlertCircle,
          label: "Ditolak",
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

  const getReportIconStyle = (category = "") => {
    const key = category.toLowerCase();
    if (key.includes("keamanan")) {
      return "bg-red-100 text-red-600";
    }
    if (key.includes("kebersihan")) {
      return "bg-green-100 text-green-600";
    }
    if (key.includes("infrastruktur")) {
      return "bg-yellow-100 text-yellow-700";
    }
    return "bg-slate-100 text-slate-600";
  };

  const formatDate = (date) => {
    if (!date) return "-";

    let d;

    if (date.seconds) {
      d = new Date(date.seconds * 1000);
    } else {
      d = new Date(date);
    }

    if (isNaN(d)) return "-";

    const day = d.getDate();
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${day} ${month} ${year}, ${hours}.${minutes}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">
          Pusat Layanan Warga
        </h2>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "reports"
                ? "bg-white shadow text-emerald-700"
                : "text-slate-500"
            }`}
          >
            Keluhan / Laporan
          </button>
          <button
            onClick={() => setActiveTab("permits")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "permits"
                ? "bg-white shadow text-emerald-700"
                : "text-slate-500"
            }`}
          >
            Surat & Izin
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Filter Status
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              statusFilter === "all"
                ? "bg-slate-800 text-white shadow-lg"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Semua
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                statusFilter === "all" ? "bg-white/20" : "bg-slate-200"
              }`}
            >
              {statusCounts.all}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              statusFilter === "active"
                ? "bg-orange-500 text-white shadow-lg shadow-orange-200"
                : "bg-orange-50 text-orange-600 hover:bg-orange-100"
            }`}
          >
            <Clock className="w-4 h-4" />
            Aktif
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                statusFilter === "active" ? "bg-white/20" : "bg-orange-100"
              }`}
            >
              {statusCounts.active}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter("done")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              statusFilter === "done"
                ? "bg-green-500 text-white shadow-lg shadow-green-200"
                : "bg-green-50 text-green-600 hover:bg-green-100"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Selesai
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                statusFilter === "done" ? "bg-white/20" : "bg-green-100"
              }`}
            >
              {statusCounts.done}
            </span>
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="grid gap-4">
        {filteredData.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
            <p className="text-slate-400 italic">
              {statusFilter === "done"
                ? "Belum ada laporan yang selesai."
                : statusFilter === "active"
                  ? "Tidak ada laporan aktif."
                  : "Belum ada data."}
            </p>
          </div>
        ) : (
          filteredData.map((item) => {
            const statusBadge = getStatusBadge(item.status);
            const StatusIcon = statusBadge.icon;

            return (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-center"
              >
                {/* Status Icon */}
                <div
                  className={`p-3 rounded-full ${
                    activeTab === "reports"
                      ? getReportIconStyle(item.category)
                      : `${statusBadge.bg} ${statusBadge.text}`
                  }`}
                >
                  {activeTab === "reports" ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <FileCheck className="w-6 h-6" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusBadge.bg} ${statusBadge.text} flex items-center gap-1`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusBadge.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800">
                    {activeTab === "reports" ? item.category : item.type}
                  </h3>
                  <p className="text-sm text-slate-600">{item.description}</p>
                  {item.eventDate && (
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Tanggal Acara: {formatDate(item.eventDate)}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Warga: {item.userName} ({item.userUnit})
                  </p>
                  {item.isBlockingRoad && (
                    <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 rounded mt-1 inline-block">
                      ⚠️ Menutup Jalan
                    </span>
                  )}
                  {item.status === "REJECTED" && item.rejectReason && (
                    <p className="text-xs text-red-600 mt-1 font-mono">
                      Alasan: {item.rejectReason}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {activeTab === "reports" && (
                    <>
                      {item.status === "OPEN" && (
                        <button
                          onClick={() => updateStatus(item.id, "IN_PROGRESS")}
                          className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold hover:bg-yellow-200 transition-colors"
                        >
                          Mulai Proses
                        </button>
                      )}

                      {item.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => updateStatus(item.id, "DONE")}
                          className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors"
                        >
                          Tandai Selesai
                        </button>
                      )}
                      {item.status === "DONE" && (
                        <div className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold">
                          <span>Selesai</span>
                        </div>
                      )}
                    </>
                  )}
                  <>
                    {activeTab === "permits" &&
                      (item.status === "PENDING" || item.status === "OPEN") && (
                        <div className="flex flex-col gap-2">
                          {!showRejectInput[item.id] ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  setShowRejectInput((prev) => ({
                                    ...prev,
                                    [item.id]: true,
                                  }))
                                }
                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                              >
                                Tolak
                              </button>
                              <button
                                onClick={() =>
                                  updateStatus(item.id, "APPROVED")
                                }
                                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors"
                              >
                                Setujui
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Alasan penolakan (opsional)"
                                value={rejectReason[item.id] || ""}
                                onChange={(e) =>
                                  setRejectReason((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                className="px-3 py-1 rounded-lg border border-slate-300 text-xs
             w-48 md:w-56"
                              />
                              <button
                                onClick={() => {
                                  updateStatus(
                                    item.id,
                                    "REJECTED",
                                    rejectReason[item.id],
                                  );
                                  setShowRejectInput((prev) => ({
                                    ...prev,
                                    [item.id]: false,
                                  }));
                                  setRejectReason((prev) => ({
                                    ...prev,
                                    [item.id]: "",
                                  }));
                                }}
                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                              >
                                Konfirmasi Tolak
                              </button>
                              <button
                                onClick={() =>
                                  setShowRejectInput((prev) => ({
                                    ...prev,
                                    [item.id]: false,
                                  }))
                                }
                                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                              >
                                Batal
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    {item.status === "APPROVED" && (
                      <span className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold">
                        Disetujui
                      </span>
                    )}
                    {item.status === "REJECTED" && (
                      <span className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold">
                        Ditolak
                      </span>
                    )}
                  </>
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
