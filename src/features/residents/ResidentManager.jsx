import React, { useState, useEffect } from 'react';
import { UserPlus, X, Trash2 } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, APP_ID } from '../../config';

const ResidentManager = ({ user }) => {
    const [residents, setResidents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ 
        name: '', 
        unit: '', 
        phone: '', 
        job: '', 
        status: 'Tetap', 
        family: [] 
    });
    const [familyTemp, setFamilyTemp] = useState({ name: '', relation: 'Istri' });

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(
            query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'residents'), orderBy('unit')), 
            (s) => setResidents(s.docs.map(d => ({id: d.id, ...d.data()}))),
            (err) => console.log(err)
        ); 
        return () => unsub(); 
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'residents'), formData);
        setIsModalOpen(false); 
        setFormData({ name: '', unit: '', phone: '', job: '', status: 'Tetap', family: [] });
        alert("Warga berhasil ditambahkan!");
    };

    const handleDelete = async (id) => { 
        if (confirm('Hapus data warga ini?')) {
            await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'residents', id)); 
        }
    };
    
    const addFamilyMember = () => {
        if (!familyTemp.name) return;
        setFormData({...formData, family: [...formData.family, familyTemp]});
        setFamilyTemp({ name: '', relation: 'Anak' });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Data Warga</h2>
                <button 
                    onClick={() => setIsModalOpen(true)} 
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 text-sm shadow-md flex items-center gap-2"
                >
                    <UserPlus className="w-4 h-4"/> Tambah Warga
                </button>
            </div>
            
            {/* Modal Input Warga */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg">Input Data Warga</h3>
                            <button onClick={() => setIsModalOpen(false)}>
                                <X className="w-5 h-5 text-gray-500"/>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input 
                                    className="p-3 border rounded-xl bg-gray-50 text-sm" 
                                    placeholder="Nama Kepala Keluarga" 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                    required
                                />
                                <input 
                                    className="p-3 border rounded-xl bg-gray-50 text-sm" 
                                    placeholder="Unit / Blok" 
                                    value={formData.unit} 
                                    onChange={e => setFormData({...formData, unit: e.target.value})} 
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input 
                                    className="p-3 border rounded-xl bg-gray-50 text-sm" 
                                    placeholder="No. HP / WA" 
                                    value={formData.phone} 
                                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                                    required
                                />
                                <input 
                                    className="p-3 border rounded-xl bg-gray-50 text-sm" 
                                    placeholder="Pekerjaan" 
                                    value={formData.job} 
                                    onChange={e => setFormData({...formData, job: e.target.value})}
                                />
                            </div>
                            <select 
                                className="w-full p-3 border rounded-xl bg-gray-50 text-sm" 
                                value={formData.status} 
                                onChange={e => setFormData({...formData, status: e.target.value})}
                            >
                                <option>Tetap</option>
                                <option>Kontrak</option>
                                <option>Kos</option>
                            </select>
                            
                            {/* Family Members */}
                            <div className="border-t pt-4">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Anggota Keluarga</p>
                                <div className="flex gap-2 mb-2">
                                    <input 
                                        className="flex-1 p-2 border rounded-lg text-sm" 
                                        placeholder="Nama" 
                                        value={familyTemp.name} 
                                        onChange={e => setFamilyTemp({...familyTemp, name: e.target.value})}
                                    />
                                    <select 
                                        className="p-2 border rounded-lg text-sm" 
                                        value={familyTemp.relation} 
                                        onChange={e => setFamilyTemp({...familyTemp, relation: e.target.value})}
                                    >
                                        <option>Istri</option>
                                        <option>Suami</option>
                                        <option>Anak</option>
                                        <option>Ortu</option>
                                        <option>ART</option>
                                    </select>
                                    <button 
                                        type="button" 
                                        onClick={addFamilyMember} 
                                        className="bg-slate-800 text-white px-3 rounded-lg text-xs font-bold"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {formData.family.map((f, i) => (
                                        <div key={i} className="flex justify-between bg-gray-50 p-2 rounded text-xs">
                                            <span>{f.name} ({f.relation})</span>
                                            <button 
                                                type="button" 
                                                onClick={() => setFormData({
                                                    ...formData, 
                                                    family: formData.family.filter((_, idx) => idx !== i)
                                                })} 
                                                className="text-red-500"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">
                                Simpan Data
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Residents Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="p-4">Unit</th>
                            <th className="p-4">Kepala Keluarga</th>
                            <th className="p-4">Kontak</th>
                            <th className="p-4">Pekerjaan</th>
                            <th className="p-4">Jml Anggota</th>
                            <th className="p-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {residents.map(r => (
                            <tr key={r.id} className="border-b hover:bg-slate-50">
                                <td className="p-4 font-bold">{r.unit}</td>
                                <td className="p-4">
                                    <div className="font-bold text-slate-800">{r.name}</div>
                                    <div className="text-[10px] text-slate-500">{r.status}</div>
                                </td>
                                <td className="p-4 text-slate-600 font-mono">{r.phone}</td>
                                <td className="p-4 text-slate-600">{r.job || '-'}</td>
                                <td className="p-4 text-center">
                                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">
                                        {(r.family?.length || 0) + 1} Org
                                    </span>
                                </td>
                                <td className="p-4 text-center">
                                    <button 
                                        onClick={() => handleDelete(r.id)} 
                                        className="text-red-400 hover:text-red-600 p-2"
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ResidentManager;
