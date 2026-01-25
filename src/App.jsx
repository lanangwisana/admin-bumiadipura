import React, { useState, useEffect } from 'react';
import { Loader2, Menu } from 'lucide-react';
import { signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// Config
import { auth } from './config';

// Layout Components
import { Sidebar } from './components/layout';

// Feature Components
import {
    AdminLogin,
    DashboardOverview,
    ResidentManager,
    FinanceManager,
    ReportPermitManager,
    ContentManager,
    ForumManager,
    IoTControl,
    UserManager
} from './features';

/**
 * Main Admin Application Component
 * Handles authentication, navigation, and feature routing
 */
export default function AdminApp() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [role, setRole] = useState(null); 
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Firebase Authentication
    useEffect(() => {
        const initAuth = async () => { 
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { 
                await signInWithCustomToken(auth, __initial_auth_token); 
            } else { 
                await signInAnonymously(auth); 
            } 
        };
        initAuth();
        return onAuthStateChanged(auth, (u) => { 
            if (u) { 
                setUser(u); 
                setLoading(false); 
            } 
        });
    }, []);

    // Loading State
    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin"/>
            </div>
        );
    }

    // Login Screen
    if (!role) {
        return <AdminLogin onLogin={(r) => setRole(r)} />;
    }

    // Main Dashboard
    return (
        <div className="min-h-screen bg-[#F5F7FA] font-sans text-slate-900 flex">
            {/* Sidebar Navigation */}
            <Sidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                role={role} 
                onLogout={() => setRole(null)} 
            />
            
            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 p-8 overflow-y-auto h-screen">
                {/* Mobile Header */}
                <div className="md:hidden flex justify-between items-center mb-6">
                    <h1 className="font-bold text-xl text-emerald-800">Admin Panel</h1>
                    <button className="p-2">
                        <Menu className="w-6 h-6"/>
                    </button>
                </div>
                
                {/* Feature Routes */}
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