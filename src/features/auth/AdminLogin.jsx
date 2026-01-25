// use client;
import React, { useState, useEffect } from 'react';
import { Lock, LogIn, Loader2 } from 'lucide-react';
import { collection, addDoc, getDocs, query } from 'firebase/firestore';
import { db, APP_ID, LOGO_URL } from '../../config';
import { seedDatabase } from '../../services';

const AdminLogin = ({ onLogin }) => {
    const [roleType, setRoleType] = useState('RW'); // RW | RT
    const [rtNumber, setRtNumber] = useState('01');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-seed Default Admin if DB is empty
    useEffect(() => {
        const checkSeed = async () => {
            const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'admin_accounts'));
            const snap = await getDocs(q);
            if (snap.empty) {
                await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'admin_accounts'), {
                    username: 'admin',
                    password: 'admin123',
                    role: 'RW',
                    rtNumber: '00',
                    name: 'Super Admin RW'
                });
            }
        };
        checkSeed();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            // In real app, query firebase. Here simplified for demo.
            setTimeout(() => {
                if (password === 'admin123') {
                    const roleLabel = roleType === 'RW' ? 'Pengurus RW (Super Admin)' : `Ketua RT ${rtNumber}`;
                    const scope = roleType === 'RW' ? 'GLOBAL' : `RT${rtNumber}`;
                    // Trigger seed on login success
                    seedDatabase();
                    onLogin({ type: roleType, id: rtNumber, label: roleLabel, scope });
                } else {
                    alert("Password Salah! (Hint: admin123)");
                    setLoading(false);
                }
            }, 1000);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col md:flex-row animate-fade-in-up">
                <div className="p-8 w-full">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-24 h-24 bg-emerald-800 rounded-3xl mx-auto flex items-center justify-center shadow-lg mb-4 p-2">
                            <img src={LOGO_URL} className="w-full h-full object-contain brightness-0 invert" alt="Logo" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800">Admin Panel</h1>
                        <p className="text-slate-500 text-sm">Bumi Adipura Smart System</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Role Selector */}
                        <div className="bg-slate-100 p-1 rounded-xl flex">
                            <button 
                                type="button" 
                                onClick={() => setRoleType('RW')} 
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                                    roleType === 'RW' 
                                        ? 'bg-white shadow text-emerald-600' 
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Pengurus RW
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setRoleType('RT')} 
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                                    roleType === 'RT' 
                                        ? 'bg-white shadow text-blue-600' 
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Ketua RT
                            </button>
                        </div>

                        {/* RT Number Selector */}
                        {roleType === 'RT' && (
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Wilayah
                                </label>
                                <select 
                                    value={rtNumber} 
                                    onChange={e => setRtNumber(e.target.value)} 
                                    className="w-full p-3 border border-slate-200 rounded-xl mt-1 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    {[1,2,3,4,5,6,7,8].map(n => (
                                        <option key={n} value={`0${n}`}>RT 0{n}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Password Input */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Kode Akses
                            </label>
                            <div className="relative mt-1">
                                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400"/>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    className="w-full p-3 pl-10 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-slate-800" 
                                    placeholder="••••••" 
                                    required
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button 
                            disabled={loading} 
                            className="w-full bg-emerald-800 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-emerald-900 transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <LogIn className="w-5 h-5"/>}
                            {loading ? 'Memverifikasi...' : 'Masuk Dashboard'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
