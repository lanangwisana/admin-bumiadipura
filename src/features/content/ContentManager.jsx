import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, APP_ID } from '../../config';
import { formatDate } from '../../utils';

const ContentManager = ({ user, role }) => {
    const [events, setEvents] = useState([]);
    const [news, setNews] = useState([]);
    const [activeTab, setActiveTab] = useState('events');
    const [formEvent, setFormEvent] = useState({ title: '', date: '', location: '', category: 'Umum' });
    const [formNews, setFormNews] = useState({ title: '', content: '' });

    useEffect(() => {
        if (!user) return;
        const unsubEvents = onSnapshot(
            collection(db, 'artifacts', APP_ID, 'public', 'data', 'events'), 
            (s) => setEvents(s.docs.map(d => ({id: d.id, ...d.data()})))
        );
        const unsubNews = onSnapshot(
            collection(db, 'artifacts', APP_ID, 'public', 'data', 'news'), 
            (s) => setNews(s.docs.map(d => ({id: d.id, ...d.data()})))
        );
        return () => { unsubEvents(); unsubNews(); };
    }, [user]);

    const handleAddEvent = async (e) => { 
        e.preventDefault(); 
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'events'), formEvent); 
        setFormEvent({ title: '', date: '', location: '', category: 'Umum' }); 
        alert("Kegiatan tersimpan!"); 
    };

    const handleAddNews = async (e) => { 
        e.preventDefault(); 
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'news'), { 
            ...formNews, 
            date: new Date().toLocaleDateString(), 
            cat: 'Pengumuman', 
            sender: role.label, 
            createdAt: new Date().toISOString(), 
            image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80', 
            color: 'bg-red-100 text-red-700' 
        }); 
        setFormNews({title: '', content: ''}); 
        alert("Broadcast terkirim!"); 
    };
    
    const handleDelete = async (col, id) => { 
        if (confirm('Hapus?')) {
            await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', col, id)); 
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-800">Manajemen Informasi & Kegiatan</h2>
            
            {/* Tab Switcher */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
                <button 
                    onClick={() => setActiveTab('events')} 
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'events' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'
                    }`}
                >
                    Agenda Kegiatan
                </button>
                <button 
                    onClick={() => setActiveTab('news')} 
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'news' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'
                    }`}
                >
                    Broadcast Berita
                </button>
            </div>

            {activeTab === 'events' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Add Event Form */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                        <h3 className="font-bold mb-4">Tambah Kegiatan Baru</h3>
                        <form onSubmit={handleAddEvent} className="space-y-3">
                            <input 
                                className="w-full p-2 border rounded-lg text-sm" 
                                placeholder="Nama Kegiatan" 
                                value={formEvent.title} 
                                onChange={e => setFormEvent({...formEvent, title: e.target.value})} 
                                required
                            />
                            <input 
                                className="w-full p-2 border rounded-lg text-sm" 
                                placeholder="Tanggal (misal: 17 Agustus)" 
                                value={formEvent.date} 
                                onChange={e => setFormEvent({...formEvent, date: e.target.value})} 
                                required
                            />
                            <input 
                                className="w-full p-2 border rounded-lg text-sm" 
                                placeholder="Lokasi" 
                                value={formEvent.location} 
                                onChange={e => setFormEvent({...formEvent, location: e.target.value})} 
                                required
                            />
                            <select 
                                className="w-full p-2 border rounded-lg text-sm bg-white" 
                                value={formEvent.category} 
                                onChange={e => setFormEvent({...formEvent, category: e.target.value})}
                            >
                                <option>Umum</option>
                                <option>Kesehatan</option>
                                <option>Keagamaan</option>
                                <option>Kerja Bakti</option>
                                <option>Hiburan</option>
                            </select>
                            <button className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold text-sm">
                                Simpan
                            </button>
                        </form>
                    </div>
                    
                    {/* Events List */}
                    <div className="md:col-span-2 space-y-3">
                        {events.map(ev => (
                            <div 
                                key={ev.id} 
                                className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center"
                            >
                                <div>
                                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500 mb-1 inline-block">
                                        {ev.category}
                                    </span>
                                    <h4 className="font-bold text-slate-800">{ev.title}</h4>
                                    <p className="text-xs text-slate-500">{ev.date} • {ev.location}</p>
                                </div>
                                <button 
                                    onClick={() => handleDelete('events', ev.id)} 
                                    className="text-red-400 hover:text-red-600 p-2"
                                >
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Add News Form */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="font-bold mb-4">Kirim Broadcast</h3>
                        <form onSubmit={handleAddNews} className="space-y-4">
                            <input 
                                className="w-full p-3 border rounded-xl text-sm font-bold" 
                                placeholder="Judul Pengumuman" 
                                value={formNews.title} 
                                onChange={e => setFormNews({...formNews, title: e.target.value})} 
                                required
                            />
                            <textarea 
                                className="w-full p-3 border rounded-xl text-sm h-32" 
                                placeholder="Isi pesan..." 
                                value={formNews.content} 
                                onChange={e => setFormNews({...formNews, content: e.target.value})} 
                                required
                            />
                            <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">
                                Kirim ke Warga
                            </button>
                        </form>
                    </div>
                    
                    {/* News List */}
                    <div className="space-y-4">
                        {news.map(n => (
                            <div key={n.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-slate-800">{n.title}</h4>
                                        <p className="text-[10px] text-slate-400 mb-2">
                                            {formatDate(n.createdAt)} • Oleh {n.sender}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete('news', n.id)} 
                                        className="text-red-400 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                                <p className="text-xs text-slate-600 line-clamp-3">{n.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentManager;
