import React, { useState, useEffect } from 'react';
import { Trash2, MessageCircle, Send, ChevronLeft, Loader2, Users, ShieldCheck, User, AlertCircle, X } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { db, APP_ID } from '../../config';
import { formatDate } from '../../utils';

const ForumManager = ({ user, role }) => {
    const [posts, setPosts] = useState([]);
    const [activeThread, setActiveThread] = useState(null);
    const [comments, setComments] = useState([]);
    const [newPost, setNewPost] = useState('');
    const [newComment, setNewComment] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'post'|'comment', id, title }
    
    // Posts Listener
    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(
            query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'posts'), orderBy('createdAt', 'desc')), 
            (s) => setPosts(s.docs.map(d => ({id: d.id, ...d.data()})))
        );
        return () => unsub();
    }, [user]);

    // Comments Listener (for active thread)
    useEffect(() => {
        if (!activeThread) {
            setComments([]);
            return;
        }
        const unsub = onSnapshot(
            query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'posts', activeThread.id, 'comments'), orderBy('createdAt', 'asc')),
            (s) => setComments(s.docs.map(d => ({id: d.id, ...d.data()})))
        );
        return () => unsub();
    }, [activeThread]);

    const handleAddPost = async (e) => {
        e.preventDefault();
        if (!newPost.trim() || isProcessing) return;
        setIsProcessing(true);
        try {
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'posts'), {
                content: newPost,
                author: role?.label || user?.email?.split('@')[0] || 'Admin',
                authorId: user?.uid,
                authorRole: role?.type || 'RT',
                rt: role?.type === 'RT' ? (role?.id || '') : '',
                createdAt: new Date().toISOString(),
                likes: 0,
                commentCount: 0,
                avatarColor: role?.type === 'RW' ? 'bg-indigo-600' : 'bg-orange-500'
            });
            setNewPost('');
        } catch (error) {
            alert("Gagal membuat postingan");
        }
        setIsProcessing(false);
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !activeThread || isProcessing) return;
        setIsProcessing(true);
        try {
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'posts', activeThread.id, 'comments'), {
                content: newComment,
                author: role?.label || 'Admin',
                authorId: user?.uid,
                authorRole: role?.type || 'RW',
                createdAt: new Date().toISOString()
            });
            setNewComment('');
        } catch (error) {
            alert("Gagal membalas");
        }
        setIsProcessing(false);
    };

    const confirmDelete = (type, id, title) => {
        setDeleteConfirm({ type, id, title });
    };

    const executeDelete = async () => {
        if (!deleteConfirm) return;
        setIsProcessing(true);
        try {
            if (deleteConfirm.type === 'post') {
                await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'posts', deleteConfirm.id));
                if (activeThread?.id === deleteConfirm.id) setActiveThread(null);
            } else if (deleteConfirm.type === 'comment') {
                await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'posts', activeThread.id, 'comments', deleteConfirm.id));
            }
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus: ' + err.message);
        }
        setIsProcessing(false);
        setDeleteConfirm(null);
    };

    const handleDeletePost = (id, e) => {
        e.stopPropagation();
        if (role?.type !== 'RW') return;
        const post = posts.find(p => p.id === id);
        confirmDelete('post', id, post?.content?.substring(0, 60) || 'Postingan ini');
    };

    const handleDeleteComment = (commentId) => {
        if (role?.type !== 'RW') return;
        const comment = comments.find(c => c.id === commentId);
        confirmDelete('comment', commentId, comment?.content?.substring(0, 60) || 'Komentar ini');
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Users className="text-emerald-600"/> Forum Warga
                </h2>
                {activeThread && (
                    <button 
                        onClick={() => setActiveThread(null)}
                        className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-emerald-600 bg-white px-3 py-1.5 rounded-lg border shadow-sm transition-all"
                    >
                        <ChevronLeft className="w-4 h-4"/> Kembali ke Daftar
                    </button>
                )}
            </div>
            
            {!activeThread ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Input Area (Kiri) */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-6">
                            <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-700">
                                <Send className="w-4 h-4 text-emerald-500"/> Sampaikan Sesuatu
                            </h3>
                            <form onSubmit={handleAddPost} className="space-y-4">
                                <textarea 
                                    className="w-full p-4 bg-slate-50 border-none rounded-xl text-sm h-32 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                    placeholder="Tulis pesan untuk seluruh warga..."
                                    value={newPost}
                                    onChange={e => setNewPost(e.target.value)}
                                    required
                                />
                                <button 
                                    type="submit"
                                    disabled={!newPost.trim() || isProcessing}
                                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Posting Sekarang'}
                                </button>
                                <p className="text-[10px] text-slate-400 italic text-center">Postingan admin akan ditandai dengan badge khusus.</p>
                            </form>
                        </div>
                    </div>

                    {/* Posts List (Kanan) */}
                    <div className="lg:col-span-2 space-y-4">
                        {posts.length === 0 ? (
                            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center">
                                <MessageCircle className="w-12 h-12 text-slate-200 mx-auto mb-3"/>
                                <p className="text-slate-400 text-sm">Belum ada diskusi di forum warga.</p>
                            </div>
                        ) : posts.map(post => (
                            <div 
                                key={post.id} 
                                onClick={() => setActiveThread(post)}
                                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-emerald-200 transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl ${post.avatarColor || 'bg-slate-200'} flex items-center justify-center text-white font-black shadow-inner`}>
                                            {post.author.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-800">{post.author}</span>
                                                {post.authorRole === 'RW' && <span className="text-[8px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black uppercase">Admin RW</span>}
                                                {post.authorRole === 'RT' && <span className="text-[8px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-black uppercase">Ketua RT {post.rt}</span>}
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                {formatDate(post.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    {role?.type === 'RW' && (
                                        <button 
                                            onClick={(e) => handleDeletePost(post.id, e)} 
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 rounded-xl text-xs font-bold transition-all border border-red-100 hover:border-red-200 shadow-sm"
                                            title="Hapus Postingan"
                                        >
                                            <Trash2 className="w-3.5 h-3.5"/>
                                            Hapus
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>
                                <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                                    <span className="flex items-center gap-1.5 group-hover:text-emerald-600 transition-colors">
                                        <MessageCircle className="w-4 h-4"/> Kelola Diskusi
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* Thread View (Moderasi) */
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
                    <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${activeThread.avatarColor || 'bg-slate-200'} flex items-center justify-center text-white font-bold text-xs`}>
                                {activeThread.author.charAt(0)}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-800">Diskusi oleh {activeThread.author}</p>
                                <p className="text-[10px] text-slate-400">{formatDate(activeThread.createdAt)}</p>
                            </div>
                        </div>
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Panel Moderasi</div>
                    </div>

                    <div className="flex-1 p-6 space-y-6 bg-slate-50/30 overflow-y-auto max-h-[500px]">
                        {/* Original Post Banner */}
                        <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm relative pr-12">
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{activeThread.content}</p>
                            {role?.type === 'RW' && (
                                <button 
                                    onClick={(e) => handleDeletePost(activeThread.id, e)}
                                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 p-1"
                                >
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                            )}
                        </div>

                        {/* Comments */}
                        <div className="space-y-4 pt-4">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MessageCircle className="w-3 h-3"/> Balasan ({comments.length})
                            </h4>
                            
                            {comments.map(comment => (
                                <div 
                                    key={comment.id} 
                                    className={`flex items-start gap-3 group ${comment.authorId === user?.uid ? 'flex-row-reverse' : ''}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">
                                        {comment.authorId === user?.uid ? <ShieldCheck className="w-4 h-4 text-emerald-600"/> : <User className="w-4 h-4"/>}
                                    </div>
                                    <div className={`flex flex-col ${comment.authorId === user?.uid ? 'items-end' : ''}`}>
                                        <div className="flex items-center gap-2 mb-1 px-1">
                                            <span className="text-[10px] font-bold text-slate-500">{comment.author}</span>
                                            {comment.authorRole === 'RW' && <span className="text-[7px] bg-indigo-600 text-white px-1 py-0.5 rounded font-black">RW</span>}
                                            {comment.authorRole === 'RT' && <span className="text-[7px] bg-orange-500 text-white px-1 py-0.5 rounded font-black">RT</span>}
                                        </div>
                                        <div className={`p-4 rounded-2xl text-xs relative group ${
                                            comment.authorId === user?.uid 
                                                ? 'bg-emerald-600 text-white rounded-tr-none' 
                                                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none pr-10'
                                        }`}>
                                            {comment.content}
                                            {role?.type === 'RW' && (
                                                <button 
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all text-slate-300"
                                                >
                                                    <Trash2 className="w-3 h-3"/>
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-[8px] text-slate-400 mt-1 px-2">{formatDate(comment.createdAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reply Input */}
                    <div className="p-4 bg-white border-t">
                        <form onSubmit={handleAddComment} className="flex gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 focus-within:border-emerald-200 transition-all">
                            <input 
                                className="flex-1 bg-transparent border-none text-sm px-3 outline-none"
                                placeholder="Tulis balasan atau tanggapan admin..."
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                            />
                            <button 
                                type="submit"
                                disabled={!newComment.trim() || isProcessing}
                                className="bg-emerald-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                            >
                                <Send className="w-4 h-4"/>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-xl">
                                    <AlertCircle className="w-6 h-6 text-red-600"/>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Konfirmasi Hapus</h3>
                            </div>
                            <button onClick={() => setDeleteConfirm(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-slate-400"/>
                            </button>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">Apakah Anda yakin ingin menghapus {deleteConfirm.type === 'post' ? 'postingan' : 'komentar'} ini?</p>
                        <div className="bg-slate-50 p-3 rounded-xl mb-5 border border-slate-100">
                            <p className="text-xs text-slate-500 italic line-clamp-2">"{deleteConfirm.title}..."</p>
                        </div>
                        <p className="text-[11px] text-red-500 mb-4 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3"/> Aksi ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={executeDelete}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-100"
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4"/>}
                                {isProcessing ? 'Menghapus...' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ForumManager;
