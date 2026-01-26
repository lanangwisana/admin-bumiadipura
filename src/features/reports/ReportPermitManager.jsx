import React, { useState, useEffect } from 'react';
import { AlertTriangle, FileCheck } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db, APP_ID } from '../../config';
import { formatDate } from '../../utils';

const ReportPermitManager = ({ user }) => {
    const [activeTab, setActiveTab] = useState('reports');
    const [data, setData] = useState([]);

    useEffect(() => {
        if (!user) return;
        const colName = activeTab === 'reports' ? 'reports' : 'permits';
        const unsub = onSnapshot(
            query(collection(db, 'artifacts', APP_ID, 'public', 'data', colName), orderBy('createdAt', 'desc')), 
            (s) => setData(s.docs.map(d => ({id: d.id, ...d.data()})))
        );
        return () => unsub();
    }, [user, activeTab]);

    const updateStatus = async (id, status) => { 
        const colName = activeTab === 'reports' ? 'reports' : 'permits';
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', colName, id), { status }); 
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Pusat Layanan Warga</h2>
                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('reports')} 
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            activeTab === 'reports' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'
                        }`}
                    >
                        Keluhan / Laporan
                    </button>
                    <button 
                        onClick={() => setActiveTab('permits')} 
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            activeTab === 'permits' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'
                        }`}
                    >
                        Surat & Izin
                    </button>
                </div>
            </div>

            {/* Items List */}
            <div className="grid gap-4">
                {data.map(item => (
                    <div 
                        key={item.id} 
                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-center"
                    >
                        {/* Status Icon */}
                        <div className={`p-3 rounded-full ${
                            item.status === 'OPEN' || item.status === 'PENDING' 
                                ? 'bg-red-100 text-red-600'
                                : item.status === 'IN_PROGRESS' 
                                    ? 'bg-yellow-100 text-yellow-600'
                                    : 'bg-green-100 text-green-600'
                        }`}>
                            {activeTab === 'reports' 
                                ? <AlertTriangle className="w-6 h-6"/> 
                                : <FileCheck className="w-6 h-6"/>
                            }
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1">
                            <div className="flex gap-2 mb-1">
                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">
                                    {item.status}
                                </span>
                                <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
                            </div>
                            <h3 className="font-bold text-slate-800">
                                {activeTab === 'reports' ? item.category : item.type}
                            </h3>
                            <p className="text-sm text-slate-600">{item.description}</p>
                            <p className="text-xs text-slate-400 mt-1 font-mono">
                                Warga: {item.userName} ({item.userUnit})
                            </p>
                            {item.isBlockingRoad && (
                                <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 rounded mt-1 inline-block">
                                    ⚠️ Menutup Jalan
                                </span>
                            )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            {activeTab === 'reports' ? (
                                <>
                                    {item.status !== 'IN_PROGRESS' && item.status !== 'DONE' && (
                                        <button 
                                            onClick={() => updateStatus(item.id, 'IN_PROGRESS')} 
                                            className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded text-xs font-bold hover:bg-yellow-200"
                                        >
                                            Proses
                                        </button>
                                    )}
                                    {item.status !== 'DONE' && (
                                        <button 
                                            onClick={() => updateStatus(item.id, 'DONE')} 
                                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded text-xs font-bold hover:bg-green-200"
                                        >
                                            Selesai
                                        </button>
                                    )}
                                </>
                            ) : (
                                <>
                                    {item.status === 'PENDING' && (
                                        <>
                                            <button 
                                                onClick={() => updateStatus(item.id, 'REJECTED')} 
                                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200"
                                            >
                                                Tolak
                                            </button>
                                            <button 
                                                onClick={() => updateStatus(item.id, 'APPROVED')} 
                                                className="px-3 py-1.5 bg-green-100 text-green-700 rounded text-xs font-bold hover:bg-green-200"
                                            >
                                                Setujui
                                            </button>
                                        </>
                                    )}
                                    {item.status === 'APPROVED' && (
                                        <button className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded text-xs font-bold cursor-default">
                                            Disetujui
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReportPermitManager;
