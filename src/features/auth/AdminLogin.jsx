// use client;
import React, { useState, useEffect } from 'react';
import { Lock, LogIn, Loader2, Mail, AlertCircle, ShieldCheck } from 'lucide-react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db, auth, APP_ID, LOGO_URL } from '../../config';


/**
 * Secure Admin Login Component
 * Uses Firebase Authentication (Email/Password) for secure login
 * - Password is hashed by Firebase (not stored as plain text)
 * - Rate limiting built-in to prevent brute force
 * - Session managed securely with JWT tokens
 */
const AdminLogin = ({ onLogin }) => {
    const [roleType, setRoleType] = useState('RW'); // RW | RT
    const [rtNumber, setRtNumber] = useState('01');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Auto-seed admin_accounts if empty (for first-time setup)
    useEffect(() => {
        const seedAdminAccounts = async () => {
            try {
                const adminRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'admin_accounts');
                const snapshot = await getDocs(adminRef);
                
                if (snapshot.empty) {
                    console.log('Seeding admin_accounts...');
                    const defaultAdmins = [
                        { 
                            email: "admin.rw@bumiadipura.com", 
                            role: "RW", 
                            rtNumber: "00", 
                            name: "Super Admin RW",
                            createdAt: new Date().toISOString() 
                        },
                        { 
                            email: "ketua.rt01@bumiadipura.com", 
                            role: "RT", 
                            rtNumber: "01", 
                            name: "Ketua RT 01",
                            createdAt: new Date().toISOString() 
                        },
                        { 
                            email: "ketua.rt02@bumiadipura.com", 
                            role: "RT", 
                            rtNumber: "02", 
                            name: "Ketua RT 02",
                            createdAt: new Date().toISOString() 
                        }
                    ];
                    
                    for (const admin of defaultAdmins) {
                        await addDoc(adminRef, admin);
                    }
                    console.log('Admin accounts seeded successfully!');
                }
            } catch (err) {
                console.error('Error seeding admin accounts:', err);
            }
        };
        
        seedAdminAccounts();
    }, []);

    /**
     * Handle Secure Login with Firebase Auth
     * 1. Authenticate with Firebase Auth (Email/Password) - Password is hashed
     * 2. Validate admin role in Firestore admin_accounts
     * 3. Verify role matches selected role type
     */
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            // Step 1: Firebase Auth - Secure authentication with hashed password
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Step 2: Query admin_accounts to validate admin role
            const adminRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'admin_accounts');
            const q = query(adminRef, where('email', '==', email.toLowerCase()));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                // User exists in Firebase Auth but not in admin_accounts
                await signOut(auth);
                setError('Akun tidak terdaftar sebagai admin. Hubungi administrator.');
                setLoading(false);
                return;
            }

            // Get admin data
            const adminData = snapshot.docs[0].data();

            // Step 3: Validate role matches selected role type
            if (adminData.role !== roleType) {
                await signOut(auth);
                setError(`Akun ini terdaftar sebagai ${adminData.role === 'RW' ? 'Pengurus RW' : 'Ketua RT'}, bukan ${roleType === 'RW' ? 'Pengurus RW' : 'Ketua RT'}.`);
                setLoading(false);
                return;
            }

            // For RT, also validate RT number
            if (roleType === 'RT' && adminData.rtNumber !== rtNumber) {
                await signOut(auth);
                setError(`Akun ini terdaftar untuk RT ${adminData.rtNumber}, bukan RT ${rtNumber}.`);
                setLoading(false);
                return;
            }

            // Success - prepare role data
            const roleLabel = roleType === 'RW' 
                ? 'Pengurus RW (Super Admin)' 
                : `Ketua RT ${rtNumber}`;
            const scope = roleType === 'RW' ? 'GLOBAL' : `RT${rtNumber}`;


            // Return role data to parent
            onLogin({ 
                type: roleType, 
                id: rtNumber, 
                label: roleLabel, 
                scope,
                name: adminData.name || roleLabel,
                email: email,
                uid: firebaseUser.uid
            });

        } catch (error) {
            console.error('Login error:', error);
            
            // Handle specific Firebase Auth errors
            switch (error.code) {
                case 'auth/user-not-found':
                    setError('Email tidak ditemukan. Pastikan email sudah terdaftar.');
                    break;
                case 'auth/wrong-password':
                    setError('Password salah. Silakan coba lagi.');
                    break;
                case 'auth/invalid-email':
                    setError('Format email tidak valid.');
                    break;
                case 'auth/user-disabled':
                    setError('Akun ini telah dinonaktifkan. Hubungi administrator.');
                    break;
                case 'auth/too-many-requests':
                    setError('Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.');
                    break;
                case 'auth/invalid-credential':
                    setError('Email atau password salah.');
                    break;
                default:
                    setError('Terjadi kesalahan saat login. Silakan coba lagi.');
            }
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                <div className="p-6 sm:p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-emerald-800 rounded-3xl mx-auto flex items-center justify-center shadow-lg mb-4 p-2">
                            <img src={LOGO_URL} className="w-full h-full object-contain brightness-0 invert" alt="Logo" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Admin Panel</h1>
                        <p className="text-slate-500 text-sm">Bumi Adipura Smart System</p>
                        
                        {/* Security Badge */}
                        <div className="mt-3 inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                            <ShieldCheck className="w-3.5 h-3.5"/>
                            Secured by Firebase Auth
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 flex items-start gap-2 animate-fade-in">
                            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Role Selector */}
                        <div className="bg-slate-100 p-1 rounded-xl flex">
                            <button 
                                type="button" 
                                onClick={() => { setRoleType('RW'); setError(''); }} 
                                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                                    roleType === 'RW' 
                                        ? 'bg-white shadow text-emerald-600' 
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Pengurus RW
                            </button>
                            <button 
                                type="button" 
                                onClick={() => { setRoleType('RT'); setError(''); }} 
                                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                                    roleType === 'RT' 
                                        ? 'bg-white shadow text-blue-600' 
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Ketua RT
                            </button>
                        </div>

                        {/* RT Number Selector - Only show for RT */}
                        {roleType === 'RT' && (
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Wilayah
                                </label>
                                <select 
                                    value={rtNumber} 
                                    onChange={e => { setRtNumber(e.target.value); setError(''); }} 
                                    className="w-full p-3 border border-slate-200 rounded-xl mt-1 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    {[1,2,3,4,5,6,7,8].map(n => (
                                        <option key={n} value={`0${n}`}>RT 0{n}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Email Input */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Email
                            </label>
                            <div className="relative mt-1">
                                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400"/>
                                <input 
                                    type="email" 
                                    value={email} 
                                    onChange={e => { setEmail(e.target.value); setError(''); }} 
                                    className="w-full p-3 pl-10 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800" 
                                    placeholder="admin@bumiadipura.com" 
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Password
                            </label>
                            <div className="relative mt-1">
                                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400"/>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={e => { setPassword(e.target.value); setError(''); }} 
                                    className="w-full p-3 pl-10 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-800" 
                                    placeholder="••••••••" 
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button 
                            disabled={loading} 
                            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:from-emerald-700 hover:to-emerald-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <LogIn className="w-5 h-5"/>}
                            {loading ? 'Memverifikasi...' : 'Masuk Dashboard'}
                        </button>
                    </form>

                    {/* Footer Info */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-slate-400">
                            Login menggunakan email dan password yang terdaftar
                        </p>
                        <p className="text-[10px] text-slate-300 mt-2">
                            🔐 Password terenkripsi • Rate limiting aktif
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
