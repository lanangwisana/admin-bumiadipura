import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, APP_ID } from '../../config';
import { formatDate } from '../../utils';

const ForumManager = ({ user }) => {
    const [posts, setPosts] = useState([]);
    
    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(
            query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'posts'), orderBy('createdAt', 'desc')), 
            (s) => setPosts(s.docs.map(d => ({id: d.id, ...d.data()})))
        );
        return () => unsub();
    }, [user]);

    const handleDelete = async (id) => { 
        if (confirm("Hapus postingan ini?")) {
            await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'posts', id)); 
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-800">Moderasi Forum Warga</h2>
            
            <div className="grid gap-4">
                {posts.map(post => (
                    <div 
                        key={post.id} 
                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-start"
                    >
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                    {post.author}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    {formatDate(post.createdAt)}
                                </span>
                            </div>
                            <p className="text-sm text-slate-700">{post.content}</p>
                        </div>
                        <button 
                            onClick={() => handleDelete(post.id)} 
                            className="text-red-400 hover:text-red-600 p-2"
                        >
                            <Trash2 className="w-5 h-5"/>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ForumManager;
