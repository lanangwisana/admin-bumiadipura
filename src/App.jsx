import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, CreditCard, FileText, 
  Bell, Settings, Search, LogOut, Shield, 
  Activity, CheckCircle, XCircle, AlertTriangle,
  Megaphone, Sparkles, Lock, Unlock, RefreshCw,
  MoreVertical, ChevronRight, Plus, Brain, MessageSquare, 
  Copy, Edit, Trash2, UserPlus, Home, Phone, Save, List,
  TrendingUp, TrendingDown, PieChart, Download, DollarSign,
  BookOpen, Send, MapPin, Database, Filter, Eye, Loader2, LogIn, Menu, User, Calendar, 
  UserCog, MessageCircle, Video, Radio, FileCheck, X, Wallet, Receipt
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, 
  onSnapshot, query, orderBy, addDoc, updateDoc,
  deleteDoc, where, limit, getDocs, writeBatch
} from 'firebase/firestore';

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyA2V3XkcYmzTMheaLRmbrz28rJx42DGNds",
  authDomain: "bumi-adipura.firebaseapp.com",
  projectId: "bumi-adipura",
  storageBucket: "bumi-adipura.firebasestorage.app",
  messagingSenderId: "359691605712",
  appId: "1:359691605712:web:50fcba6d5e374f1fdc30d5"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'bumi-adipura-v1';

// my first commit
// --- ASSETS ---
const logoUrl = "https://lh3.googleusercontent.com/d/1oPheVvQCJmnBBxqfBp1Ev9iHfebaOSvb"; 

// --- HELPERS ---
const formatDate = (isoString) => {
    if(!isoString) return '-';
    return new Date(isoString).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
};

const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

const callGeminiAPI = async (prompt, systemInstruction = "") => {
  const apiKey = ""; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] }
  };
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal memproses AI.";
  } catch (error) { return "Error koneksi AI."; }
};

// --- DATA SEEDER ---
const seedDatabase = async () => {
    // 1. Residents
    const residentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'residents');
    const resSnap = await getDocs(residentsRef);
    if (resSnap.empty) {
        const dummyResidents = [
            { name: "Andi Agus Salim", unit: "A1/18", phone: "081234567890", job: "Dosen", status: "Tetap", family: [{name: "Siti", relation: "Istri"}, {name: "Budi", relation: "Anak"}], cluster: "Cluster A", createdAt: new Date().toISOString() },
            { name: "Budi Santoso", unit: "A2/05", phone: "081298765432", job: "Wiraswasta", status: "Tetap", family: [{name: "Ani", relation: "Istri"}], cluster: "Cluster A", createdAt: new Date().toISOString() },
            { name: "Citra Dewi", unit: "B1/12", phone: "081345678901", job: "Dokter", status: "Kontrak", family: [], cluster: "Cluster B", createdAt: new Date().toISOString() },
            { name: "Doni Pratama", unit: "C3/09", phone: "081456789012", job: "Karyawan Swasta", status: "Tetap", family: [{name: "Eka", relation: "Istri"}, {name: "Fajar", relation: "Anak"}], cluster: "Cluster C", createdAt: new Date().toISOString() },
             { name: "Eko Yulianto", unit: "A1/20", phone: "081567890123", job: "PNS", status: "Tetap", family: [{name: "Rina", relation: "Istri"}], cluster: "Cluster A", createdAt: new Date().toISOString() }
        ];
        dummyResidents.forEach(async (r) => await addDoc(residentsRef, r));
        console.log("Seeded Residents");
    }

    // 2. Transactions
    const transRef = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');
    const transSnap = await getDocs(transRef);
    if (transSnap.empty) {
        const dummyTrans = [
            { type: "Pemasukan", category: "IPL", amount: 2500000, description: "IPL Cluster A - Jan 2025", date: "2025-01-05", scope: "RW", createdBy: "Admin RW", createdAt: new Date().toISOString() },
            { type: "Pengeluaran", category: "Operasional", amount: 1500000, description: "Gaji Keamanan (3 Org)", date: "2025-01-02", scope: "RW", createdBy: "Admin RW", createdAt: new Date().toISOString() },
             { type: "Pemasukan", category: "Sumbangan", amount: 500000, description: "Sumbangan 17an Warga", date: "2024-08-10", scope: "RT01", createdBy: "Ketua RT 01", createdAt: new Date().toISOString() },
            { type: "Pengeluaran", category: "Perbaikan", amount: 300000, description: "Ganti Lampu Jalan Blok A", date: "2025-01-10", scope: "RT01", createdBy: "Ketua RT 01", createdAt: new Date().toISOString() }
        ];
        dummyTrans.forEach(async (t) => await addDoc(transRef, t));
        console.log("Seeded Transactions");
    }

    // 3. Events
    const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');
    const eventsSnap = await getDocs(eventsRef);
    if (eventsSnap.empty) {
        const dummyEvents = [
             { title: 'Posyandu Balita', date: '15 Jan 2025', location: 'Balai RW', category: 'Kesehatan' },
             { title: 'Pengajian Rutin', date: '20 Jan 2025', location: 'Masjid Al Kahfi', category: 'Keagamaan' },
             { title: 'Kerja Bakti', date: '25 Jan 2025', location: 'Lingkungan RT 06', category: 'Lingkungan' },
             { title: 'Rapat Pengurus', date: '01 Feb 2025', location: 'Rumah Pak RW', category: 'Umum' }
        ];
        dummyEvents.forEach(async (e) => await addDoc(eventsRef, e));
         console.log("Seeded Events");
    }

     // 4. News
    const newsRef = collection(db, 'artifacts', appId, 'public', 'data', 'news');
    const newsSnap = await getDocs(newsRef);
    if (newsSnap.empty) {
        const dummyNews = [
            { title: "Jadwal Pengambilan Sampah Baru", content: "Mulai bulan depan, pengambilan sampah akan dilakukan setiap hari Senin dan Kamis pagi.", date: "10 Jan 2025", cat: "Pengumuman", sender: "Pengurus RW", color: "bg-blue-100 text-blue-700", createdAt: new Date().toISOString() },
             { title: "Waspada Demam Berdarah", content: "Mohon warga rutin menguras bak mandi dan menutup tempat penampungan air.", date: "12 Jan 2025", cat: "Kesehatan", sender: "Puskesmas", color: "bg-red-100 text-red-700", createdAt: new Date().toISOString() }
        ];
         dummyNews.forEach(async (n) => await addDoc(newsRef, n));
         console.log("Seeded News");
    }

    // 5. Reports
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
    const repSnap = await getDocs(reportsRef);
    if(repSnap.empty) {
         const dummyReports = [
            { category: 'Keamanan', description: 'Ada orang mencurigakan di sekitar taman blok A jam 2 malam.', status: 'OPEN', createdAt: new Date().toISOString(), userId: 'dummy_user_1', userName: 'Budi Santoso', userUnit: 'A2/05' },
            { category: 'Kebersihan', description: 'Sampah di tong sampah umum sudah penuh belum diangkut.', status: 'IN_PROGRESS', createdAt: new Date(Date.now() - 86400000).toISOString(), userId: 'dummy_user_2', userName: 'Citra Dewi', userUnit: 'B1/12' },
             { category: 'Infrastruktur', description: 'Lampu PJU di jalan utama mati.', status: 'DONE', createdAt: new Date(Date.now() - 172800000).toISOString(), userId: 'dummy_user_3', userName: 'Doni Pratama', userUnit: 'C3/09' }

         ];
         dummyReports.forEach(async (r) => await addDoc(reportsRef, r));
         console.log("Seeded Reports");
    }

     // 6. Posts (Forum)
    const postsRef = collection(db, 'artifacts', appId, 'public', 'data', 'posts');
    const postSnap = await getDocs(postsRef);
    if(postSnap.empty) {
        const dummyPosts = [
            { content: "Info tukang galon yang masih buka jam segini dong?", author: "Andi Agus", createdAt: new Date().toISOString(), likes: 2 },
            { content: "Ada yang nemu kucing warna oranye di sekitar blok B?", author: "Citra Dewi", createdAt: new Date(Date.now() - 3600000).toISOString(), likes: 5 },
             { content: "Terima kasih bapak-bapak yang sudah bantu kerja bakti tadi pagi.", author: "Pak RT 01", createdAt: new Date(Date.now() - 7200000).toISOString(), likes: 10 }
        ];
        dummyPosts.forEach(async (p) => await addDoc(postsRef, p));
        console.log("Seeded Posts");
    }
};

