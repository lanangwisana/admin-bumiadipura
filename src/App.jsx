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

// Permission System
import { canAccessFeature } from './utils/permissions';

/**
 * Main Admin Application Component
 * Handles authentication, navigation, and feature routing with authorization
 */
export default function AdminApp() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [role, setRole] = useState(null); // { type, id, label, scope, name, email, uid }
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

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

    // Prepare currentUser object for permission system
    const currentUser = role ? {
        role: role.type,      // 'RW' or 'RT'
        rtNumber: role.id,    // RT number (e.g. '01') or null for RW
        name: role.name,
        email: role.email,
        uid: role.uid,
        scope: role.scope,
        label: role.label
    } : null;

    // Check if current user can access a feature
    const canAccess = (feature) => {
        if (!currentUser) return false;
        return canAccessFeature(currentUser.role, feature);
    };

    // Navigate to tab with access check
    const navigateToTab = (tabId) => {
        // Map tab IDs to feature names
        const featureMap = {
            'dashboard': 'dashboard',
            'residents': 'residents',
            'finance': 'finance',
            'reports': 'reports',
            'content': 'content',
            'forum': 'forum',
            'users': 'users',
            'iot': 'iot'
        };
        
        const feature = featureMap[tabId];
        if (feature && !canAccess(feature)) {
            // User doesn't have access, don't navigate
            console.warn(`Access denied to ${feature} for role ${currentUser.role}`);
            return;
        }
        
        setActiveTab(tabId);
    };

    // Loading State
    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-100">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto"/>
                    <p className="mt-4 text-slate-500 font-medium">Memuat aplikasi...</p>
                </div>
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
                setActiveTab={navigateToTab}
                role={role} 
                currentUser={currentUser}
                onLogout={() => { 
                    setRole(null);
                    setActiveTab('dashboard');
                }}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />
            
            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-screen">
                {/* Mobile Header */}
                <div className="md:hidden flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm -mx-4 -mt-4 mb-6">
                    <h1 className="font-bold text-lg text-emerald-800">Admin Panel</h1>
                    <button 
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                    >
                        <Menu className="w-6 h-6 text-emerald-700"/>
                    </button>
                </div>
                
                {/* Feature Routes with Permission Checks */}
                {activeTab === 'dashboard' && <DashboardOverview user={currentUser} role={role} />}
                {activeTab === 'residents' && canAccess('residents') && <ResidentManager user={currentUser} />}
                {activeTab === 'reports' && canAccess('reports') && <ReportPermitManager user={currentUser} />}
                {activeTab === 'content' && canAccess('content') && <ContentManager user={currentUser} role={role} />}
                {activeTab === 'forum' && canAccess('forum') && <ForumManager user={currentUser} />}
                {activeTab === 'finance' && canAccess('finance') && <FinanceManager user={currentUser} role={role} />}
                {activeTab === 'users' && canAccess('users') && <UserManager user={currentUser} />}
                {activeTab === 'iot' && canAccess('iot') && <IoTControl user={currentUser} />}
                
                {/* Access Denied Message */}
                {!canAccess(activeTab) && activeTab !== 'dashboard' && (
                    <div className="flex items-center justify-center min-h-[50vh]">
                        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                            <div className="text-6xl mb-4">🚫</div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                Akses Ditolak
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Anda tidak memiliki izin untuk mengakses fitur ini.
                            </p>
                            <button
                                onClick={() => navigateToTab('dashboard')}
                                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                                Kembali ke Dashboard
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
