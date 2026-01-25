import React, { useState, useEffect } from 'react';
import { Trash2, Loader2, Sparkles, Receipt } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db, APP_ID } from '../../config';

const FinanceManager = ({ role, user }) => {
    const [transactions, setTransactions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ 
        type: 'Pemasukan', 
        category: 'IPL', 
        amount: '', 
        description: '', 
        date: new Date().toISOString().split('T')[0] 
    });
    const [activeTab, setActiveTab] = useState('cashflow');
    const [generatingBills, setGeneratingBills] = useState(false);

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(
            query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'transactions'), orderBy('date', 'desc')), 
            (s) => setTransactions(s.docs.map(d => ({id: d.id, ...d.data()})))
        );
        return () => unsub();
    }, [user]);

    const handleSubmit = async (e) => { 
        e.preventDefault(); 
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'transactions'), { 
            ...formData, 
            amount: parseInt(formData.amount), 
            scope: role.type === 'RW' ? 'RW' : role.id, 
            createdBy: role.label 
        }); 
        setIsModalOpen(false); 
    };

    const handleDelete = async (id) => { 
        if (confirm('Hapus transaksi?')) {
            await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'transactions', id)); 
        }
    };
    
    const generateMonthlyIPL = async () => {
        setGeneratingBills(true);
        const residentsSnap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'residents'));
        // Simulation: In real app, batch write to billing collection
        alert(`Tagihan IPL berhasil dibuat untuk ${residentsSnap.size} warga!`);
        setGeneratingBills(false);
    };

    const totalIncome = transactions.filter(t => t.type === 'Pemasukan').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'Pengeluaran').reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Manajemen Keuangan</h2>
                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('cashflow')} 
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            activeTab === 'cashflow' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'
                        }`}
                    >
                        Arus Kas
                    </button>
                    <button 
                        onClick={() => setActiveTab('bills')} 
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            activeTab === 'bills' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'
                        }`}
                    >
                        Tagihan IPL
                    </button>
                </div>
            </div>

            {activeTab === 'cashflow' ? (
                <>
                    <div className="flex justify-end">
                        <button 
                            onClick={() => setIsModalOpen(true)} 
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
                                    <th className="p-4">Ket</th>
                                    <th className="p-4 text-right">Jumlah</th>
                                    <th className="p-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(t => (
                                    <tr key={t.id} className="border-b">
                                        <td className="p-4">{t.date}</td>
                                        <td className="p-4">{t.description}</td>
                                        <td className={`p-4 text-right font-bold ${
                                            t.type === 'Pemasukan' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            Rp {t.amount.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => handleDelete(t.id)}>
                                                <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Transaction Modal */}
                    {isModalOpen && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                                <h3 className="font-bold mb-4">Input Transaksi</h3>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <select 
                                        className="w-full p-2 border rounded"
                                        value={formData.type}
                                        onChange={e => setFormData({...formData, type: e.target.value})}
                                    >
                                        <option>Pemasukan</option>
                                        <option>Pengeluaran</option>
                                    </select>
                                    <input 
                                        className="w-full p-2 border rounded" 
                                        type="number" 
                                        placeholder="Nominal" 
                                        value={formData.amount}
                                        onChange={e => setFormData({...formData, amount: e.target.value})} 
                                        required
                                    />
                                    <input 
                                        className="w-full p-2 border rounded" 
                                        placeholder="Keterangan" 
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
                                    <input 
                                        className="w-full p-2 border rounded" 
                                        type="date" 
                                        value={formData.date}
                                        onChange={e => setFormData({...formData, date: e.target.value})}
                                    />
                                    <button className="w-full bg-emerald-600 text-white py-2 rounded font-bold">
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
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Receipt className="w-8 h-8"/>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Manajemen Tagihan IPL</h3>
                    <p className="text-slate-500 mb-6 max-w-md mx-auto">
                        Generate tagihan bulanan untuk seluruh warga secara otomatis.
                    </p>
                    <button 
                        onClick={generateMonthlyIPL} 
                        disabled={generatingBills} 
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2 mx-auto"
                    >
                        {generatingBills ? <Loader2 className="w-5 h-5 animate-spin"/> : <Sparkles className="w-5 h-5 text-yellow-300"/>}
                        {generatingBills ? 'Sedang Memproses...' : 'Buat Tagihan Bulan Ini'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default FinanceManager;
