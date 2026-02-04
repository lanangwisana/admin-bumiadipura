// Page Manajemen Informasi & Kegiatan
// CRUD Operations: Create, Read, Update, Delete for Events & News
import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db, APP_ID } from '../../config';
import { formatDate, formatEventDate } from '../../utils';
import { DatePicker } from '../../components/ui/DatePicker';

const ContentManager = ({ user, role }) => {
    // State untuk data
    const [events, setEvents] = useState([]);
    const [news, setNews] = useState([]);
    const [activeTab, setActiveTab] = useState('events');
    
    // State untuk form
    const [formEvent, setFormEvent] = useState({ title: '', date: '', location: '', category: 'Umum' });
    const [formNews, setFormNews] = useState({ title: '', content: '', category: 'Pengumuman' });

    // Helper: Get color based on category (News)
    const getCategoryColor = (cat) => {
        const colors = {
            'Pengumuman': 'bg-red-100 text-red-700',
            'Keamanan': 'bg-orange-100 text-orange-700',
            'Kesehatan': 'bg-green-100 text-green-700',
            'Lingkungan': 'bg-blue-100 text-blue-700',
            'Keuangan': 'bg-purple-100 text-purple-700',
            'Kegiatan': 'bg-yellow-100 text-yellow-700'
        };
        return colors[cat] || 'bg-slate-100 text-slate-700';
    };

    // Helper: Get color based on category (Events)
    const getEventCategoryColor = (cat) => {
        const colors = {
            'Umum': 'bg-slate-100 text-slate-700',
            'Kesehatan': 'bg-green-100 text-green-700',
            'Keagamaan': 'bg-purple-100 text-purple-700',
            'Kerja Bakti': 'bg-amber-100 text-amber-700',
            'Hiburan': 'bg-pink-100 text-pink-700'
        };
        return colors[cat] || 'bg-slate-100 text-slate-700';
    };
    
    // State untuk Edit Mode
    const [editingEventId, setEditingEventId] = useState(null);
    const [editingNewsId, setEditingNewsId] = useState(null);
    
    // State untuk Pagination
    const [historyPage, setHistoryPage] = useState(1);
    const [eventsHistoryPage, setEventsHistoryPage] = useState(1);
    const HISTORY_PER_PAGE = 5;

    // ========== ROLE-BASED ACCESS CONTROL ==========
    /**
     * Cek apakah user bisa edit/hapus item berdasarkan role:
     * - RW (Super Admin): Bisa edit/hapus SEMUA
     * - RT: Hanya bisa edit/hapus miliknya sendiri
     */
    const canEditNews = (newsItem) => {
        // RW bisa edit semua
        if (role?.type === 'RW') return true;
        
        // RT hanya bisa edit miliknya sendiri
        return newsItem.createdBy === `RT${role?.id}`;
    };

    const canEditEvent = (eventItem) => {
        // RW bisa edit semua
        if (role?.type === 'RW') return true;
        
        // RT hanya bisa edit miliknya sendiri
        return eventItem.createdBy === `RT${role?.id}`;
    };

    // READ (events and news) - Realtime listener
    useEffect(() => {
        if (!user || !role) return;

        // Listener untuk Events
        const eventsQuery = query(
            collection(db, 'artifacts', APP_ID, 'public', 'data', 'events'),
            orderBy('createdAt', 'desc')
        );
        const unsubEvents = onSnapshot(eventsQuery, (s) => {
            let allEvents = s.docs.map(d => ({id: d.id, ...d.data()}));
            
            // FILTER UNTUK RT: Hanya lihat miliknya sendiri
            if (role?.type === 'RT') {
                const rtId = `RT${role.id}`;
                allEvents = allEvents.filter(ev => ev.createdBy === rtId);
            }
            
            setEvents(allEvents);
        });

        // Listener untuk News
        const newsQuery = query(
            collection(db, 'artifacts', APP_ID, 'public', 'data', 'news'),
            orderBy('createdAt', 'desc')
        );
        const unsubNews = onSnapshot(newsQuery, (s) => {
            let allNews = s.docs.map(d => ({id: d.id, ...d.data()}));
            
            // FILTER UNTUK RT: Hanya lihat miliknya sendiri
            if (role?.type === 'RT') {
                const rtId = `RT${role.id}`;
                allNews = allNews.filter(n => n.createdBy === rtId);
            }
            
            setNews(allNews);
        });

        return () => { unsubEvents(); unsubNews(); };
    }, [user, role]);

    // CREATE Event
    const handleAddEvent = async (e) => { 
        e.preventDefault(); 
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'events'), {
            ...formEvent,
            createdAt: new Date().toISOString(),
            // Tambahkan info pembuat untuk access control
            createdBy: role?.type === 'RW' ? 'RW' : `RT${role?.id}`,
            createdByUid: user?.uid || null,
            createdByName: role?.label || 'Unknown'
        }); 
        setFormEvent({ title: '', date: '', location: '', category: 'Umum' }); 
        alert("Kegiatan tersimpan!"); 
    };

    // UPDATE Event
    const handleUpdateEvent = async (e) => {
        e.preventDefault();
        if (!editingEventId) return;
        
        // Validasi akses sebelum update
        const eventToEdit = events.find(ev => ev.id === editingEventId);
        if (eventToEdit && !canEditEvent(eventToEdit)) {
            alert("⛔ Anda tidak memiliki akses untuk mengedit kegiatan ini!");
            cancelEditEvent();
            return;
        }
        
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'events', editingEventId), {
            ...formEvent,
            updatedAt: new Date().toISOString()
        });
        
        setFormEvent({ title: '', date: '', location: '', category: 'Umum' });
        setEditingEventId(null);
        alert("Kegiatan berhasil diperbarui!");
    };

    // CREATE News
    const handleAddNews = async (e) => { 
        e.preventDefault(); 
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'news'), { 
            title: formNews.title,
            content: formNews.content,
            date: new Date().toLocaleDateString(), 
            cat: formNews.category, 
            sender: role.label, 
            createdAt: new Date().toISOString(), 
            color: getCategoryColor(formNews.category),
            // Tambahkan info pembuat untuk access control
            createdBy: role?.type === 'RW' ? 'RW' : `RT${role?.id}`,
            createdByUid: user?.uid || null,
            createdByName: role?.label || 'Unknown'
        }); 
        setFormNews({title: '', content: '', category: 'Pengumuman'}); 
        alert("Broadcast terkirim!"); 
    };

    // UPDATE News
    const handleUpdateNews = async (e) => {
        e.preventDefault();
        if (!editingNewsId) return;
        
        // Validasi akses sebelum update
        const newsToEdit = news.find(n => n.id === editingNewsId);
        if (newsToEdit && !canEditNews(newsToEdit)) {
            alert("⛔ Anda tidak memiliki akses untuk mengedit broadcast ini!");
            cancelEditNews();
            return;
        }
        
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'news', editingNewsId), {
            title: formNews.title,
            content: formNews.content,
            cat: formNews.category,
            color: getCategoryColor(formNews.category),
            updatedAt: new Date().toISOString()
        });
        
        setFormNews({ title: '', content: '', category: 'Pengumuman' });
        setEditingNewsId(null);
        alert("Berita berhasil diperbarui!");
    };
    
    // DELETE dengan validasi akses
    const handleDelete = async (col, id) => { 
        // Validasi akses sebelum delete
        if (col === 'news') {
            const newsToDelete = news.find(n => n.id === id);
            if (newsToDelete && !canEditNews(newsToDelete)) {
                alert("⛔ Anda tidak memiliki akses untuk menghapus broadcast ini!");
                return;
            }
        }
        
        if (col === 'events') {
            const eventToDelete = events.find(ev => ev.id === id);
            if (eventToDelete && !canEditEvent(eventToDelete)) {
                alert("⛔ Anda tidak memiliki akses untuk menghapus kegiatan ini!");
                return;
            }
        }
        
        if (confirm('Hapus?')) {
            await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', col, id)); 
        }
    };

    // Click item to Edit (Auto-fill form) - dengan validasi akses
    const handleClickEvent = (ev) => {
        // Cek akses sebelum masuk mode edit
        if (!canEditEvent(ev)) {
            alert("⛔ Anda hanya bisa mengedit kegiatan yang Anda buat sendiri!");
            return;
        }
        
        setFormEvent({
            title: ev.title || '',
            date: ev.date || '',
            location: ev.location || '',
            category: ev.category || 'Umum'
        });
        setEditingEventId(ev.id);
    };

    const handleClickNews = (n) => {
        // Cek akses sebelum masuk mode edit
        if (!canEditNews(n)) {
            alert("⛔ Anda hanya bisa mengedit broadcast yang Anda buat sendiri!");
            return;
        }
        
        setFormNews({
            title: n.title || '',
            content: n.content || '',
            category: n.cat || 'Pengumuman'
        });
        setEditingNewsId(n.id);
    };

    // Cancel Edit
    const cancelEditEvent = () => {
        setFormEvent({ title: '', date: '', location: '', category: 'Umum' });
        setEditingEventId(null);
    };

    const cancelEditNews = () => {
        setFormNews({ title: '', content: '', category: 'Pengumuman' });
        setEditingNewsId(null);
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
                <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Form Event (Kiri) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold">
                                {editingEventId ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}
                            </h3>
                            {editingEventId && (
                                <button 
                                    onClick={cancelEditEvent}
                                    className="text-slate-400 hover:text-slate-600"
                                    title="Batal Edit"
                                >
                                    <X className="w-5 h-5"/>
                                </button>
                            )}
                        </div>
                        <form onSubmit={editingEventId ? handleUpdateEvent : handleAddEvent} className="space-y-3">
                            <input 
                                className="w-full p-2 border rounded-lg text-sm" 
                                placeholder="Nama Kegiatan" 
                                value={formEvent.title} 
                                onChange={e => setFormEvent({...formEvent, title: e.target.value})} 
                                required
                            />
                            <DatePicker
                                value={formEvent.date}
                                onChange={(date) => setFormEvent({...formEvent, date: date})}
                                placeholder="Pilih Tanggal Kegiatan"
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
                            <button 
                                type="submit"
                                className={`w-full py-2 rounded-lg font-bold text-sm text-white ${
                                    editingEventId 
                                        ? 'bg-blue-600 hover:bg-blue-700' 
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                {editingEventId ? 'Simpan Perubahan' : 'Simpan'}
                            </button>
                        </form>
                    </div>
                    
                    {/* Events List - 3 Terbaru */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-600">Kegiatan Terbaru</h4>
                            {events.slice(0, 3).map(ev => (
                                <div 
                                    key={ev.id} 
                                    onClick={() => handleClickEvent(ev)}
                                    className={`bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center cursor-pointer transition-all ${
                                        editingEventId === ev.id 
                                            ? 'border-blue-500 ring-2 ring-blue-100' 
                                            : 'border-slate-100 hover:border-slate-300'
                                    }`}
                                >
                                    <div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold mb-1 inline-block ${getEventCategoryColor(ev.category)}`}>
                                            {ev.category}
                                        </span>
                                        <h4 className="font-bold text-slate-800">{ev.title}</h4>
                                        <p className="text-xs text-slate-500">{formatEventDate(ev.date)} - {ev.location}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {/* Tombol hapus hanya muncul jika punya akses */}
                                        {canEditEvent(ev) && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDelete('events', ev.id); }} 
                                                className="text-red-400 hover:text-red-600 p-2"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Events History Table - Full Width */}
                {events.length > 3 && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-6">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <h4 className="text-sm font-bold text-slate-700">Riwayat Kegiatan</h4>
                                <span className="text-xs text-slate-400">({events.slice(3).length} data)</span>
                            </div>
                            {/* Pagination - Modern Style */}
                            {(() => {
                                const totalPages = Math.ceil(events.slice(3).length / HISTORY_PER_PAGE);
                                if (totalPages <= 1) return null;
                                
                                const renderPageButton = (page) => (
                                    <button
                                        key={page}
                                        onClick={() => setEventsHistoryPage(page)}
                                        className={`min-w-[32px] h-8 px-2 text-xs font-semibold rounded-md transition-all ${
                                            eventsHistoryPage === page
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                                
                                const pages = [];
                                pages.push(renderPageButton(1));
                                if (eventsHistoryPage > 3) {
                                    pages.push(<span key="dots1" className="text-slate-300 text-xs">...</span>);
                                }
                                const start = Math.max(2, eventsHistoryPage - 1);
                                const end = Math.min(totalPages - 1, eventsHistoryPage + 1);
                                for (let i = start; i <= end; i++) {
                                    if (i !== 1 && i !== totalPages) {
                                        pages.push(renderPageButton(i));
                                    }
                                }
                                if (eventsHistoryPage < totalPages - 2) {
                                    pages.push(<span key="dots2" className="text-slate-300 text-xs">...</span>);
                                }
                                if (totalPages > 1) {
                                    pages.push(renderPageButton(totalPages));
                                }
                                
                                return (
                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setEventsHistoryPage(p => Math.max(1, p - 1))}
                                            disabled={eventsHistoryPage === 1}
                                            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronLeft className="w-4 h-4"/>
                                        </button>
                                        <div className="flex items-center gap-0.5">{pages}</div>
                                        <button
                                            onClick={() => setEventsHistoryPage(p => Math.min(totalPages, p + 1))}
                                            disabled={eventsHistoryPage === totalPages}
                                            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronRight className="w-4 h-4"/>
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-left">
                                <tr>
                                    <th className="p-4 font-bold text-slate-600">Nama Kegiatan</th>
                                    <th className="p-4 font-bold text-slate-600">Kategori</th>
                                    <th className="p-4 font-bold text-slate-600">Tanggal</th>
                                    <th className="p-4 font-bold text-slate-600">Lokasi</th>
                                    <th className="p-4 font-bold text-slate-600 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.slice(3).slice((eventsHistoryPage - 1) * HISTORY_PER_PAGE, eventsHistoryPage * HISTORY_PER_PAGE).map(ev => (
                                    <tr 
                                        key={ev.id} 
                                        onClick={() => handleClickEvent(ev)}
                                        className={`border-t cursor-pointer transition-colors ${
                                            editingEventId === ev.id 
                                                ? 'bg-blue-50' 
                                                : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <td className="p-4">
                                            <p className="font-bold text-slate-800">{ev.title}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getEventCategoryColor(ev.category)}`}>
                                                {ev.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500 text-xs">{formatEventDate(ev.date)}</td>
                                        <td className="p-4 text-slate-500 text-xs">{ev.location}</td>
                                        <td className="p-4">
                                            <div className="flex gap-2 justify-center">
                                                {/* Tombol hapus hanya muncul jika punya akses */}
                                                {canEditEvent(ev) && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDelete('events', ev.id); }} 
                                                        className="text-red-400 hover:text-red-600 p-1"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="w-4 h-4"/>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                </>
            ) : (
                <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Form News (Kiri) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold">
                                {editingNewsId ? 'Edit Broadcast' : 'Kirim Broadcast'}
                            </h3>
                            {editingNewsId && (
                                <button 
                                    onClick={cancelEditNews}
                                    className="text-slate-400 hover:text-slate-600"
                                    title="Batal Edit"
                                >
                                    <X className="w-5 h-5"/>
                                </button>
                            )}
                        </div>
                        <form onSubmit={editingNewsId ? handleUpdateNews : handleAddNews} className="space-y-3">
                            <input 
                                className="w-full p-2 border rounded-lg text-sm font-bold" 
                                placeholder="Judul Pengumuman" 
                                value={formNews.title} 
                                onChange={e => setFormNews({...formNews, title: e.target.value})} 
                                required
                            />
                            <textarea 
                                className="w-full p-2 border rounded-lg text-sm h-32" 
                                placeholder="Isi pesan..." 
                                value={formNews.content} 
                                onChange={e => setFormNews({...formNews, content: e.target.value})} 
                                required
                            />
                            <select 
                                className="w-full p-2 border rounded-lg text-sm bg-white" 
                                value={formNews.category} 
                                onChange={e => setFormNews({...formNews, category: e.target.value})}
                            >
                                <option>Pengumuman</option>
                                <option>Keamanan</option>
                                <option>Kesehatan</option>
                                <option>Lingkungan</option>
                                <option>Keuangan</option>
                                <option>Kegiatan</option>
                            </select>
                            <button 
                                type="submit"
                                className={`w-full py-2 rounded-lg font-bold text-sm text-white ${
                                    editingNewsId 
                                        ? 'bg-blue-600 hover:bg-blue-700' 
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                {editingNewsId ? 'Simpan Perubahan' : 'Simpan'}
                            </button>
                        </form>
                    </div>
                    
                    {/* News List (Kanan) */}
                    <div className="md:col-span-2 space-y-4">
                        {/* 3 Berita Terbaru (Cards) */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-600">Berita Terbaru</h4>
                            {news.slice(0, 3).map(n => (
                                <div 
                                    key={n.id} 
                                    onClick={() => handleClickNews(n)}
                                    className={`bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center cursor-pointer transition-all ${
                                        editingNewsId === n.id 
                                            ? 'border-blue-500 ring-2 ring-blue-100' 
                                            : 'border-slate-100 hover:border-slate-300'
                                    }`}
                                >
                                    <div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold mb-1 inline-block ${getCategoryColor(n.cat || 'Pengumuman')}`}>
                                            {n.cat || 'Pengumuman'}
                                        </span>
                                        <h4 className="font-bold text-slate-800">{n.title}</h4>
                                        <p className="text-xs text-slate-500">{formatDate(n.createdAt)} - Oleh {n.sender}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {/* Tombol hapus hanya muncul jika punya akses */}
                                        {canEditNews(n) && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDelete('news', n.id); }} 
                                                className="text-red-400 hover:text-red-600 p-2"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* History Table - Full Width */}
                {news.length > 3 && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <h4 className="text-sm font-bold text-slate-700">Riwayat Berita</h4>
                                <span className="text-xs text-slate-400">({news.slice(3).length} data)</span>
                            </div>
                            {/* Pagination - Modern Style */}
                            {(() => {
                                const totalPages = Math.ceil(news.slice(3).length / HISTORY_PER_PAGE);
                                if (totalPages <= 1) return null;
                                
                                const renderPageButton = (page) => (
                                    <button
                                        key={page}
                                        onClick={() => setHistoryPage(page)}
                                        className={`min-w-[32px] h-8 px-2 text-xs font-semibold rounded-md transition-all ${
                                            historyPage === page
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                                
                                const pages = [];
                                
                                // Always show first page
                                pages.push(renderPageButton(1));
                                
                                // Show ellipsis if needed
                                if (historyPage > 3) {
                                    pages.push(<span key="dots1" className="text-slate-300 text-xs">...</span>);
                                }
                                
                                // Show current page and neighbors
                                const start = Math.max(2, historyPage - 1);
                                const end = Math.min(totalPages - 1, historyPage + 1);
                                
                                for (let i = start; i <= end; i++) {
                                    if (i !== 1 && i !== totalPages) {
                                        pages.push(renderPageButton(i));
                                    }
                                }
                                
                                // Show ellipsis before last
                                if (historyPage < totalPages - 2) {
                                    pages.push(<span key="dots2" className="text-slate-300 text-xs">...</span>);
                                }
                                
                                // Always show last page
                                if (totalPages > 1) {
                                    pages.push(renderPageButton(totalPages));
                                }
                                
                                return (
                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                            disabled={historyPage === 1}
                                            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronLeft className="w-4 h-4"/>
                                        </button>
                                        
                                        <div className="flex items-center gap-0.5">
                                            {pages}
                                        </div>
                                        
                                        <button
                                            onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                                            disabled={historyPage === totalPages}
                                            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronRight className="w-4 h-4"/>
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-left">
                                <tr>
                                    <th className="p-4 font-bold text-slate-600">Judul</th>
                                    <th className="p-4 font-bold text-slate-600">Kategori</th>
                                    <th className="p-4 font-bold text-slate-600">Tanggal</th>
                                    <th className="p-4 font-bold text-slate-600 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {news.slice(3).slice((historyPage - 1) * HISTORY_PER_PAGE, historyPage * HISTORY_PER_PAGE).map(n => (
                                    <tr 
                                        key={n.id} 
                                        onClick={() => handleClickNews(n)}
                                        className={`border-t cursor-pointer transition-colors ${
                                            editingNewsId === n.id 
                                                ? 'bg-blue-50' 
                                                : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <td className="p-4">
                                            <p className="font-bold text-slate-800">{n.title}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getCategoryColor(n.cat || 'Pengumuman')}`}>
                                                {n.cat || 'Pengumuman'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500 text-xs">
                                            {formatDate(n.createdAt)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2 justify-center">
                                                {/* Tombol hapus hanya muncul jika punya akses */}
                                                {canEditNews(n) && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDelete('news', n.id); }} 
                                                        className="text-red-400 hover:text-red-600 p-1"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="w-4 h-4"/>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                </>
            )}
        </div>
    );
};

export default ContentManager;