// --- COMPONENTS ---

// 1. LOGIN SCREEN
const AdminLogin = ({ onLogin }) => {
    const [roleType, setRoleType] = useState('RW'); // RW | RT
    const [rtNumber, setRtNumber] = useState('01');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-seed Default Admin if DB is empty
    useEffect(() => {
        const checkSeed = async () => {
            const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'admin_accounts'));
            const snap = await getDocs(q);
            if (snap.empty) {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'admin_accounts'), {
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
                    <div className="text-center mb-8">
                        <div className="w-24 h-24 bg-emerald-800 rounded-3xl mx-auto flex items-center justify-center shadow-lg mb-4 p-2">
    <img src={logoUrl} className="w-full h-full object-contain brightness-0 invert" alt="Logo" />
</div>
                        <h1 className="text-2xl font-bold text-slate-800">Admin Panel</h1>
                        <p className="text-slate-500 text-sm">Bumi Adipura Smart System</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="bg-slate-100 p-1 rounded-xl flex">
                            <button type="button" onClick={()=>setRoleType('RW')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${roleType==='RW'?'bg-white shadow text-emerald-600':'text-slate-400 hover:text-slate-600'}`}>Pengurus RW</button>
                            <button type="button" onClick={()=>setRoleType('RT')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${roleType==='RT'?'bg-white shadow text-blue-600':'text-slate-400 hover:text-slate-600'}`}>Ketua RT</button>
                        </div>

                        {roleType === 'RT' && (
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wilayah</label>
                                <select value={rtNumber} onChange={e=>setRtNumber(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl mt-1 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={`0${n}`}>RT 0{n}</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kode Akses</label>
                            <div className="relative mt-1">
                                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400"/>
                                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-3 pl-10 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-slate-800" placeholder="••••••" required/>
                            </div>
                        </div>

                        <button disabled={loading} className="w-full bg-emerald-800 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-emerald-900 transition-transform active:scale-95 flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <LogIn className="w-5 h-5"/>}
                            {loading ? 'Memverifikasi...' : 'Masuk Dashboard'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

// 2. DASHBOARD SIDEBAR
const Sidebar = ({ activeTab, setActiveTab, role, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'residents', label: 'Data Warga', icon: Users },
    { id: 'finance', label: 'Keuangan & IPL', icon: DollarSign }, 
    { id: 'reports', label: 'Laporan & Izin', icon: FileCheck },
    { id: 'content', label: 'Info & Kegiatan', icon: Calendar },
    { id: 'forum', label: 'Forum Warga', icon: MessageCircle },
    { id: 'users', label: 'Manajemen User', icon: UserCog, role: 'RW' },
    { id: 'iot', label: 'Security Center', icon: Shield },
  ];

  return (
    <div className="w-64 bg-emerald-900 text-white flex flex-col h-screen fixed left-0 top-0 z-20 hidden md:flex shadow-2xl border-r border-emerald-800">
      <div className="p-6 flex items-center gap-3 border-b border-emerald-800">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 overflow-hidden shadow-md transform rotate-3">
           <img src={logoUrl} className="w-full h-full object-contain" alt="Logo" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight text-white leading-none">Bumi<span className="text-yellow-400">Adipura</span></h1>
          <p className="text-[10px] text-emerald-300 mt-1 uppercase tracking-wider">Admin System v3.2</p>
        </div>
      </div>
      
      <div className="p-4">
          <div className="bg-emerald-800/50 p-4 rounded-xl border border-emerald-700/50">
              <p className="text-[10px] text-emerald-300 font-bold uppercase mb-1">Login Sebagai</p>
              <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                      {role.type}
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{role.label}</p>
                      <p className="text-[10px] text-emerald-200 truncate">Akses Penuh</p>
                  </div>
              </div>
          </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {menuItems.filter(i => !i.role || i.role === role.type).map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-900/50 border-l-4 border-yellow-400' : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'}`}>
            <item.icon className="w-5 h-5" /><span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-emerald-800">
          <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-3 bg-emerald-950/50 hover:bg-red-900/80 text-emerald-100 hover:text-white rounded-xl transition-colors text-sm font-bold">
            <LogOut className="w-4 h-4"/> Keluar Aplikasi
          </button>
      </div>
    </div>
  );
};

// --- MODULE: DASHBOARD OVERVIEW ---
const DashboardOverview = ({ user, role }) => {
  const [stats, setStats] = useState({ residents: 0, pendingBills: 0, openReports: 0, gateStatus: 'Loading...' });
  const [recentReports, setRecentReports] = useState([]);
  const [dailyBriefing, setDailyBriefing] = useState('');
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastData, setBroadcastData] = useState({ title: '', message: '' });

  useEffect(() => {
    if (!user) return;
    const unsubGate = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'iot_devices', 'gate_main'), s => { if(s.exists()) setStats(prev => ({...prev, gateStatus: s.data().isOpen ? 'TERBUKA' : 'TERTUTUP'})) });
    const unsubResidents = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'residents'), s => setStats(prev => ({...prev, residents: s.size})));
    const unsubReports = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), where('status', '==', 'OPEN')), s => setStats(prev => ({...prev, openReports: s.size})));
    
    // Recent Reports
    const unsubList = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), orderBy('createdAt', 'desc'), limit(3)), s => setRecentReports(s.docs.map(d => ({id:d.id, ...d.data()}))));
    
    return () => { unsubGate(); unsubResidents(); unsubReports(); unsubList(); };
  }, [user]);

  const generateBriefing = async () => {
    setIsGeneratingBriefing(true);
    const prompt = `Buat ringkasan harian admin: ${stats.residents} warga total, ${stats.openReports} laporan warga menunggu, status gerbang utama ${stats.gateStatus}. Berikan saran prioritas.`;
    const result = await callGeminiAPI(prompt);
    setDailyBriefing(result);
    setIsGeneratingBriefing(false);
  };

  const sendBroadcast = async (e) => {
    e.preventDefault();
    if(!broadcastData.title) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'news'), {
        ...broadcastData,
        cat: 'Pengumuman',
        date: new Date().toLocaleDateString(),
        sender: role.label,
        createdAt: new Date().toISOString(),
        image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80',
        color: 'bg-red-100 text-red-700'
    });
    setShowBroadcast(false); setBroadcastData({title:'', message:''});
    alert("Broadcast terkirim!");
  };

  const StatCard = ({ title, value, icon: Icon, color, sub }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className={`absolute right-0 top-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 transition-transform group-hover:scale-110`}><Icon className="w-16 h-16 text-slate-800" /></div>
        <div className={`p-4 rounded-xl ${color} shadow-lg shadow-slate-200`}><Icon className="w-8 h-8 text-white" /></div>
        <div>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">{title}</p>
            <h3 className="text-2xl font-black text-slate-800">{value}</h3>
            {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
        </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
         <div><h2 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard Utama</h2><p className="text-slate-500 font-medium">Overview aktivitas Bumi Adipura hari ini.</p></div>
         <button onClick={() => setShowBroadcast(true)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 hover:bg-slate-800 shadow-xl shadow-slate-200 transition-transform active:scale-95"><Radio className="w-5 h-5 text-red-400 animate-pulse"/> Buat Pengumuman</button>
       </div>

       {/* AI Insight */}
       <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
         <div className="absolute right-0 top-0 p-8 opacity-10"><Brain className="w-40 h-40 text-white" /></div>
         <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
               <div><h3 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="w-6 h-6 text-yellow-300" /> AI Daily Insight</h3><p className="text-blue-100 mt-1">Asisten cerdas untuk efisiensi kerja admin.</p></div>
               <button onClick={generateBriefing} disabled={isGeneratingBriefing} className="bg-white/20 hover:bg-white/30 px-5 py-2.5 rounded-xl text-sm font-bold backdrop-blur-md transition-colors flex items-center gap-2">{isGeneratingBriefing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}{isGeneratingBriefing ? 'Menganalisis...' : 'Analisa Harian'}</button>
            </div>
            {dailyBriefing && <div className="bg-black/20 p-5 rounded-2xl border border-white/10 backdrop-blur-sm animate-fade-in"><div className="prose prose-sm prose-invert max-w-none font-medium whitespace-pre-wrap leading-relaxed">{dailyBriefing}</div></div>}
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <StatCard title="Total Warga" value={stats.residents} sub="Terdaftar Aktif" icon={Users} color="bg-blue-500" />
           <StatCard title="Tagihan Pending" value="---" sub="Bulan Ini" icon={CreditCard} color="bg-orange-500" />
           <StatCard title="Laporan Baru" value={stats.openReports} sub="Menunggu Respon" icon={AlertTriangle} color="bg-red-500" />
           <StatCard title="Main Gate" value={stats.gateStatus} sub="Status IoT Realtime" icon={Shield} color={stats.gateStatus==='TERBUKA'?'bg-red-500':'bg-green-500'} />
       </div>

       {/* Reports Table */}
       <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-orange-500"/> Laporan Warga Terbaru</h3>
                <button className="text-xs font-bold text-blue-600 hover:underline">Lihat Semua</button>
            </div>
            <div className="divide-y divide-slate-100">
                {recentReports.length === 0 ? <p className="p-8 text-center text-slate-400 italic">Tidak ada laporan baru.</p> : recentReports.map(r => (
                    <div key={r.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${r.status==='OPEN'?'bg-red-500':r.status==='IN_PROGRESS'?'bg-yellow-500':'bg-green-500'}`}></div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 text-sm">{r.category}</h4>
                            <p className="text-xs text-slate-500 truncate">{r.description}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-700">{r.userName}</p>
                            <p className="text-[10px] text-slate-400">{formatDate(r.createdAt)}</p>
                        </div>
                    </div>
                ))}
            </div>
       </div>

       {/* Broadcast Modal */}
       {showBroadcast && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-xl text-slate-800">Buat Pengumuman</h3>
                 <button onClick={()=>setShowBroadcast(false)} className="p-2 hover:bg-slate-100 rounded-full"><XCircle className="w-6 h-6 text-slate-400"/></button>
              </div>
              <form onSubmit={sendBroadcast} className="space-y-4">
                 <div><label className="text-xs font-bold text-slate-500 uppercase">Judul</label><input required className="w-full p-3 border rounded-xl mt-1 outline-none focus:border-blue-500" placeholder="Judul Pengumuman" value={broadcastData.title} onChange={e=>setBroadcastData({...broadcastData, title:e.target.value})}/></div>
                 <div><label className="text-xs font-bold text-slate-500 uppercase">Isi Pesan</label><textarea required className="w-full p-3 border rounded-xl mt-1 h-32 outline-none focus:border-blue-500" placeholder="Isi pesan..." value={broadcastData.message} onChange={e=>setBroadcastData({...broadcastData, message:e.target.value})}/></div>
                 <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg">Kirim Broadcast</button>
              </form>
           </div>
        </div>
       )}
    </div>
  );
};

// --- MODULE: RESIDENT MANAGER (CRUD) ---
const ResidentManager = ({ user }) => {
    const [residents, setResidents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', unit: '', phone: '', job: '', status: 'Tetap', family: [] });
    const [familyTemp, setFamilyTemp] = useState({ name: '', relation: 'Istri' });

    useEffect(() => {
        if(!user) return;
        const unsub = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'residents'), orderBy('unit')), s => setResidents(s.docs.map(d => ({id:d.id, ...d.data()}))), err => console.log(err)); 
        return () => unsub(); 
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'residents'), formData);
        setIsModalOpen(false); setFormData({ name: '', unit: '', phone: '', job: '', status: 'Tetap', family: [] });
        alert("Warga berhasil ditambahkan!");
    }

    const handleDelete = async (id) => { if(confirm('Hapus data warga ini?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'residents', id)); };
    
    const addFamilyMember = () => {
        if(!familyTemp.name) return;
        setFormData({...formData, family: [...formData.family, familyTemp]});
        setFamilyTemp({ name: '', relation: 'Anak' });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-slate-800">Data Warga</h2><button onClick={()=>setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 text-sm shadow-md flex items-center gap-2"><UserPlus className="w-4 h-4"/> Tambah Warga</button></div>
            
            {/* Modal Input Warga */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg">Input Data Warga</h3><button onClick={()=>setIsModalOpen(false)}><X className="w-5 h-5 text-gray-500"/></button></div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input className="p-3 border rounded-xl bg-gray-50 text-sm" placeholder="Nama Kepala Keluarga" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} required/>
                                <input className="p-3 border rounded-xl bg-gray-50 text-sm" placeholder="Unit / Blok" value={formData.unit} onChange={e=>setFormData({...formData, unit:e.target.value})} required/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input className="p-3 border rounded-xl bg-gray-50 text-sm" placeholder="No. HP / WA" value={formData.phone} onChange={e=>setFormData({...formData, phone:e.target.value})} required/>
                                <input className="p-3 border rounded-xl bg-gray-50 text-sm" placeholder="Pekerjaan" value={formData.job} onChange={e=>setFormData({...formData, job:e.target.value})}/>
                            </div>
                            <select className="w-full p-3 border rounded-xl bg-gray-50 text-sm" value={formData.status} onChange={e=>setFormData({...formData, status:e.target.value})}><option>Tetap</option><option>Kontrak</option><option>Kos</option></select>
                            
                            <div className="border-t pt-4">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Anggota Keluarga</p>
                                <div className="flex gap-2 mb-2">
                                    <input className="flex-1 p-2 border rounded-lg text-sm" placeholder="Nama" value={familyTemp.name} onChange={e=>setFamilyTemp({...familyTemp, name:e.target.value})}/>
                                    <select className="p-2 border rounded-lg text-sm" value={familyTemp.relation} onChange={e=>setFamilyTemp({...familyTemp, relation:e.target.value})}><option>Istri</option><option>Suami</option><option>Anak</option><option>Ortu</option><option>ART</option></select>
                                    <button type="button" onClick={addFamilyMember} className="bg-slate-800 text-white px-3 rounded-lg text-xs font-bold">Add</button>
                                </div>
                                <div className="space-y-1">
                                    {formData.family.map((f, i) => (
                                        <div key={i} className="flex justify-between bg-gray-50 p-2 rounded text-xs"><span>{f.name} ({f.relation})</span><button type="button" onClick={()=>setFormData({...formData, family: formData.family.filter((_, idx) => idx !== i)})} className="text-red-500">Hapus</button></div>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">Simpan Data</button>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b"><tr><th className="p-4">Unit</th><th className="p-4">Kepala Keluarga</th><th className="p-4">Kontak</th><th className="p-4">Pekerjaan</th><th className="p-4">Jml Anggota</th><th className="p-4 text-center">Aksi</th></tr></thead>
                    <tbody>
                        {residents.map(r => (
                            <tr key={r.id} className="border-b hover:bg-slate-50">
                                <td className="p-4 font-bold">{r.unit}</td>
                                <td className="p-4">
                                    <div className="font-bold text-slate-800">{r.name}</div>
                                    <div className="text-[10px] text-slate-500">{r.status}</div>
                                </td>
                                <td className="p-4 text-slate-600 font-mono">{r.phone}</td>
                                <td className="p-4 text-slate-600">{r.job || '-'}</td>
                                <td className="p-4 text-center"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">{(r.family?.length || 0) + 1} Org</span></td>
                                <td className="p-4 text-center"><button onClick={()=>handleDelete(r.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4"/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- MODULE: CONTENT MANAGER (Events & Broadcast) ---
const ContentManager = ({ user, role }) => {
    const [events, setEvents] = useState([]);
    const [news, setNews] = useState([]);
    const [activeTab, setActiveTab] = useState('events');
    const [formEvent, setFormEvent] = useState({ title: '', date: '', location: '', category: 'Umum' });
    const [formNews, setFormNews] = useState({ title: '', content: '' });

    useEffect(() => {
        if(!user) return;
        const unsubEvents = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'events'), s => setEvents(s.docs.map(d => ({id:d.id, ...d.data()}))));
        const unsubNews = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'news'), s => setNews(s.docs.map(d => ({id:d.id, ...d.data()}))));
        return () => { unsubEvents(); unsubNews(); };
    }, [user]);

    const handleAddEvent = async (e) => { e.preventDefault(); await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), formEvent); setFormEvent({ title: '', date: '', location: '', category: 'Umum' }); alert("Kegiatan tersimpan!"); };
    const handleAddNews = async (e) => { e.preventDefault(); await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'news'), { ...formNews, date: new Date().toLocaleDateString(), cat: 'Pengumuman', sender: role.label, createdAt: new Date().toISOString(), image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80', color: 'bg-red-100 text-red-700' }); setFormNews({title:'', content:''}); alert("Broadcast terkirim!"); };
    
    const handleDelete = async (col, id) => { if(confirm('Hapus?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id)); };

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-800">Manajemen Informasi & Kegiatan</h2>
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
                <button onClick={()=>setActiveTab('events')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab==='events'?'bg-white shadow text-emerald-700':'text-slate-500'}`}>Agenda Kegiatan</button>
                <button onClick={()=>setActiveTab('news')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab==='news'?'bg-white shadow text-emerald-700':'text-slate-500'}`}>Broadcast Berita</button>
            </div>

            {activeTab === 'events' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                        <h3 className="font-bold mb-4">Tambah Kegiatan Baru</h3>
                        <form onSubmit={handleAddEvent} className="space-y-3">
                            <input className="w-full p-2 border rounded-lg text-sm" placeholder="Nama Kegiatan" value={formEvent.title} onChange={e=>setFormEvent({...formEvent, title:e.target.value})} required/>
                            <input className="w-full p-2 border rounded-lg text-sm" placeholder="Tanggal (misal: 17 Agustus)" value={formEvent.date} onChange={e=>setFormEvent({...formEvent, date:e.target.value})} required/>
                            <input className="w-full p-2 border rounded-lg text-sm" placeholder="Lokasi" value={formEvent.location} onChange={e=>setFormEvent({...formEvent, location:e.target.value})} required/>
                            <select className="w-full p-2 border rounded-lg text-sm bg-white" value={formEvent.category} onChange={e=>setFormEvent({...formEvent, category:e.target.value})}><option>Umum</option><option>Kesehatan</option><option>Keagamaan</option><option>Kerja Bakti</option><option>Hiburan</option></select>
                            <button className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold text-sm">Simpan</button>
                        </form>
                    </div>
                    <div className="md:col-span-2 space-y-3">
                        {events.map(ev => (
                            <div key={ev.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                                <div><span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500 mb-1 inline-block">{ev.category}</span><h4 className="font-bold text-slate-800">{ev.title}</h4><p className="text-xs text-slate-500">{ev.date} • {ev.location}</p></div>
                                <button onClick={()=>handleDelete('events', ev.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="font-bold mb-4">Kirim Broadcast</h3>
                        <form onSubmit={handleAddNews} className="space-y-4">
                            <input className="w-full p-3 border rounded-xl text-sm font-bold" placeholder="Judul Pengumuman" value={formNews.title} onChange={e=>setFormNews({...formNews, title:e.target.value})} required/>
                            <textarea className="w-full p-3 border rounded-xl text-sm h-32" placeholder="Isi pesan..." value={formNews.content} onChange={e=>setFormNews({...formNews, content:e.target.value})} required/>
                            <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Kirim ke Warga</button>
                        </form>
                    </div>
                    <div className="space-y-4">
                         {news.map(n => (
                            <div key={n.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-start">
                                    <div><h4 className="font-bold text-slate-800">{n.title}</h4><p className="text-[10px] text-slate-400 mb-2">{formatDate(n.createdAt)} • Oleh {n.sender}</p></div>
                                    <button onClick={()=>handleDelete('news', n.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
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

// --- MODULE: REPORT & PERMIT MANAGER ---
const ReportPermitManager = ({ user }) => {
    const [activeTab, setActiveTab] = useState('reports');
    const [data, setData] = useState([]);

    useEffect(() => {
        if(!user) return;
        const colName = activeTab === 'reports' ? 'reports' : 'permits';
        const unsub = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', colName), orderBy('createdAt', 'desc')), s => setData(s.docs.map(d => ({id:d.id, ...d.data()}))));
        return () => unsub();
    }, [user, activeTab]);

    const updateStatus = async (id, status) => { 
        const colName = activeTab === 'reports' ? 'reports' : 'permits';
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, id), { status }); 
    };

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold text-slate-800">Pusat Layanan Warga</h2>
                 <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                    <button onClick={()=>setActiveTab('reports')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab==='reports'?'bg-white shadow text-emerald-700':'text-slate-500'}`}>Keluhan / Laporan</button>
                    <button onClick={()=>setActiveTab('permits')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab==='permits'?'bg-white shadow text-emerald-700':'text-slate-500'}`}>Surat & Izin</button>
                 </div>
             </div>

             <div className="grid gap-4">
                 {data.map(item => (
                     <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-center">
                         <div className={`p-3 rounded-full ${item.status==='OPEN'||item.status==='PENDING'?'bg-red-100 text-red-600':item.status==='IN_PROGRESS'?'bg-yellow-100 text-yellow-600':'bg-green-100 text-green-600'}`}>
                             {activeTab === 'reports' ? <AlertTriangle className="w-6 h-6"/> : <FileCheck className="w-6 h-6"/>}
                         </div>
                         <div className="flex-1">
                             <div className="flex gap-2 mb-1">
                                 <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">{item.status}</span>
                                 <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
                             </div>
                             <h3 className="font-bold text-slate-800">{activeTab === 'reports' ? item.category : item.type}</h3>
                             <p className="text-sm text-slate-600">{item.description}</p>
                             <p className="text-xs text-slate-400 mt-1 font-mono">Warga: {item.userName} ({item.userUnit})</p>
                             {item.isBlockingRoad && <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 rounded mt-1 inline-block">⚠️ Menutup Jalan</span>}
                         </div>
                         <div className="flex gap-2">
                             {activeTab === 'reports' ? (
                                 <>
                                    {item.status !== 'IN_PROGRESS' && item.status !== 'DONE' && <button onClick={()=>updateStatus(item.id, 'IN_PROGRESS')} className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded text-xs font-bold hover:bg-yellow-200">Proses</button>}
                                    {item.status !== 'DONE' && <button onClick={()=>updateStatus(item.id, 'DONE')} className="px-3 py-1.5 bg-green-100 text-green-700 rounded text-xs font-bold hover:bg-green-200">Selesai</button>}
                                 </>
                             ) : (
                                 <>
                                    {item.status === 'PENDING' && (
                                        <>
                                            <button onClick={()=>updateStatus(item.id, 'REJECTED')} className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200">Tolak</button>
                                            <button onClick={()=>updateStatus(item.id, 'APPROVED')} className="px-3 py-1.5 bg-green-100 text-green-700 rounded text-xs font-bold hover:bg-green-200">Setujui</button>
                                        </>
                                    )}
                                    {item.status === 'APPROVED' && <button className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded text-xs font-bold cursor-default">Disetujui</button>}
                                 </>
                             )}
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    );
};

// --- MODULE: FORUM MODERATION ---
const ForumManager = ({ user }) => {
    const [posts, setPosts] = useState([]);
    useEffect(() => {
        if(!user) return;
        const unsub = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), orderBy('createdAt', 'desc')), s => setPosts(s.docs.map(d => ({id:d.id, ...d.data()}))));
        return () => unsub();
    }, [user]);

    const handleDelete = async (id) => { if(confirm("Hapus postingan ini?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'posts', id)); };

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-800">Moderasi Forum Warga</h2>
            <div className="grid gap-4">
                {posts.map(post => (
                    <div key={post.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{post.author}</span>
                                <span className="text-[10px] text-slate-400">{formatDate(post.createdAt)}</span>
                            </div>
                            <p className="text-sm text-slate-700">{post.content}</p>
                        </div>
                        <button onClick={()=>handleDelete(post.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-5 h-5"/></button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- MODULE: USER MANAGEMENT (RW ONLY) ---
const UserManager = () => {
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({ username: '', password: '', role: 'RT', rtNumber: '01', name: '' });
    
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'admin_accounts'), s => setUsers(s.docs.map(d => ({id:d.id, ...d.data()}))));
        return () => unsub();
    }, []);

    const handleAddUser = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'admin_accounts'), formData);
        setFormData({ username: '', password: '', role: 'RT', rtNumber: '01', name: '' });
        alert("User Admin berhasil ditambahkan!");
    };
    const handleDelete = async (id) => { if(confirm("Hapus user admin ini?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'admin_accounts', id)); };

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-800">Manajemen Akses Admin</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                    <h3 className="font-bold mb-4">Tambah Admin Baru</h3>
                    <form onSubmit={handleAddUser} className="space-y-3">
                        <input className="w-full p-2 border rounded-lg text-sm" placeholder="Nama Lengkap" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} required/>
                        <input className="w-full p-2 border rounded-lg text-sm" placeholder="Username" value={formData.username} onChange={e=>setFormData({...formData, username:e.target.value})} required/>
                        <input className="w-full p-2 border rounded-lg text-sm" placeholder="Password" value={formData.password} onChange={e=>setFormData({...formData, password:e.target.value})} required/>
                        <select className="w-full p-2 border rounded-lg text-sm bg-white" value={formData.role} onChange={e=>setFormData({...formData, role:e.target.value})}><option value="RT">Ketua RT</option><option value="RW">Pengurus RW</option></select>
                        {formData.role === 'RT' && <select className="w-full p-2 border rounded-lg text-sm bg-white" value={formData.rtNumber} onChange={e=>setFormData({...formData, rtNumber:e.target.value})}>{[1,2,3,4,5,6,7,8].map(n => <option key={n} value={`0${n}`}>RT 0{n}</option>)}</select>}
                        <button className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-emerald-700">Simpan User</button>
                    </form>
                </div>
                <div className="lg:col-span-2"><div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-slate-50 border-b"><tr><th className="p-4">Nama</th><th className="p-4">Username</th><th className="p-4">Role</th><th className="p-4 text-center">Aksi</th></tr></thead><tbody>{users.map(u => (<tr key={u.id} className="border-b hover:bg-slate-50"><td className="p-4 font-bold">{u.name}</td><td className="p-4 font-mono text-slate-500">{u.username}</td><td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'RW' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role} {u.role === 'RT' && u.rtNumber}</span></td><td className="p-4 text-center">{u.username !== 'admin' && <button onClick={()=>handleDelete(u.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>}</td></tr>))}</tbody></table></div></div>
            </div>
        </div>
    );
};

// --- MODULE: IOT CONTROL (Same as before) ---
const IoTControl = ({ user }) => {
  const [gateStatus, setGateStatus] = useState({ isOpen: false });
  useEffect(() => { if(!user) return; const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'iot_devices', 'gate_main'), s => { if(s.exists()) setGateStatus(s.data()); }); return () => unsub(); }, [user]);
  const toggleGate = async () => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'iot_devices', 'gate_main'), { isOpen: !gateStatus.isOpen, lastUpdated: new Date().toISOString(), triggeredBy: 'ADMIN' }); };
  return (
    <div className="space-y-6 animate-fade-in"><h2 className="text-2xl font-bold text-slate-800">Security Center</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-black rounded-2xl aspect-video relative overflow-hidden flex items-center justify-center"><p className="text-white font-mono animate-pulse">CCTV FEED LIVE...</p></div><div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-6"><div className={`p-6 rounded-full border-4 ${gateStatus.isOpen?'border-green-500 bg-green-50 text-green-600':'border-red-500 bg-red-50 text-red-600'}`}>{gateStatus.isOpen?<Unlock className="w-12 h-12"/>:<Lock className="w-12 h-12"/>}</div><button onClick={toggleGate} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg">{gateStatus.isOpen?'TUTUP GERBANG':'BUKA GERBANG'}</button></div></div></div>
  );
};

// --- MODULE: FINANCE MANAGER (Same as before, simplified) ---
const FinanceManager = ({ role, user }) => {
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ type: 'Pemasukan', category: 'IPL', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [activeTab, setActiveTab] = useState('cashflow');
  const [generatingBills, setGeneratingBills] = useState(false);

  useEffect(() => {
    if(!user) return;
    const unsub = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), orderBy('date', 'desc')), s => setTransactions(s.docs.map(d => ({id:d.id, ...d.data()}))));
    return () => unsub();
  }, [user]);

  const handleSubmit = async (e) => { e.preventDefault(); await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), { ...formData, amount: parseInt(formData.amount), scope: role.type === 'RW' ? 'RW' : role.id, createdBy: role.label }); setIsModalOpen(false); };
  const handleDelete = async (id) => { if(confirm('Hapus transaksi?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', id)); };
  
  const generateMonthlyIPL = async () => {
    setGeneratingBills(true);
    const residentsSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'residents'));
    // Simulation: In real app, batch write to billing collection
    alert(`Tagihan IPL berhasil dibuat untuk ${residentsSnap.size} warga!`);
    setGeneratingBills(false);
  };

  const totalIncome = transactions.filter(t => t.type === 'Pemasukan').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'Pengeluaran').reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Manajemen Keuangan</h2>
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                <button onClick={()=>setActiveTab('cashflow')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab==='cashflow'?'bg-white shadow text-emerald-700':'text-slate-500'}`}>Arus Kas</button>
                <button onClick={()=>setActiveTab('bills')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab==='bills'?'bg-white shadow text-emerald-700':'text-slate-500'}`}>Tagihan IPL</button>
            </div>
        </div>

        {activeTab === 'cashflow' ? (
            <>
             <div className="flex justify-end"><button onClick={()=>setIsModalOpen(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold">+ Transaksi</button></div>
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-slate-50 border-b"><tr><th className="p-4">Tanggal</th><th className="p-4">Ket</th><th className="p-4 text-right">Jumlah</th><th className="p-4 text-center">Aksi</th></tr></thead><tbody>{transactions.map(t => (<tr key={t.id} className="border-b"><td className="p-4">{t.date}</td><td className="p-4">{t.description}</td><td className={`p-4 text-right font-bold ${t.type==='Pemasukan'?'text-green-600':'text-red-600'}`}>Rp {t.amount.toLocaleString()}</td><td className="p-4 text-center"><button onClick={()=>handleDelete(t.id)}><Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500"/></button></td></tr>))}</tbody></table></div>
             {isModalOpen && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-md"><h3 className="font-bold mb-4">Input</h3><form onSubmit={handleSubmit} className="space-y-4"><input className="w-full p-2 border rounded" type="number" placeholder="Nominal" onChange={e=>setFormData({...formData, amount:e.target.value})} required/><button className="w-full bg-emerald-600 text-white py-2 rounded font-bold">Simpan</button><button type="button" onClick={()=>setIsModalOpen(false)} className="w-full border py-2 rounded font-bold text-slate-500">Batal</button></form></div></div>}
            </>
        ) : (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Receipt className="w-8 h-8"/></div>
                <h3 className="text-xl font-bold text-slate-800">Manajemen Tagihan IPL</h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">Generate tagihan bulanan untuk seluruh warga secara otomatis.</p>
                <button onClick={generateMonthlyIPL} disabled={generatingBills} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2 mx-auto">{generatingBills ? <Loader2 className="w-5 h-5 animate-spin"/> : <Sparkles className="w-5 h-5 text-yellow-300"/>} {generatingBills ? 'Sedang Memproses...' : 'Buat Tagihan Bulan Ini'}</button>
            </div>
        )}
    </div>
  );
};

// --- MAIN LAYOUT ---
export default function AdminApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [role, setRole] = useState(null); 
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const initAuth = async () => { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } else { await signInAnonymously(auth); } };
      initAuth();
      return onAuthStateChanged(auth, (u) => { if (u) { setUser(u); setLoading(false); } });
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-emerald-600 animate-spin"/></div>;
  if (!role) return <AdminLogin onLogin={(r) => setRole(r)} />;

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans text-slate-900 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role={role} onLogout={() => setRole(null)} />
      <main className="flex-1 md:ml-64 p-8 overflow-y-auto h-screen">
        <div className="md:hidden flex justify-between items-center mb-6"><h1 className="font-bold text-xl text-emerald-800">Admin Panel</h1><button className="p-2"><Menu className="w-6 h-6"/></button></div>
        {activeTab === 'dashboard' && <DashboardOverview user={user} role={role} />}
        {activeTab === 'residents' && <ResidentManager user={user} />}
        {activeTab === 'reports' && <ReportPermitManager user={user} />}
        {activeTab === 'content' && <ContentManager user={user} role={role} />}
        {activeTab === 'forum' && <ForumManager user={user} />}
        {activeTab === 'finance' && <FinanceManager user={user} role={role} />}
        {activeTab === 'users' && <UserManager />}
        {activeTab === 'iot' && <IoTControl user={user} />}
      </main>
    </div>
  );
}