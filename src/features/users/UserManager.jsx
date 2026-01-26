import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, APP_ID } from '../../config';

const UserManager = () => {
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({ 
        username: '', 
        password: '', 
        role: 'RT', 
        rtNumber: '01', 
        name: '' 
    });
    
    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, 'artifacts', APP_ID, 'public', 'data', 'admin_accounts'), 
            (s) => setUsers(s.docs.map(d => ({id: d.id, ...d.data()})))
        );
        return () => unsub();
    }, []);

    const handleAddUser = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'admin_accounts'), formData);
        setFormData({ username: '', password: '', role: 'RT', rtNumber: '01', name: '' });
        alert("User Admin berhasil ditambahkan!");
    };

    const handleDelete = async (id) => { 
        if (confirm("Hapus user admin ini?")) {
            await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'admin_accounts', id)); 
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-800">Manajemen Akses Admin</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Add User Form */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                    <h3 className="font-bold mb-4">Tambah Admin Baru</h3>
                    <form onSubmit={handleAddUser} className="space-y-3">
                        <input 
                            className="w-full p-2 border rounded-lg text-sm" 
                            placeholder="Nama Lengkap" 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                            required
                        />
                        <input 
                            className="w-full p-2 border rounded-lg text-sm" 
                            placeholder="Username" 
                            value={formData.username} 
                            onChange={e => setFormData({...formData, username: e.target.value})} 
                            required
                        />
                        <input 
                            className="w-full p-2 border rounded-lg text-sm" 
                            placeholder="Password" 
                            type="password"
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})} 
                            required
                        />
                        <select 
                            className="w-full p-2 border rounded-lg text-sm bg-white" 
                            value={formData.role} 
                            onChange={e => setFormData({...formData, role: e.target.value})}
                        >
                            <option value="RT">Ketua RT</option>
                            <option value="RW">Pengurus RW</option>
                        </select>
                        {formData.role === 'RT' && (
                            <select 
                                className="w-full p-2 border rounded-lg text-sm bg-white" 
                                value={formData.rtNumber} 
                                onChange={e => setFormData({...formData, rtNumber: e.target.value})}
                            >
                                {[1,2,3,4,5,6,7,8].map(n => (
                                    <option key={n} value={`0${n}`}>RT 0{n}</option>
                                ))}
                            </select>
                        )}
                        <button className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-emerald-700">
                            Simpan User
                        </button>
                    </form>
                </div>
                
                {/* Users Table */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="p-4">Nama</th>
                                    <th className="p-4">Username</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b hover:bg-slate-50">
                                        <td className="p-4 font-bold">{u.name}</td>
                                        <td className="p-4 font-mono text-slate-500">{u.username}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                u.role === 'RW' 
                                                    ? 'bg-purple-100 text-purple-700' 
                                                    : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {u.role} {u.role === 'RT' && u.rtNumber}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {u.username !== 'admin' && (
                                                <button 
                                                    onClick={() => handleDelete(u.id)} 
                                                    className="text-red-400 hover:text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManager;
