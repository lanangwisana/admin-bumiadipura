import React, { useState, useEffect } from 'react';
import { UserPlus, X, Trash2, Users, Search, AlertTriangle, Eye, Edit2, Phone, Briefcase, Home } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, APP_ID } from '../../config';

/**
 * Resident Manager Component
 * CRUD operations for resident data (Data Warga)
 */
const ResidentManager = ({ user }) => {
    const [residents, setResidents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ open: false, resident: null });
    const [detailModal, setDetailModal] = useState({ open: false, resident: null });
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ 
        name: '', 
        unit: '', 
        phone: '', 
        job: '', 
        status: 'Tetap', 
        family: [] 
    });
    const [familyTemp, setFamilyTemp] = useState({ name: '', relation: 'Istri' });

    // Realtime listener for residents collection
    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(
            query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'residents'), orderBy('unit')), 
            (s) => setResidents(s.docs.map(d => ({id: d.id, ...d.data()}))),
            (err) => console.log(err)
        ); 
        return () => unsub(); 
    }, [user]);

    // Reset form data
    const resetForm = () => {
        setFormData({ name: '', unit: '', phone: '', job: '', status: 'Tetap', family: [] });
        setFamilyTemp({ name: '', relation: 'Istri' });
        setIsEditMode(false);
        setEditingId(null);
    };

    // Open modal for create
    const openCreateModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    // Open modal for edit
    const openEditModal = (resident) => {
        setFormData({
            name: resident.name || '',
            unit: resident.unit || '',
            phone: resident.phone || '',
            job: resident.job || '',
            status: resident.status || 'Tetap',
            family: resident.family || []
        });
        setEditingId(resident.id);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    // Handle form submit - Create or Update resident
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode && editingId) {
                // Update existing resident
                await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'residents', editingId), {
                    ...formData,
                    updatedAt: new Date().toISOString()
                });
            } else {
                // Create new resident
                await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'residents'), {
                    ...formData,
                    createdAt: new Date().toISOString()
                });
            }
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error('Error saving resident:', error);
            alert('Gagal menyimpan data warga!');
        }
    };

    // Handle delete with confirmation modal
    const handleDelete = async () => { 
        if (!deleteModal.resident) return;
        try {
            await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'residents', deleteModal.resident.id));
            setDeleteModal({ open: false, resident: null });
        } catch (error) {
            console.error('Error deleting resident:', error);
            alert('Gagal menghapus data warga!');
        }
    };
    
    // Add family member to form
    const addFamilyMember = () => {
        if (!familyTemp.name) return;
        setFormData({...formData, family: [...formData.family, familyTemp]});
        setFamilyTemp({ name: '', relation: 'Anak' });
    };

    // Remove family member from form
    const removeFamilyMember = (index) => {
        setFormData({
            ...formData, 
            family: formData.family.filter((_, idx) => idx !== index)
        });
    };

    // Filter residents by search term
    const filteredResidents = residents.filter(r => 
        r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.unit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.phone?.includes(searchTerm)
    );

    // Get relation color
    const getRelationColor = (relation) => {
        switch(relation) {
            case 'Istri': return 'bg-pink-100 text-pink-700';
            case 'Suami': return 'bg-blue-100 text-blue-700';
            case 'Anak': return 'bg-green-100 text-green-700';
            case 'Ortu': return 'bg-purple-100 text-purple-700';
            case 'ART': return 'bg-orange-100 text-orange-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Manajemen Data Warga</h2>
                    <p className="text-slate-500 text-sm">Total {residents.length} kepala keluarga terdaftar</p>
                </div>
                <button 
                    onClick={openCreateModal} 
                    className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 text-sm shadow-lg shadow-emerald-200 flex items-center gap-2 transition-all hover:scale-105"
                >
                    <UserPlus className="w-4 h-4"/> Tambah Warga
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400"/>
                <input 
                    type="text"
                    placeholder="Cari berdasarkan nama, unit, atau kontak..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                />
            </div>
            
            {/* Modal Create/Edit Warga */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">
                                    {isEditMode ? 'Edit Data Warga' : 'Tambah Data Warga'}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {isEditMode ? 'Perbarui data kepala keluarga' : 'Isi data kepala keluarga baru'}
                                </p>
                            </div>
                            <button 
                                onClick={() => { setIsModalOpen(false); resetForm(); }}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500"/>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Nama Kepala Keluarga */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Nama Kepala Keluarga
                                </label>
                                <input 
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                                    placeholder="Masukkan nama lengkap" 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                    required
                                />
                            </div>

                            {/* Unit/Blok */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Unit / Blok
                                </label>
                                <input 
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                                    placeholder="Contoh: A1/18, B2/05" 
                                    value={formData.unit} 
                                    onChange={e => setFormData({...formData, unit: e.target.value})} 
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* No. HP/WA */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        No. HP / WA
                                    </label>
                                    <input 
                                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                                        placeholder="08xxxxxxxxxx" 
                                        value={formData.phone} 
                                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                                        required
                                    />
                                </div>

                                {/* Pekerjaan */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Pekerjaan <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                        value={['Wiraswasta', 'PNS', 'TNI/Polri', 'Karyawan Swasta', 'Guru/Dosen', 'Dokter', 'Mahasiswa', 'Pelajar', 'Ibu Rumah Tangga', 'Pensiunan', 'Tidak Bekerja'].includes(formData.job) ? formData.job : (formData.job === '' ? '' : '_CUSTOM_')}
                                        onChange={e => {
                                            if (e.target.value === '_CUSTOM_') {
                                                setFormData({...formData, job: ' '});
                                            } else {
                                                setFormData({...formData, job: e.target.value});
                                            }
                                        }}
                                        required
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
                                        <option value="_CUSTOM_">Lainnya</option>
                                    </select>
                                    {/* Show text input if 'Lainnya' selected or custom value */}
                                    {formData.job !== '' && !['Wiraswasta', 'PNS', 'TNI/Polri', 'Karyawan Swasta', 'Guru/Dosen', 'Dokter', 'Mahasiswa', 'Pelajar', 'Ibu Rumah Tangga', 'Pensiunan', 'Tidak Bekerja'].includes(formData.job) && (
                                        <input 
                                            className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none mt-2" 
                                            placeholder="Tulis pekerjaan..." 
                                            value={formData.job.trim()} 
                                            onChange={e => setFormData({...formData, job: e.target.value || ' '})}
                                            required
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Status Hunian
                                </label>
                                <select 
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                                    value={formData.status} 
                                    onChange={e => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="Tetap">Tetap</option>
                                    <option value="Kontrak">Kontrak</option>
                                    <option value="Kos">Kos</option>
                                </select>
                            </div>
                            
                            {/* Anggota Keluarga */}
                            <div className="border-t border-slate-200 pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="w-4 h-4 text-slate-500"/>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Anggota Keluarga</p>
                                </div>
                                <div className="flex gap-2 mb-3">
                                    <input 
                                        className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none" 
                                        placeholder="Nama anggota keluarga" 
                                        value={familyTemp.name} 
                                        onChange={e => setFamilyTemp({...familyTemp, name: e.target.value})}
                                    />
                                    <select 
                                        className="p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none" 
                                        value={familyTemp.relation} 
                                        onChange={e => setFamilyTemp({...familyTemp, relation: e.target.value})}
                                    >
                                        <option value="Istri">Istri</option>
                                        <option value="Suami">Suami</option>
                                        <option value="Anak">Anak</option>
                                        <option value="Ortu">Ortu</option>
                                        <option value="ART">ART</option>
                                    </select>
                                    <button 
                                        type="button" 
                                        onClick={addFamilyMember} 
                                        className="bg-slate-800 text-white px-4 rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors"
                                    >
                                        Tambah
                                    </button>
                                </div>
                                {/* Family List */}
                                <div className="space-y-2">
                                    {formData.family.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-2">Belum ada anggota keluarga</p>
                                    ) : (
                                        formData.family.map((f, i) => (
                                            <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <div>
                                                    <span className="text-sm font-medium text-slate-800">{f.name}</span>
                                                    <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${getRelationColor(f.relation)}`}>
                                                        {f.relation}
                                                    </span>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeFamilyMember(i)} 
                                                    className="text-red-500 hover:text-red-700 text-xs font-bold"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button 
                                type="submit" 
                                className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                            >
                                {isEditMode ? 'Simpan Perubahan' : 'Simpan Data Warga'}
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
                                <h3 className="font-bold text-lg text-slate-800">Detail Data Warga</h3>
                                <p className="text-sm text-slate-500">Informasi lengkap kepala keluarga</p>
                            </div>
                            <button 
                                onClick={() => setDetailModal({ open: false, resident: null })}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500"/>
                            </button>
                        </div>

                        {/* Resident Info */}
                        <div className="space-y-4">
                            {/* Header Card */}
                            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
                                <h4 className="font-bold text-xl">{detailModal.resident.name}</h4>
                                <div className="flex items-center gap-2 mt-2 opacity-90">
                                    <Home className="w-4 h-4"/>
                                    <span className="text-sm">Unit {detailModal.resident.unit}</span>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                                        <Phone className="w-4 h-4"/>
                                        <span className="text-xs font-bold uppercase">Kontak</span>
                                    </div>
                                    <p className="font-bold text-slate-800 font-mono">{detailModal.resident.phone}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                                        <Briefcase className="w-4 h-4"/>
                                        <span className="text-xs font-bold uppercase">Pekerjaan</span>
                                    </div>
                                    <p className="font-bold text-slate-800">{detailModal.resident.job || '-'}</p>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <span className="text-xs font-bold uppercase text-slate-500">Status Hunian</span>
                                <div className="mt-2">
                                    <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                                        detailModal.resident.status === 'Tetap' ? 'bg-green-100 text-green-700' :
                                        detailModal.resident.status === 'Kontrak' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {detailModal.resident.status}
                                    </span>
                                </div>
                            </div>

                            {/* Family Members */}
                            <div className="border-t border-slate-200 pt-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-5 h-5 text-emerald-600"/>
                                        <h5 className="font-bold text-slate-800">Anggota Keluarga</h5>
                                    </div>
                                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                                        {(detailModal.resident.family?.length || 0) + 1} Orang
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {/* Kepala Keluarga */}
                                    <div className="flex items-center gap-3 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                        <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                                            {detailModal.resident.name?.charAt(0) || 'K'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-800">{detailModal.resident.name}</p>
                                            <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                                                Kepala Keluarga
                                            </span>
                                        </div>
                                    </div>

                                    {/* Family Members */}
                                    {detailModal.resident.family?.length > 0 ? (
                                        detailModal.resident.family.map((member, idx) => (
                                            <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-white font-bold">
                                                    {member.name?.charAt(0) || '?'}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-800">{member.name}</p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRelationColor(member.relation)}`}>
                                                        {member.relation}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-slate-400 text-sm py-4">Tidak ada anggota keluarga lain</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => {
                                    setDetailModal({ open: false, resident: null });
                                    openEditModal(detailModal.resident);
                                }}
                                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Edit2 className="w-4 h-4"/> Edit Data
                            </button>
                            <button 
                                onClick={() => setDetailModal({ open: false, resident: null })}
                                className="flex-1 py-3 px-4 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
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
                                <AlertTriangle className="w-8 h-8 text-red-600"/>
                            </div>
                            <h3 className="font-bold text-lg text-slate-800 mb-2">Konfirmasi Hapus</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                Apakah Anda yakin ingin menghapus data warga <br/>
                                <span className="font-bold text-slate-800">{deleteModal.resident?.name}</span> - Unit <span className="font-bold">{deleteModal.resident?.unit}</span>?
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setDeleteModal({ open: false, resident: null })}
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
                                <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Unit/Blok</th>
                                <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Kepala Keluarga</th>
                                <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Kontak</th>
                                <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Pekerjaan</th>
                                <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-center">Jml Anggota</th>
                                <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredResidents.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400">
                                        {searchTerm ? 'Tidak ada data yang cocok dengan pencarian' : 'Belum ada data warga'}
                                    </td>
                                </tr>
                            ) : (
                                filteredResidents.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                                                {r.unit}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{r.name}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    r.status === 'Tetap' ? 'bg-green-100 text-green-700' :
                                                    r.status === 'Kontrak' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {r.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-slate-600 font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                                                {r.phone}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-600">{r.job || '-'}</td>
                                        <td className="p-4 text-center">
                                            <span className="bg-slate-100 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700">
                                                {(r.family?.length || 0) + 1} Org
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-1">
                                                {/* View Button */}
                                                <button 
                                                    onClick={() => setDetailModal({ open: true, resident: r })} 
                                                    className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Lihat detail & anggota keluarga"
                                                >
                                                    <Eye className="w-4 h-4"/>
                                                </button>
                                                {/* Edit Button */}
                                                <button 
                                                    onClick={() => openEditModal(r)} 
                                                    className="text-amber-500 hover:text-amber-700 p-2 hover:bg-amber-50 rounded-lg transition-colors"
                                                    title="Edit data warga"
                                                >
                                                    <Edit2 className="w-4 h-4"/>
                                                </button>
                                                {/* Delete Button */}
                                                <button 
                                                    onClick={() => setDeleteModal({ open: true, resident: r })} 
                                                    className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Hapus data warga"
                                                >
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
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
