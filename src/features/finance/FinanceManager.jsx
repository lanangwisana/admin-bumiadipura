import React, { useState, useEffect } from "react";
import {Trash2, Loader2, Sparkles, Receipt, Edit2, CheckCircle, XCircle, ArrowDownLeft, ArrowUpRight, Wallet, Eye, Filter, Clock} from "lucide-react";
import {collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, getDocs, where, getDoc, serverTimestamp, setDoc} from "firebase/firestore";
import { db, APP_ID } from "../../config";
import { StatCard } from "../dashboard/components";
import { usePermissions } from "../../hooks/usePermissions";
import IPLConfiguration from "./IPLConfiguration";

const FinanceManager = ({ user }) => {
  const [transactions, setTransactions] = useState([]);
  const [billings, setBillings] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTransactionId, setEditTransactionId] = useState(null);
  const [formData, setFormData] = useState({
    type: "Pemasukan",
    category: "IPL",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('finance_active_tab');
    if (saved) {
      localStorage.removeItem('finance_active_tab');
      return saved;
    }
    return "cashflow";
  });
  const [generatingBills, setGeneratingBills] = useState(false);
  const [filters, setFilters] = useState({
    type: [],
    category: [],
    startDate: "",
    endDate: "",
  });
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: "", // "verify" | "reject"
    billing: null,
    reason: "",
  });
  const [feedbackModal, setFeedbackModal] = useState({
    isOpen: false,
    type: "success", // success | error
    title: "",
    message: "",
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    transactionId: null,
  });

  const showFeedback = ({
    type = "success",
    title,
    message,
    duration = 2500,
  }) => {
    setFeedbackModal({
      isOpen: true,
      type,
      title,
      message,
    });

    setTimeout(() => {
      setFeedbackModal({
        isOpen: false,
        type: "success",
        title: "",
        message: "",
      });
    }, duration);
  };

  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // PERMISSION SYSTEM
  const perms = usePermissions(user);
  const { canCreate, canEdit, canDelete } = perms.getFeaturePerms("finance");

  // RW: View all, but read-only (no CRUD)
  // RT: Full CRUD for own RT
  const isReadOnly = perms.isRW; // RW is read-only in finance

  // Filter billings for RT - only show their area's residents and unpaid/active bills
  const visibleBillings = (
    perms.isRW
      ? billings
      : billings.filter((b) => {
          const unitLower = (b.unit || "").toLowerCase();
          const rtMatch = `rt${perms.rtNumber}`;

          return (
            unitLower.includes(rtMatch) ||
            unitLower.includes(`rt ${perms.rtNumber}`) ||
            unitLower.includes(`rt0${perms.rtNumber}`)
          );
        })
  ).filter((b) => {
    const isCurrent = b.period === currentPeriod;
    const isUnpaid = b.status !== "PAID";

    const paidThisMonth =
      b.status === "PAID" &&
      b.verifiedAt?.toDate?.()?.toISOString().slice(0, 7) === currentPeriod;

    return isCurrent || isUnpaid || paidThisMonth;
  });

  // TRANSACTIONS
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "artifacts", APP_ID, "public", "data", "transactions"),
      orderBy("date", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      let fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Filter Transactions by Scope
      if (perms.isRT) {
        // RT only sees transactions created by them (scope === rtNumber)
        fetched = fetched.filter((t) => t.rt === perms.rtNumber);
      }
      // RW sees all transactions

      setTransactions(fetched);
    });
    return () => unsub();
  }, [user, perms.isRT, perms.rtNumber]);

  // Transaction Summary
  const totalIncome = transactions
    .filter((t) => t.type === "Pemasukan")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "Pengeluaran")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const categoryOptions = [
    "IPL",
    "Sumbangan",
    "Operasional",
    "Perbaikan",
    "Lainnya",
  ];

  // Handle Submit Transaction
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (parseInt(formData.amount) <= 0) {
        alert("Nominal harus lebih dari 0");
        return;
      }
      if (!formData.description.trim()) {
        alert("Keterangan wajib diisi");
        return;
      }

      const baseData = {
        ...formData,
        amount: parseInt(formData.amount),
        rt: perms.isRW ? null : perms.rtNumber,
        createdBy: user.name || user.label || user.email,
        updatedAt: new Date().toISOString(),
      };

      if (isEditMode && editTransactionId) {
        await updateDoc(
          doc(
            db,
            "artifacts",
            APP_ID,
            "public",
            "data",
            "transactions",
            editTransactionId,
          ),
          baseData,
        );
        showFeedback({
          title: "Berhasil",
          message: isEditMode
            ? "Transaksi berhasil diperbarui"
            : "Transaksi berhasil ditambahkan",
        });
      } else {
        await addDoc(
          collection(db, "artifacts", APP_ID, "public", "data", "transactions"),
          {
            ...baseData,
            createdAt: new Date().toISOString(),
          },
        );
        showFeedback({
          title: "Berhasil",
          message: isEditMode
            ? "Transaksi berhasil diperbarui"
            : "Transaksi berhasil ditambahkan",
        });
      }

      setIsModalOpen(false);
      setIsEditMode(false);
      setEditTransactionId(null);

      setFormData({
        type: "Pemasukan",
        category: "IPL",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menyimpan transaksi");
    }
  };

  const handleEdit = (t) => {
    setFormData({
      type: t.type,
      category: t.category,
      amount: t.amount,
      description: t.description,
      date: t.date,
    });
    setIsEditMode(true);
    setEditTransactionId(t.id);
    setIsModalOpen(true);
  };

  const openDeleteModal = (id) => {
    setDeleteModal({
      isOpen: true,
      transactionId: id,
    });
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(
        doc(
          db,
          "artifacts",
          APP_ID,
          "public",
          "data",
          "transactions",
          deleteModal.transactionId,
        ),
      );

      showFeedback({
        title: "Berhasil",
        message: "Transaksi berhasil dihapus",
      });
    } catch (err) {
      console.error(err);
      showFeedback({
        type: "error",
        title: "Gagal",
        message: "Tidak dapat menghapus transaksi",
      });
    }

    setDeleteModal({
      isOpen: false,
      transactionId: null,
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditTransactionId(null);
    setFormData({
      type: "Pemasukan",
      category: "IPL",
      amount: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  // Filter Transactions
  const filteredTransactions = transactions.filter((t) => {
    if (filters.type.length && !filters.type.includes(t.type)) return false;
    if (filters.category.length && !filters.category.includes(t.category))
      return false;
    if (filters.startDate && t.date < filters.startDate) return false;
    if (filters.endDate && t.date > filters.endDate) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, transactions]);

  // BILLINGS
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "artifacts", APP_ID, "public", "data", "billings"),
      orderBy("period", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setBillings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // Handle Generate Monthly IPL Bills
  const generateMonthlyIPL = async () => {
    try {
      setGeneratingBills(true);

      // Ambil konfigurasi IPL
      const configRef = doc(
        db,
        "artifacts",
        APP_ID,
        "public",
        "data",
        "ipl_config",
        "current",
      );
      const configSnap = await getDoc(configRef);
      if (!configSnap.exists()) {
        showFeedback({
          type: "error",
          title: "Gagal",
          message: "Config IPL belum dibuat",
        });
        return;
      }
      const config = configSnap.data();

      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const residentsSnap = await getDocs(
        collection(db, "artifacts", APP_ID, "public", "data", "residents"),
      );
      const billingRef = collection(
        db,
        "artifacts",
        APP_ID,
        "public",
        "data",
        "billings",
      );

      let createdCount = 0;

      for (const resident of residentsSnap.docs) {
        const residentData = resident.data();
        const rt = residentData.rt;

        const rwFee = Number(config.rwFee || 0); // iuran RW
        const rtFee = Number(config.rtFees?.[rt] || 0); // iuran RT
        const appFee = Number(config.appFee || 0); // biaya aplikasi

        const q = query(
          billingRef,
          where("residentId", "==", resident.id),
          where("period", "==", period),
        );
        const existing = await getDocs(q);
        if (!existing.empty) continue;

        const billingId = `${resident.id}_${period}`;

        await setDoc(
          doc(billingRef, billingId),
          {
            residentId: resident.id,
            residentName: residentData.name,
            unit: residentData.unit,
            rt,
            period,
            breakdown: { rwFee, rtFee, appFee },
            nominal: rwFee + rtFee + appFee,
            status: "UNPAID",
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
        createdCount++;
      }

      showFeedback({
        title: "Berhasil",
        message: `Tagihan berhasil dibuat untuk ${createdCount} warga`,
      });
    } catch (err) {
      console.error(err);
      showFeedback({
        type: "error",
        title: "Gagal",
        message: "Terjadi kesalahan saat membuat tagihan IPL",
      });
    } finally {
      setGeneratingBills(false);
    }
  };

  // Handle Verify / Reject Payment
  const verifyPayment = async (b) => {
    const billingDoc = doc(
      db,
      "artifacts",
      APP_ID,
      "public",
      "data",
      "billings",
      b.id,
    );

    await updateDoc(billingDoc, {
      status: "PAID",
      verifiedAt: serverTimestamp(),
    });

    await addDoc(
      collection(db, "artifacts", APP_ID, "public", "data", "transactions"),
      {
        type: "Pemasukan",
        category: "IPL",
        amount: b.nominal,
        description: `Pembayaran IPL ${b.period} - ${b.residentName}`,
        billingId: b.id,
        createdAt: serverTimestamp(),
        rt: b.rt,
        date: new Date().toISOString().split("T")[0],
      },
    );
  };

  const rejectPayment = async (b, reason) => {
    const billingDoc = doc(
      db,
      "artifacts",
      APP_ID,
      "public",
      "data",
      "billings",
      b.id,
    );

    await updateDoc(billingDoc, {
      status: "REJECTED",
      rejectedReason: reason,
    });
  };

  // Handle Image Modal
  const openProof = (img) => {
    setSelectedImage(img);
    setShowImageModal(true);
  };

  const openActionModal = (billing, type) => {
    setActionModal({
      isOpen: true,
      type,
      billing,
      reason: "",
    });
  };

  const handleActionConfirm = async () => {
    const { billing, type, reason } = actionModal;

    setActionModal({
      isOpen: false,
      type: "",
      billing: null,
      reason: "",
    });

    try {
      if (!billing) return;

      if (type === "verify") {
        await verifyPayment(billing);
        showFeedback({
          title: "Berhasil",
          message: "Pembayaran berhasil diverifikasi",
        });
      }

      if (type === "reject") {
        await rejectPayment(billing, reason);
        showFeedback({
          title: "Pembayaran Ditolak",
          message: "Status pembayaran diperbarui",
        });
      }
    } catch (err) {
      console.error(err);
      showFeedback({
        type: "error",
        title: "Gagal",
        message: "Terjadi kesalahan",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">
          Manajemen Keuangan
        </h2>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("cashflow")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "cashflow" ? "bg-white shadow text-emerald-700" : "text-slate-500"}`}
          >
            Arus Kas
          </button>
          <button
            onClick={() => setActiveTab("bills")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "bills" ? "bg-white shadow text-emerald-700" : "text-slate-500"}`}
          >
            Tagihan IPL
          </button>
          <button
            onClick={() => setActiveTab("ipl-config")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "ipl-config" ? "bg-white shadow text-emerald-700" : "text-slate-500"}`}
          >
            Konfigurasi IPL
          </button>
        </div>
      </div>

      {/* CASHFLOW */}
      {activeTab === "cashflow" && (
        <>
          {/* Read-only Mode Alert for RW */}
          {isReadOnly && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-blue-900 mb-1">
                  Mode Monitoring (Read-Only)
                </h4>
                <p className="text-sm text-blue-700">
                  Anda dapat melihat semua transaksi keuangan dari seluruh RT
                  untuk keperluan monitoring. Untuk menambah atau mengubah data,
                  silakan koordinasi dengan RT terkait.
                </p>
              </div>
            </div>
          )}

          {/* Transaction Summary */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="Total Pemasukan"
                value={`Rp ${totalIncome.toLocaleString()}`}
                icon={ArrowDownLeft}
                color="bg-green-500"
              />

              <StatCard
                title="Total Pengeluaran"
                value={`Rp ${totalExpense.toLocaleString()}`}
                icon={ArrowUpRight}
                color="bg-red-500"
              />

              <StatCard
                title="Saldo Akhir"
                value={`Rp ${balance.toLocaleString()}`}
                icon={Wallet}
                color={balance >= 0 ? "bg-emerald-500" : "bg-red-500"}
              />
            </div>
          </div>

          {/* Add Transaction - Only for RT */}
          {canCreate && !isReadOnly && (
            <div className="flex justify-end mb-2">
              <button
                onClick={() => {
                  setIsEditMode(false);
                  setEditTransactionId(null);
                  setFormData({
                    type: "Pemasukan",
                    category: "IPL",
                    amount: "",
                    description: "",
                    date: new Date().toISOString().split("T")[0],
                  });
                  setIsModalOpen(true);
                }}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
              >
                + Transaksi
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-500 uppercase">
                Filter Transaksi
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filter Type */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">
                  Tipe Transaksi
                </p>
                <div className="flex gap-3">
                  {["Pemasukan", "Pengeluaran"].map((t) => (
                    <label
                      key={t}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer border
              ${
                filters.type.includes(t)
                  ? "bg-emerald-100 border-emerald-400 text-emerald-700"
                  : "bg-slate-100 text-slate-600 border-slate-300"
              }
            `}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={filters.type.includes(t)}
                        onChange={(e) => {
                          setFilters((prev) => ({
                            ...prev,
                            type: e.target.checked
                              ? [...prev.type, t]
                              : prev.type.filter((x) => x !== t),
                          }));
                        }}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>

              {/* Filter Category */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">
                  Kategori
                </p>
                <div className="flex gap-2 flex-wrap">
                  {categoryOptions.map((cat) => (
                    <label
                      key={cat}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer border
              ${
                filters.category.includes(cat)
                  ? "bg-blue-100 border-blue-400 text-blue-700"
                  : "bg-slate-100 border-slate-300 text-slate-600"
              }
            `}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={filters.category.includes(cat)}
                        onChange={(e) => {
                          setFilters((prev) => ({
                            ...prev,
                            category: e.target.checked
                              ? [...prev.category, cat]
                              : prev.category.filter((x) => x !== cat),
                          }));
                        }}
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/*  Filter Date */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">
                Rentang Tanggal
              </p>
              <div className="flex gap-2 max-w-md">
                <input
                  type="date"
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                />
                <input
                  type="date"
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">Tipe</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4">Keterangan</th>
                  <th className="p-4">Jumlah</th>
                  {!isReadOnly && <th className="p-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5 + (!isReadOnly ? 1 : 0)}
                      className="p-8 text-center text-slate-400"
                    >
                      {perms.isRT
                        ? "Belum ada transaksi untuk RT Anda"
                        : "Belum ada transaksi"}
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-slate-50">
                      <td className="p-4">{t.date}</td>
                      <td className="p-4">{t.type}</td>
                      <td className="p-4">{t.category}</td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800">
                          {t.description}
                        </div>
                        {perms.isRW && t.rt && (
                          <div className="text-xs text-slate-500 mt-1">
                            RT {t.rt}
                          </div>
                        )}
                      </td>

                      <td
                        className={`p-4 font-bold whitespace-nowrap ${
                          t.type === "Pemasukan"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {t.type === "Pemasukan" ? "+ " : "- "}
                        Rp {t.amount.toLocaleString()}
                      </td>
                      {!isReadOnly && (
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            {canEdit && (
                              <button
                                onClick={() => handleEdit(t)}
                                className="text-amber-500 hover:text-amber-700 p-2 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Edit transaksi"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => openDeleteModal(t.id)}
                                className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus transaksi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 py-4">
              {/* Prev */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg text-sm font-bold border
        disabled:opacity-40 disabled:cursor-not-allowed
        hover:bg-slate-100"
              >
                ‹
              </button>

              {/* Page Numbers */}
              {Array.from({ length: totalPages }).map((_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg text-sm font-bold border transition
            ${
              currentPage === page
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white hover:bg-slate-100 text-slate-600"
            }`}
                  >
                    {page}
                  </button>
                );
              })}

              {/* Next */}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg text-sm font-bold border
        disabled:opacity-40 disabled:cursor-not-allowed
        hover:bg-slate-100"
              >
                ›
              </button>
            </div>
          )}

          {/* Transaction Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <h3 className="font-bold mb-4">
                  {isEditMode ? "Edit" : "Input"} Transaksi
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isEditMode ? (
                    <input
                      className="w-full p-2 border rounded bg-slate-100 text-slate-500"
                      value={formData.type}
                      readOnly
                    />
                  ) : (
                    <select
                      className="w-full p-2 border rounded"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                    >
                      <option>Pemasukan</option>
                      <option>Pengeluaran</option>
                    </select>
                  )}
                  <select
                    className="w-full p-2 border rounded"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full p-2 border rounded"
                    type="number"
                    placeholder="Nominal"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                  <input
                    className="w-full p-2 border rounded"
                    placeholder="Keterangan"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                  />
                  {isEditMode ? (
                    <input
                      className="w-full p-2 border rounded bg-slate-100 text-slate-500"
                      value={formData.date}
                      readOnly
                    />
                  ) : (
                    <input
                      type="date"
                      className="w-full p-2 border rounded"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                  )}
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 text-white py-2 rounded font-bold"
                  >
                    Simpan
                  </button>

                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full border py-2 rounded font-bold text-slate-500"
                  >
                    Batal
                  </button>
                </form>
              </div>
            </div>
          )}
          {deleteModal.isOpen && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-scale-in">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-red-100 p-2 rounded-full">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>

                  <h3 className="font-bold text-lg text-slate-800">
                    Hapus Transaksi?
                  </h3>
                </div>

                <p className="text-sm text-slate-500 mb-6">
                  Data yang sudah dihapus tidak dapat dikembalikan.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setDeleteModal({
                        isOpen: false,
                        transactionId: null,
                      })
                    }
                    className="flex-1 border rounded-xl py-2 font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Batal
                  </button>

                  <button
                    onClick={confirmDelete}
                    className="flex-1 bg-red-600 text-white rounded-xl py-2 font-bold hover:bg-red-700 transition"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* BILLINGS */}
      {activeTab === "bills" && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              {perms.isRW ? "Manajemen Tagihan IPL" : "Daftar Tagihan IPL"}
            </h3>
            <p className="text-slate-500 mb-4 max-w-md mx-auto">
              {perms.isRW
                ? "Generate tagihan bulanan untuk seluruh warga secara otomatis."
                : `Daftar tagihan warga di wilayah RT ${perms.rtNumber}. Anda dapat melihat siapa saja yang belum bayar untuk ditindaklanjuti.`}
            </p>

            {/* RT Info Badge */}
            {!perms.isRW && (
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <span>👁️ Mode Read-Only</span>
                <span className="text-amber-500">|</span>
                <span>Hanya RW yang dapat mengubah status pembayaran</span>
              </div>
            )}

            {/* Generate Button - Only for RW */}
            {perms.isRW && (
              <button
                onClick={generateMonthlyIPL}
                disabled={generatingBills}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {generatingBills ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                )}
                {generatingBills
                  ? "Sedang Memproses..."
                  : "Buat Tagihan Bulan Ini"}
              </button>
            )}
          </div>

          {/* Billing Table */}
          {visibleBillings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-4">Nama Warga</th>
                    <th className="p-4">Unit</th>
                    <th className="p-4">Periode</th>
                    <th className="p-4 text-center whitespace-nowrap">
                      Nominal
                    </th>
                    <th className="p-4 text-center">Bukti</th>
                    <th className="p-4 text-center">Status</th>
                    {/* Action Button only for RW */}
                    {perms.isRW && <th className="p-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleBillings.map((b) => (
                    <tr key={b.id} className="border-b hover:bg-slate-50">
                      <td className="p-4">{b.residentName}</td>
                      <td className="p-4">{b.unit}</td>
                      <td className="p-4">{b.period}</td>
                      <td className="p-4 text-center whitespace-nowrap">
                        Rp {b.nominal.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {b.paymentProof ? (
                          <button
                            onClick={() => openProof(b.paymentProof)}
                            className="text-xs font-bold text-emerald-600 hover:underline"
                          >
                            <Eye className="inline w-4 h-4 mr-1" />
                            Lihat Bukti
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            Belum Ada
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {b.status === "REJECTED" ? (
                          <div className="relative group inline-block">
                            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 cursor-pointer">
                              <XCircle className="w-4 h-4" />
                              Ditolak
                            </div>

                            {/* TOOLTIP */}
                            {b.rejectedReason && (
                              <div
                                className="
          absolute hidden group-hover:block
          bottom-full left-1/2 -translate-x-1/2 mb-2
          w-56 p-2 rounded-lg
          bg-slate-800 text-white text-xs
          shadow-xl z-50
        "
                              >
                                {b.rejectedReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                              b.status === "PAID"
                                ? "bg-green-100 text-green-700"
                                : b.status === "PENDING_VERIFICATION"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {b.status === "PAID" ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : b.status === "PENDING_VERIFICATION" ? (
                              <Clock className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}

                            <span>
                              {b.status === "PAID"
                                ? "Lunas"
                                : b.status === "PENDING_VERIFICATION"
                                  ? "Menunggu Verifikasi"
                                  : "Belum Lunas"}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Action Button only for RW */}
                      {perms.isRW && (
                        <td className="p-4 text-center">
                          {b.status === "PENDING_VERIFICATION" && (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => openActionModal(b, "verify")}
                                className="px-3 py-1 rounded-lg border border-green-400 bg-green-100 text-green-700 text-xs font-bold hover:bg-green-200 transition"
                              >
                                Tandai Lunas
                              </button>
                              <button
                                onClick={() => openActionModal(b, "reject")}
                                className="px-3 py-1 rounded-lg border border-red-300 text-red-600 text-xs font-bold hover:bg-red-50 transition"
                              >
                                Tolak
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              {perms.isRW
                ? "Belum ada tagihan. Klik tombol di atas untuk generate tagihan bulan ini."
                : `Tidak ada tagihan untuk warga di wilayah RT ${perms.rtNumber}.`}
            </div>
          )}
        </div>
      )}
      {showImageModal && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center"
          onClick={() => {
            setShowImageModal(false);
            setSelectedImage(null);
          }}
        >
          {/* Image Wrapper */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setShowImageModal(false);
                setSelectedImage(null);
              }}
              className="absolute -top-4 -right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white text-lg hover:bg-black transition"
            >
              ✕
            </button>
            <img
              src={selectedImage}
              alt="Bukti Pembayaran"
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* ACTION MODAL */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in">
            <div className="flex flex-col items-center text-center mb-6">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  actionModal.type === "verify" ? "bg-green-100" : "bg-red-100"
                }`}
              >
                {actionModal.type === "verify" ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
              </div>
              {/* TITLE */}
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                {actionModal.type === "verify"
                  ? "Verifikasi Pembayaran"
                  : "Tolak Pembayaran"}
              </h3>
            </div>

            {/* CONTENT */}
            {actionModal.billing && (
              <div className="text-sm space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama</span>
                  <span className="font-semibold">
                    {actionModal.billing.residentName}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Unit</span>
                  <span className="font-semibold">
                    {actionModal.billing.unit}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Periode</span>
                  <span className="font-semibold">
                    {actionModal.billing.period}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Nominal</span>
                  <span className="font-bold text-emerald-600">
                    Rp {actionModal.billing.nominal?.toLocaleString()}
                  </span>
                </div>

                {actionModal.billing.proofImage && (
                  <button
                    onClick={() => openProof(actionModal.billing.paymentProof)}
                    className="text-emerald-600 font-semibold hover:underline mt-2"
                  >
                    Lihat Bukti Bayar
                  </button>
                )}
              </div>
            )}

            {/* WARNING — ONLY VERIFY */}
            {actionModal.type === "verify" && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs mb-4">
                ⚠️ Setelah klik <b>Verifikasi</b>:
                <ul className="list-disc ml-4 mt-1 space-y-1">
                  <li>
                    Transaksi akan otomatis masuk ke pemasukan dan tidak bisa
                    dibatalkan
                  </li>
                  <li>Pastikan pembayaran sudah valid</li>
                </ul>
              </div>
            )}

            {/* REJECT REASON */}
            {actionModal.type === "reject" && (
              <textarea
                placeholder="Masukkan alasan penolakan..."
                className="w-full border rounded-xl p-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-300"
                value={actionModal.reason}
                onChange={(e) =>
                  setActionModal((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
              />
            )}

            {/* BUTTONS */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() =>
                  setActionModal({
                    isOpen: false,
                    billing: null,
                    type: "",
                    reason: "",
                  })
                }
                className="px-4 py-2 rounded-xl border font-semibold hover:bg-slate-50"
              >
                Periksa Lagi
              </button>

              <button
                onClick={handleActionConfirm}
                disabled={
                  actionModal.type === "reject" && !actionModal.reason.trim()
                }
                className={`px-4 py-2 rounded-xl font-bold text-white transition
            ${
              actionModal.type === "verify"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700 disabled:bg-red-300"
            }`}
              >
                {actionModal.type === "verify" ? "Verifikasi" : "Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL */}
      {feedbackModal.isOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div
            className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                feedbackModal.type === "success"
                  ? "bg-emerald-100"
                  : "bg-red-100"
              }`}
            >
              {feedbackModal.type === "success" ? (
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              ) : (
                <XCircle className="w-8 h-8 text-red-600" />
              )}
            </div>

            <h3 className="font-bold text-xl text-slate-800 mb-2">
              {feedbackModal.title}
            </h3>
            <p className="text-sm text-slate-500">{feedbackModal.message}</p>
          </div>
        </div>
      )}

      {/* IPL CONFIG */}
      {activeTab === "ipl-config" && <IPLConfiguration user={user} />}
    </div>
  );
};

export default FinanceManager;
