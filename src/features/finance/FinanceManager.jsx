import React, { useState, useEffect } from "react";
import {Trash2, Loader2, Sparkles, Receipt, Edit2, CheckCircle, XCircle, ArrowDownLeft, ArrowUpRight, Wallet} from "lucide-react";
import {collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, getDocs, where} from "firebase/firestore";
import { db, APP_ID } from "../../config";
import { StatCard } from '../dashboard/components';

const FinanceManager = ({ role, user }) => {
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
  const [activeTab, setActiveTab] = useState("cashflow");
  const [generatingBills, setGeneratingBills] = useState(false);

  //    Arus Kas: realtime fetch
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "artifacts", APP_ID, "public", "data", "transactions"),
      orderBy("date", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  //    Billing: realtime fetch
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

  //    Handlers Arus Kas
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (parseInt(formData.amount) <= 0) {
        alert("Nominal harus lebih dari 0");
        return;
      }

      const baseData = {
        ...formData,
        amount: parseInt(formData.amount),
        scope: role.type === "RW" ? "RW" : role.id,
        createdBy: role.label,
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
      } else {
        await addDoc(
          collection(db, "artifacts", APP_ID, "public", "data", "transactions"),
          {
            ...baseData,
            createdAt: new Date().toISOString(),
          },
        );
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

  const handleDelete = async (id) => {
    if (!confirm("Hapus transaksi?")) return;
    try {
      await deleteDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "transactions", id),
      );
    } catch (err) {
      console.error(err);
      alert("Gagal hapus transaksi");
    }
  };

  //    Generate Billing IPL
  const generateMonthlyIPL = async () => {
    try {
      setGeneratingBills(true);

      const period = new Date().toLocaleDateString("id-ID", {
        month: "2-digit",
        year: "numeric",
      });

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
        const q = query(
          billingRef,
          where("residentId", "==", resident.id),
          where("period", "==", period),
        );

        const existing = await getDocs(q);

        if (!existing.empty) continue;

        await addDoc(billingRef, {
          residentId: resident.id,
          residentName: resident.data().name,
          unit: resident.data().unit,
          period,
          nominal: 150000,
          status: "UNPAID",
          createdAt: new Date().toISOString(),
        });

        createdCount++;
      }

      alert(`Berhasil generate tagihan untuk ${createdCount} warga`);
    } catch (err) {
      console.error(err);
      alert("Gagal generate tagihan IPL");
    } finally {
      setGeneratingBills(false);
    }
  };

  //    Toggle Billing Status
  const toggleBillingStatus = async (b) => {
    try {
      await updateDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "billings", b.id),
        {
          status: b.status === "UNPAID" ? "PAID" : "UNPAID",
          paidAt: b.status === "UNPAID" ? new Date().toISOString() : null,
        },
      );
    } catch (err) {
      console.error(err);
      alert("Gagal ubah status billing");
    }
  };

  //    Totals
  const totalIncome = transactions
    .filter((t) => t.type === "Pemasukan")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "Pengeluaran")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

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
        </div>
      </div>

      {activeTab === "cashflow" ? (
        <>
          {/* Ringkasan Keuangan */}
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

          {/* Add Transaction */}
          <div className="flex justify-end mb-2">
            <button
              onClick={() => {
                setIsModalOpen(true);
                setIsEditMode(false);
              }}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold"
            >
              + Transaksi
            </button>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">Keterangan</th>
                  <th className="p-4 text-right">Jumlah</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b">
                    <td className="p-4">{t.date}</td>
                    <td className="p-4">{t.description}</td>
                    <td
                      className={`p-4 text-right font-bold ${t.type === "Pemasukan" ? "text-green-600" : "text-red-600"}`}
                    >
                      Rp {t.amount.toLocaleString()}
                    </td>
                    <td className="p-4 text-center flex justify-center gap-2">
                      <button
                        onClick={() => handleEdit(t)}
                        className="text-amber-500 hover:text-amber-700 p-2 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit transaksi"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus transaksi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <h3 className="font-bold mb-4">
                  {isEditMode ? "Edit" : "Input"} Transaksi
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                  />
                  <input
                    className="w-full p-2 border rounded"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 text-white py-2 rounded font-bold"
                  >
                    Simpan
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full border py-2 rounded font-bold text-slate-500"
                  >
                    Batal
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        //    Billing Tab
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              Manajemen Tagihan IPL
            </h3>
            <p className="text-slate-500 mb-4 max-w-md mx-auto">
              Generate tagihan bulanan untuk seluruh warga secara otomatis.
            </p>
            <button
              onClick={generateMonthlyIPL}
              disabled={generatingBills}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2 mx-auto"
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
          </div>

          {/* Billing Table */}
          {billings.length > 0 && (
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
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {billings.map((b) => (
                    <tr key={b.id} className="border-b">
                      <td className="p-4">{b.residentName}</td>
                      <td className="p-4">{b.unit}</td>
                      <td className="p-4">{b.period}</td>
                      <td className="p-4 text-center whitespace-nowrap">
                        Rp {b.nominal.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-bold ${
                            b.status === "PAID"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {b.status === "PAID" ? "Lunas" : "Belum Lunas"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          {b.status === "UNPAID" ? (
                            <button
                              onClick={() => toggleBillingStatus(b)}
                              className="flex items-center gap-1 text-green-600 hover:text-green-800 text-xs font-semibold"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Tandai Lunas</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleBillingStatus(b)}
                              className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-semibold"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Batalkan</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinanceManager;
