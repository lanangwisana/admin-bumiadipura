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

  // ========== ROLE-BASED ACCESS CONTROL ==========
  const isRW = role?.type === 'RW';
  
  // Filter billings for RT - only show their area's residents
  // RT01 will only see units containing "RT01" or "RT 01" or "Blok A" etc based on your data structure
  const filteredBillings = isRW 
    ? billings 
    : billings.filter(b => {
        // RT can only see UNPAID bills from their area for follow-up
        // Assuming unit format includes RT info (e.g., "A-01 RT01" or similar)
        // Adjust this logic based on your actual unit format
        const rtNumber = role?.id; // e.g., "01", "02"
        const unitLower = (b.unit || '').toLowerCase();
        const matchesRT = unitLower.includes(`rt${rtNumber}`) || 
                          unitLower.includes(`rt ${rtNumber}`) ||
                          unitLower.includes(`rt0${rtNumber}`);
        return matchesRT;
      });

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
      if (!formData.description.trim()) {
        alert("Keterangan wajib diisi");
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
        alert("Transaksi berhasil diperbarui");
      } else {
        await addDoc(
          collection(db, "artifacts", APP_ID, "public", "data", "transactions"),
          {
            ...baseData,
            createdAt: new Date().toISOString(),
          },
        );
        alert("Transaksi berhasil ditambahkan");
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

  // ========== SEEDER DUMMY DATA (DEVELOPMENT ONLY) ==========
  const [seeding, setSeeding] = useState(false);
  
  const seedDummyBillings = async () => {
    if (!confirm("Ini akan menambahkan data dummy untuk testing. Lanjutkan?")) return;
    
    setSeeding(true);
    try {
      const billingRef = collection(db, "artifacts", APP_ID, "public", "data", "billings");
      const period = new Date().toLocaleDateString("id-ID", {
        month: "2-digit",
        year: "numeric",
      });
      
      // Dummy data dengan berbagai RT untuk testing RBAC
      const dummyResidents = [
        // RT 01
        { name: "Budi Santoso", unit: "A-01 RT01", status: "UNPAID" },
        { name: "Ani Wijaya", unit: "A-02 RT01", status: "PAID" },
        { name: "Candra Putra", unit: "A-03 RT01", status: "UNPAID" },
        // RT 02
        { name: "Dewi Lestari", unit: "B-01 RT02", status: "UNPAID" },
        { name: "Eko Prasetyo", unit: "B-02 RT02", status: "PAID" },
        { name: "Fitri Handayani", unit: "B-03 RT02", status: "UNPAID" },
        // RT 03
        { name: "Gunawan Setiawan", unit: "C-01 RT03", status: "PAID" },
        { name: "Hesti Rahayu", unit: "C-02 RT03", status: "UNPAID" },
        // RT 04
        { name: "Irfan Hakim", unit: "D-01 RT04", status: "UNPAID" },
        { name: "Joko Widodo", unit: "D-02 RT04", status: "PAID" },
      ];
      
      let createdCount = 0;
      
      for (const resident of dummyResidents) {
        await addDoc(billingRef, {
          residentId: `dummy_${resident.name.replace(/\s/g, '_').toLowerCase()}`,
          residentName: resident.name,
          unit: resident.unit,
          period,
          nominal: 150000,
          status: resident.status,
          createdAt: new Date().toISOString(),
          paidAt: resident.status === "PAID" ? new Date().toISOString() : null,
          isDummy: true, // Flag untuk identifikasi data dummy
        });
        createdCount++;
      }
      
      alert(`✅ Berhasil menambahkan ${createdCount} data dummy tagihan!\n\nCoba login sebagai RT01, RT02, dst untuk test filter.`);
    } catch (err) {
      console.error(err);
      alert("Gagal membuat data dummy: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const clearDummyBillings = async () => {
    if (!confirm("Hapus semua data dummy? Data asli tidak akan terhapus.")) return;
    
    setSeeding(true);
    try {
      const billingRef = collection(db, "artifacts", APP_ID, "public", "data", "billings");
      const q = query(billingRef, where("isDummy", "==", true));
      const snapshot = await getDocs(q);
      
      let deletedCount = 0;
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, "artifacts", APP_ID, "public", "data", "billings", docSnap.id));
        deletedCount++;
      }
      
      alert(`🗑️ Berhasil menghapus ${deletedCount} data dummy.`);
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus data dummy: " + err.message);
    } finally {
      setSeeding(false);
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

  const categoryOptions = [
    "IPL",
    "Sumbangan",
    "Operasional",
    "Perbaikan",
    "Lainnya",
  ];

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
        </>
      ) : (
        //    Billing Tab
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              {isRW ? 'Manajemen Tagihan IPL' : 'Daftar Tagihan IPL'}
            </h3>
            <p className="text-slate-500 mb-4 max-w-md mx-auto">
              {isRW 
                ? 'Generate tagihan bulanan untuk seluruh warga secara otomatis.'
                : `Daftar tagihan warga di wilayah RT ${role?.id}. Anda dapat melihat siapa saja yang belum bayar untuk ditindaklanjuti.`
              }
            </p>
            
            {/* RT Info Badge */}
            {!isRW && (
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <span>👁️ Mode Read-Only</span>
                <span className="text-amber-500">|</span>
                <span>Hanya RW yang dapat mengubah status pembayaran</span>
              </div>
            )}
            
            {/* Generate Button - Only for RW */}
            {isRW && (
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
            )}
            
            {/* Seeder Buttons - Development Only - Visible for all roles during testing */}
            <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
              <p className="text-xs text-slate-400 mb-2">🔧 Development Tools (Hapus sebelum production)</p>
              <div className="flex gap-2 justify-center flex-wrap">
                <button
                  onClick={seedDummyBillings}
                  disabled={seeding}
                  className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-purple-200 transition-colors flex items-center gap-1"
                >
                  {seeding ? <Loader2 className="w-3 h-3 animate-spin" /> : "🌱"}
                  Seed Data Dummy
                </button>
                <button
                  onClick={clearDummyBillings}
                  disabled={seeding}
                  className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors flex items-center gap-1"
                >
                  {seeding ? <Loader2 className="w-3 h-3 animate-spin" /> : "🗑️"}
                  Hapus Data Dummy
                </button>
              </div>
              {!isRW && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Anda login sebagai RT {role?.id}. Setelah seed, hanya data RT Anda yang akan muncul.
                </p>
              )}
            </div>
          </div>

          {/* Billing Table */}
          {filteredBillings.length > 0 ? (
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
                    {/* Kolom Aksi hanya untuk RW */}
                    {isRW && <th className="p-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredBillings.map((b) => (
                    <tr key={b.id} className="border-b">
                      <td className="p-4">{b.residentName}</td>
                      <td className="p-4">{b.unit}</td>
                      <td className="p-4">{b.period}</td>
                      <td className="p-4 text-center whitespace-nowrap">
                        Rp {b.nominal.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <div
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                            b.status === "PAID"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {b.status === "PAID" ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          <span>
                            {b.status === "PAID" ? "Lunas" : "Belum Lunas"}
                          </span>
                        </div>
                      </td>
                      {/* Tombol Aksi hanya untuk RW */}
                      {isRW && (
                        <td className="p-4 text-center">
                          {b.status === "UNPAID" ? (
                            <button
                              onClick={() => toggleBillingStatus(b)}
                              className="px-4 py-2 rounded-lg border border-green-400 bg-green-100 text-green-700 text-xs font-bold hover:bg-green-200 transition-colors"
                            >
                              Tandai Lunas
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleBillingStatus(b)}
                              className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-xs font-bold hover:bg-red-50 transition"
                            >
                              Batalkan Lunas
                            </button>
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
              {isRW 
                ? 'Belum ada tagihan. Klik tombol di atas untuk generate tagihan bulan ini.'
                : `Tidak ada tagihan untuk warga di wilayah RT ${role?.id}.`
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinanceManager;
