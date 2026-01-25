import React, { useState } from 'react';
import { XCircle } from 'lucide-react';

const BroadcastModal = ({ isOpen, onClose, onSubmit, role }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ title, message });
        setTitle('');
        setMessage('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-slate-800">Buat Pengumuman</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                        <XCircle className="w-6 h-6 text-slate-400"/>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Judul</label>
                        <input 
                            required 
                            className="w-full p-3 border rounded-xl mt-1 outline-none focus:border-blue-500" 
                            placeholder="Judul Pengumuman" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Isi Pesan</label>
                        <textarea 
                            required 
                            className="w-full p-3 border rounded-xl mt-1 h-32 outline-none focus:border-blue-500" 
                            placeholder="Isi pesan..." 
                            value={message} 
                            onChange={e => setMessage(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg"
                    >
                        Kirim Broadcast
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BroadcastModal;
