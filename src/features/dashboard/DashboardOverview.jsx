import React, { useState, useEffect } from 'react';
import { 
    Users, CreditCard, AlertTriangle, Shield, 
    Radio, Brain, Sparkles, RefreshCw, BookOpen, FileText 
} from 'lucide-react';
import { doc, onSnapshot, collection, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import { db, APP_ID } from '../../config';
import { formatDate } from '../../utils';
import { callGeminiAPI } from '../../utils';
import { StatCard, BroadcastModal } from './components';

const DashboardOverview = ({ user, role }) => {
    const [stats, setStats] = useState({ 
        residents: 0, 
        pendingBills: 0, 
        openReports: 0, 
        gateStatus: 'Loading...' 
    });
    const [recentReports, setRecentReports] = useState([]);
    const [dailyBriefing, setDailyBriefing] = useState('');
    const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
    const [showBroadcast, setShowBroadcast] = useState(false);

    useEffect(() => {
        if (!user) return;
        
        const unsubGate = onSnapshot(
            doc(db, 'artifacts', APP_ID, 'public', 'data', 'iot_devices', 'gate_main'), 
            (s) => { 
                if(s.exists()) setStats(prev => ({...prev, gateStatus: s.data().isOpen ? 'TERBUKA' : 'TERTUTUP'}));
            }
        );
        
        const unsubResidents = onSnapshot(
            collection(db, 'artifacts', APP_ID, 'public', 'data', 'residents'), 
            (s) => setStats(prev => ({...prev, residents: s.size}))
        );
        
        const unsubReports = onSnapshot(
            query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports'), where('status', '==', 'OPEN')), 
            (s) => setStats(prev => ({...prev, openReports: s.size}))
        );
        
        // Recent Reports
        const unsubList = onSnapshot(
            query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports'), orderBy('createdAt', 'desc'), limit(3)), 
            (s) => setRecentReports(s.docs.map(d => ({id: d.id, ...d.data()})))
        );
        
        return () => { 
            unsubGate(); 
            unsubResidents(); 
            unsubReports(); 
            unsubList(); 
        };
    }, [user]);

    const generateBriefing = async () => {
        setIsGeneratingBriefing(true);
        const prompt = `Buat ringkasan harian admin: ${stats.residents} warga total, ${stats.openReports} laporan warga menunggu, status gerbang utama ${stats.gateStatus}. Berikan saran prioritas.`;
        const result = await callGeminiAPI(prompt);
        setDailyBriefing(result);
        setIsGeneratingBriefing(false);
    };

    const sendBroadcast = async (data) => {
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'news'), {
            ...data,
            cat: 'Pengumuman',
            date: new Date().toLocaleDateString(),
            sender: role.label,
            createdAt: new Date().toISOString(),
            image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80',
            color: 'bg-red-100 text-red-700'
        });
        setShowBroadcast(false);
        alert("Broadcast terkirim!");
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard Utama</h2>
                    <p className="text-slate-500 font-medium">Overview aktivitas Bumi Adipura hari ini.</p>
                </div>
                <button 
                    onClick={() => setShowBroadcast(true)} 
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 hover:bg-slate-800 shadow-xl shadow-slate-200 transition-transform active:scale-95"
                >
                    <Radio className="w-5 h-5 text-red-400 animate-pulse"/>
                    Buat Pengumuman
                </button>
            </div>

            {/* AI Insight */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 p-8 opacity-10">
                    <Brain className="w-40 h-40 text-white" />
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-2xl font-bold flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-yellow-300" />
                                AI Daily Insight
                            </h3>
                            <p className="text-blue-100 mt-1">Asisten cerdas untuk efisiensi kerja admin.</p>
                        </div>
                        <button 
                            onClick={generateBriefing} 
                            disabled={isGeneratingBriefing} 
                            className="bg-white/20 hover:bg-white/30 px-5 py-2.5 rounded-xl text-sm font-bold backdrop-blur-md transition-colors flex items-center gap-2"
                        >
                            {isGeneratingBriefing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                            {isGeneratingBriefing ? 'Menganalisis...' : 'Analisa Harian'}
                        </button>
                    </div>
                    {dailyBriefing && (
                        <div className="bg-black/20 p-5 rounded-2xl border border-white/10 backdrop-blur-sm animate-fade-in">
                            <div className="prose prose-sm prose-invert max-w-none font-medium whitespace-pre-wrap leading-relaxed">
                                {dailyBriefing}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Warga" value={stats.residents} sub="Terdaftar Aktif" icon={Users} color="bg-blue-500" />
                <StatCard title="Tagihan Pending" value="---" sub="Bulan Ini" icon={CreditCard} color="bg-orange-500" />
                <StatCard title="Laporan Baru" value={stats.openReports} sub="Menunggu Respon" icon={AlertTriangle} color="bg-red-500" />
                <StatCard title="Main Gate" value={stats.gateStatus} sub="Status IoT Realtime" icon={Shield} color={stats.gateStatus === 'TERBUKA' ? 'bg-red-500' : 'bg-green-500'} />
            </div>

            {/* Reports Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-orange-500"/>
                        Laporan Warga Terbaru
                    </h3>
                    <button className="text-xs font-bold text-blue-600 hover:underline">Lihat Semua</button>
                </div>
                <div className="divide-y divide-slate-100">
                    {recentReports.length === 0 ? (
                        <p className="p-8 text-center text-slate-400 italic">Tidak ada laporan baru.</p>
                    ) : (
                        recentReports.map(r => (
                            <div key={r.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                    r.status === 'OPEN' ? 'bg-red-500' : 
                                    r.status === 'IN_PROGRESS' ? 'bg-yellow-500' : 'bg-green-500'
                                }`}></div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-800 text-sm">{r.category}</h4>
                                    <p className="text-xs text-slate-500 truncate">{r.description}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-700">{r.userName}</p>
                                    <p className="text-[10px] text-slate-400">{formatDate(r.createdAt)}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Broadcast Modal */}
            <BroadcastModal 
                isOpen={showBroadcast} 
                onClose={() => setShowBroadcast(false)} 
                onSubmit={sendBroadcast}
                role={role}
            />
        </div>
    );
};

export default DashboardOverview;
