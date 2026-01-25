import React from 'react';
import { 
  LayoutDashboard, Users, DollarSign, FileCheck, 
  Calendar, MessageCircle, UserCog, Shield, LogOut 
} from 'lucide-react';
import { LOGO_URL } from '../../config';

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

const Sidebar = ({ activeTab, setActiveTab, role, onLogout }) => {
  return (
    <div className="w-64 bg-emerald-900 text-white flex flex-col h-screen fixed left-0 top-0 z-20 hidden md:flex shadow-2xl border-r border-emerald-800">
      {/* Logo Section */}
      <div className="p-6 flex items-center gap-3 border-b border-emerald-800">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 overflow-hidden shadow-md transform rotate-3">
          <img src={LOGO_URL} className="w-full h-full object-contain" alt="Logo" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight text-white leading-none">
            Bumi<span className="text-yellow-400">Adipura</span>
          </h1>
          <p className="text-[10px] text-emerald-300 mt-1 uppercase tracking-wider">
            Admin System v3.2
          </p>
        </div>
      </div>
      
      {/* User Info */}
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
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {menuItems.filter(i => !i.role || i.role === role.type).map((item) => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id)} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === item.id 
                ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-900/50 border-l-4 border-yellow-400' 
                : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-emerald-800">
        <button 
          onClick={onLogout} 
          className="w-full flex items-center gap-2 px-4 py-3 bg-emerald-950/50 hover:bg-red-900/80 text-emerald-100 hover:text-white rounded-xl transition-colors text-sm font-bold"
        >
          <LogOut className="w-4 h-4"/> Keluar Aplikasi
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
