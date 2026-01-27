import React, { useState, useEffect } from 'react';
import { Trash2, Mail, User, Shield, AlertCircle, Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, APP_ID, secondaryAuth } from '../../config';

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
                    setError('Email sudah terdaftar di Firebase Authentication. Tambahkan ke database admin saja.');
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

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4"/>
                            {error}
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
                                    onChange={e => { setFormData({...formData, email: e.target.value}); setError(''); }}
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
                                <option value="RW">Pengurus RW</option>
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
                                    {[1,2,3,4,5,6,7,8].map(n => (
                                        <option key={n} value={`0${n}`}>RT 0{n}</option>
                                    ))}
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
                
                {/* Users Table */}
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
                        <div className="overflow-x-auto">
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
                                                    <button 
                                                        onClick={() => handleDelete(u)} 
                                                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Hapus user"
                                                    >
                                                        <Trash2 className="w-4 h-4"/>
                                                    </button>
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
        </div>
    );
};

export default UserManager;
