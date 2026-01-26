import React, { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, APP_ID } from '../../config';

const IoTControl = ({ user }) => {
    const [gateStatus, setGateStatus] = useState({ isOpen: false });
    
    useEffect(() => { 
        if (!user) return; 
        const unsub = onSnapshot(
            doc(db, 'artifacts', APP_ID, 'public', 'data', 'iot_devices', 'gate_main'), 
            (s) => { 
                if (s.exists()) setGateStatus(s.data()); 
            }
        ); 
        return () => unsub(); 
    }, [user]);

    const toggleGate = async () => { 
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'iot_devices', 'gate_main'), { 
            isOpen: !gateStatus.isOpen, 
            lastUpdated: new Date().toISOString(), 
            triggeredBy: 'ADMIN' 
        }); 
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-800">Security Center</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CCTV Feed */}
                <div className="bg-black rounded-2xl aspect-video relative overflow-hidden flex items-center justify-center">
                    <p className="text-white font-mono animate-pulse">CCTV FEED LIVE...</p>
                </div>
                
                {/* Gate Control */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-6">
                    <div className={`p-6 rounded-full border-4 ${
                        gateStatus.isOpen 
                            ? 'border-green-500 bg-green-50 text-green-600'
                            : 'border-red-500 bg-red-50 text-red-600'
                    }`}>
                        {gateStatus.isOpen 
                            ? <Unlock className="w-12 h-12"/> 
                            : <Lock className="w-12 h-12"/>
                        }
                    </div>
                    <button 
                        onClick={toggleGate} 
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg"
                    >
                        {gateStatus.isOpen ? 'TUTUP GERBANG' : 'BUKA GERBANG'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IoTControl;
