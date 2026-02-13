import React, { useState, useEffect } from 'react';
import { Trash2, Mail, User, Shield, AlertCircle, Lock, Eye, EyeOff, Loader2, CheckCircle, Pencil, Save, X } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, APP_ID, secondaryAuth } from '../../config';

const EditUserModal = ({ user, onClose, onUpdate, isProcessing, existingUsers }) => {
    const [formData, setFormData] = useState({
        name: user.name || '',
        role: user.role || 'RT',
        rtNumber: user.rtNumber || '01'
    });
    const [editError, setEditError] = useState('');

    // Get occupied RT numbers (excluding current user being edited)
    const occupiedRTs = existingUsers
        .filter(u => u.role === 'RT' && u.id !== user.id)
        .map(u => u.rtNumber);
    const rwExists = existingUsers.some(u => u.role === 'RW' && u.id !== user.id);

    const handleSubmit = (e) => {
        e.preventDefault();
        setEditError('');

        // Validate duplicate role+wilayah
        if (formData.role === 'RT' && occupiedRTs.includes(formData.rtNumber)) {
            setEditError(`Ketua RT ${formData.rtNumber} sudah terdaftar oleh admin lain!`);
            return;
        }
        if (formData.role === 'RW' && rwExists) {
            setEditError('Pengurus RW sudah terdaftar! Hanya boleh ada 1 Pengurus RW.');
            return;
        }

        onUpdate(user.id, formData);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Pencil className="w-5 h-5 text-emerald-600"/>
                        Edit Data Admin
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5"/>
                    </button>
                </div>

                {editError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0"/>
                        {editError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                        <input value={user.email} disabled className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed"/>
                        <p className="text-[10px] text-slate-400 mt-1">*Email tidak dapat diubah</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Lengkap</label>
                        <input 
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role</label>
                        <select 
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                            value={formData.role} 
                            onChange={e => setFormData({...formData, role: e.target.value})}
                        >
                            <option value="RT">Ketua RT</option>
                            <option value="RW" disabled={rwExists}>Pengurus RW {rwExists ? '(Sudah ada)' : ''}</option>
                        </select>
                    </div>

                    {formData.role === 'RT' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Wilayah RT</label>
                            <select 
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                                value={formData.rtNumber} 
                                onChange={e => setFormData({...formData, rtNumber: e.target.value})}
                            >
                                {[1,2,3,4,5,6,7,8].map(n => {
                                    const rtNum = `0${n}`;
                                    const isTaken = occupiedRTs.includes(rtNum);
                                    return <option key={n} value={rtNum} disabled={isTaken}>RT {rtNum}{isTaken ? ' (Sudah ada)' : ''}</option>;
                                })}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200">
                            Batal
                        </button>
                        <button 
                            type="submit" 
                            disabled={isProcessing}
                            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 flex items-center justify-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Save className="w-4 h-4"/> Simpan</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UserManager = () => {
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({ 
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        role: 'RT', 
        rtNumber: '01'
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [recoverMode, setRecoverMode] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    
    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, 'artifacts', APP_ID, 'public', 'data', 'admin_accounts'), 
            (s) => setUsers(s.docs.map(d => ({id: d.id, ...d.data()})))
        );
        return () => unsub();
    }, []);

    const handleAddUser = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Format email tidak valid');
            return;
        }

        // Validate password
        if (formData.password.length < 6) {
            setError('Password minimal 6 karakter');
            return;
        }

        // Validate password confirmation
        if (formData.password !== formData.confirmPassword) {
            setError('Password dan konfirmasi password tidak cocok');
            return;
        }

        // Check if email already exists in admin_accounts
        const emailExists = users.some(u => u.email?.toLowerCase() === formData.email.toLowerCase());
        if (emailExists) {
            setError('Email sudah terdaftar di database admin');
            return;
        }

        // Check duplicate role + wilayah RT
        if (formData.role === 'RT') {
            const rtTaken = users.some(u => u.role === 'RT' && u.rtNumber === formData.rtNumber);
            if (rtTaken) {
                setError(`Ketua RT ${formData.rtNumber} sudah terdaftar! Tidak boleh ada duplikat.`);
                return;
            }
        }

        // Check duplicate RW (hanya boleh 1)
        if (formData.role === 'RW') {
            const rwExists = users.some(u => u.role === 'RW');
            if (rwExists) {
                setError('Pengurus RW sudah terdaftar! Hanya boleh ada 1 Pengurus RW.');
                return;
            }
        }

        setLoading(true);

        try {
            // Step 1: Create user in Firebase Authentication using secondary app
            const userCredential = await createUserWithEmailAndPassword(
                secondaryAuth, 
                formData.email, 
                formData.password
            );
            
            // Sign out from secondary auth immediately (don't affect main session)
            await signOut(secondaryAuth);

            // Step 2: Add user data to Firestore admin_accounts
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'admin_accounts'), {
                email: formData.email.toLowerCase(),
                name: formData.name,
                role: formData.role,
                rtNumber: formData.role === 'RT' ? formData.rtNumber : '00',
                uid: userCredential.user.uid,
                createdAt: new Date().toISOString()
            });

            // Reset form
            setFormData({ email: '', password: '', confirmPassword: '', name: '', role: 'RT', rtNumber: '01' });
            setSuccess(`User "${formData.name}" berhasil ditambahkan!`);
            
            // Clear success message after 5 seconds
            setTimeout(() => setSuccess(''), 5000);

        } catch (err) {
            console.error('Error creating user:', err);
            
            // Handle specific Firebase Auth errors
            switch (err.code) {
                case 'auth/email-already-in-use':
                    setError('Email ini sudah terdaftar di sistem login (Firebase Auth).');
                    setRecoverMode(true);
                    break;
                case 'auth/invalid-email':
                    setError('Format email tidak valid');
                    break;
                case 'auth/weak-password':
                    setError('Password terlalu lemah. Minimal 6 karakter.');
                    break;
                case 'auth/operation-not-allowed':
                    setError('Email/Password sign-up belum diaktifkan di Firebase Console');
                    break;
                default:
                    setError(`Gagal menambahkan user: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    // Recover access for existing Auth users (skip auth creation, just add to DB)
    const handleRecoverUser = async () => {
        if (!confirm("Pulihkan akses untuk email ini? Pastikan user mengingat password lamanya.")) return;
        
        setLoading(true);
        try {
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'admin_accounts'), {
                email: formData.email.toLowerCase(),
                name: formData.name,
                role: formData.role,
                rtNumber: formData.role === 'RT' ? formData.rtNumber : '00',
                uid: 'recovered_' + Date.now(), 
                createdAt: new Date().toISOString(),
                isRecovered: true
            });

            setFormData({ email: '', password: '', confirmPassword: '', name: '', role: 'RT', rtNumber: '01' });
            setSuccess(`Akses berhasil dipulihkan! Silakan login.`);
            setRecoverMode(false);
            setError('');
             
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            console.error(err);
            setError("Gagal memulihkan akses: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (userId, updatedData) => {
        setIsEditing(true);
        setError('');
        try {
            // Server-side double check for duplicate role+wilayah
            if (updatedData.role === 'RT') {
                const rtTaken = users.some(u => u.id !== userId && u.role === 'RT' && u.rtNumber === updatedData.rtNumber);
                if (rtTaken) {
                    setError(`Ketua RT ${updatedData.rtNumber} sudah terdaftar oleh admin lain!`);
                    setIsEditing(false);
                    return;
                }
            }
            if (updatedData.role === 'RW') {
                const rwExists = users.some(u => u.id !== userId && u.role === 'RW');
                if (rwExists) {
                    setError('Pengurus RW sudah terdaftar! Hanya boleh ada 1.');
                    setIsEditing(false);
                    return;
                }
            }

            // Update Firestore
            await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'admin_accounts', userId), {
                name: updatedData.name,
                role: updatedData.role,
                rtNumber: updatedData.role === 'RT' ? updatedData.rtNumber : '00'
            });

            setSuccess(`User "${updatedData.name}" berhasil diperbarui!`);
            setEditingUser(null); // Close modal
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            console.error(err);
            alert("Gagal memperbarui data user: " + err.message);
        } finally {
            setIsEditing(false);
        }
    };

    const handleDelete = async (user) => { 
        if (confirm(`Hapus user admin "${user.name}"?\n\n⚠️ Catatan: Ini hanya menghapus dari database admin_accounts.\nUntuk menghapus sepenuhnya, hapus juga di Firebase Console → Authentication.`)) {
            await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'admin_accounts', user.id)); 
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Manajemen Akses Admin</h2>
                <p className="text-slate-500 text-sm mt-1">Kelola akun admin untuk akses dashboard</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Add User Form */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-emerald-600"/>
                        Tambah Admin Baru
                    </h3>

                    {/* Success Message */}
                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm mb-4 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4"/>
                            {success}
                        </div>
                    )}

                    {/* Error Message & Recovery */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0"/>
                                <div className="flex-1">
                                    <p>{error}</p>
                                    {recoverMode && (
                                        <div className="mt-2 pt-2 border-t border-red-200">
                                            <p className="text-xs text-red-800 mb-2 font-medium">
                                                User ini tampaknya sudah punya akun login, tapi tidak ada di daftar admin.
                                            </p>
                                            <button 
                                                type="button"
                                                onClick={handleRecoverUser}
                                                className="w-full bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-red-200"
                                            >
                                                <CheckCircle className="w-3 h-3"/>
                                                Pulihkan Akses & Daftarkan
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleAddUser} className="space-y-3">
                        {/* Email Field */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                                <input 
                                    type="email"
                                    className="w-full p-2 pl-9 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                                    placeholder="admin@bumiadipura.com" 
                                    value={formData.email} 
                                    onChange={e => { setFormData({...formData, email: e.target.value}); setError(''); setRecoverMode(false); }}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    className="w-full p-2 pl-9 pr-10 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                                    placeholder="Minimal 6 karakter" 
                                    value={formData.password} 
                                    onChange={e => { setFormData({...formData, password: e.target.value}); setError(''); }}
                                    required
                                    disabled={loading}
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Konfirmasi Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    className="w-full p-2 pl-9 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                                    placeholder="Ulangi password" 
                                    value={formData.confirmPassword} 
                                    onChange={e => { setFormData({...formData, confirmPassword: e.target.value}); setError(''); }}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Name Field */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Nama Lengkap
                            </label>
                            <input 
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                                placeholder="Nama admin" 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                required
                                disabled={loading}
                            />
                        </div>

                        {/* Role Select */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Role
                            </label>
                            <select 
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                                value={formData.role} 
                                onChange={e => setFormData({...formData, role: e.target.value})}
                                disabled={loading}
                            >
                                <option value="RT">Ketua RT</option>
                                <option value="RW" disabled={users.some(u => u.role === 'RW')}>Pengurus RW {users.some(u => u.role === 'RW') ? '(Sudah ada)' : ''}</option>
                            </select>
                        </div>

                        {/* RT Number - Only show for RT role */}
                        {formData.role === 'RT' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Wilayah RT
                                </label>
                                <select 
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                                    value={formData.rtNumber} 
                                    onChange={e => setFormData({...formData, rtNumber: e.target.value})}
                                    disabled={loading}
                                >
                                    {[1,2,3,4,5,6,7,8].map(n => {
                                        const rtNum = `0${n}`;
                                        const isTaken = users.some(u => u.role === 'RT' && u.rtNumber === rtNum);
                                        return <option key={n} value={rtNum} disabled={isTaken}>RT {rtNum}{isTaken ? ' (Sudah ada)' : ''}</option>;
                                    })}
                                </select>
                            </div>
                        )}

                        <button 
                            disabled={loading}
                            className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin"/>
                                    Membuat User...
                                </>
                            ) : (
                                'Simpan User'
                            )}
                        </button>
                    </form>
                </div>
                
                {/* Users List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-emerald-600"/>
                                Daftar Admin
                            </h3>
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">
                                {users.length} user
                            </span>
                        </div>

                        {/* Mobile: Card Layout */}
                        <div className="lg:hidden divide-y divide-slate-100">
                            {users.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 italic">
                                    Belum ada data admin
                                </div>
                            ) : (
                                users.map(u => (
                                    <div key={u.id} className="p-4 flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                                            u.role === 'RW' ? 'bg-purple-500' : 'bg-blue-500'
                                        }`}>
                                            {u.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="font-bold text-sm text-slate-800 truncate">{u.name}</p>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                                                    u.role === 'RW' 
                                                        ? 'bg-purple-100 text-purple-700' 
                                                        : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {u.role === 'RW' ? 'RW' : `RT ${u.rtNumber}`}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 truncate">{u.email || '-'}</p>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button 
                                                onClick={() => setEditingUser(u)}
                                                className="text-amber-400 hover:text-amber-600 p-2 hover:bg-amber-50 rounded-lg transition-colors"
                                                title="Edit user"
                                            >
                                                <Pencil className="w-4 h-4"/>
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(u)} 
                                                className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Hapus user"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop: Table Layout */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="p-4 font-bold text-xs text-slate-500 uppercase tracking-wider">Nama</th>
                                        <th className="p-4 font-bold text-xs text-slate-500 uppercase tracking-wider">Email</th>
                                        <th className="p-4 font-bold text-xs text-slate-500 uppercase tracking-wider">Role</th>
                                        <th className="p-4 text-center font-bold text-xs text-slate-500 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="p-8 text-center text-slate-400 italic">
                                                Belum ada data admin
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4">
                                                    <p className="font-bold text-slate-800">{u.name}</p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-slate-600 font-mono text-xs bg-slate-100 px-2 py-1 rounded inline-block">
                                                        {u.email || '-'}
                                                    </p>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                                                        u.role === 'RW' 
                                                            ? 'bg-purple-100 text-purple-700' 
                                                            : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {u.role === 'RW' ? 'RW' : `RT ${u.rtNumber}`}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={() => setEditingUser(u)}
                                                            className="text-amber-400 hover:text-amber-600 p-2 hover:bg-amber-50 rounded-lg transition-colors"
                                                            title="Edit user"
                                                        >
                                                            <Pencil className="w-4 h-4"/>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(u)} 
                                                            className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Hapus user"
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
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <EditUserModal 
                    user={editingUser} 
                    onClose={() => setEditingUser(null)} 
                    onUpdate={handleUpdateUser}
                    isProcessing={isEditing}
                    existingUsers={users}
                />
            )}
        </div>
    );
};

export default UserManager;
