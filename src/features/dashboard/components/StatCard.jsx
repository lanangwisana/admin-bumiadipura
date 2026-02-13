import React from 'react';

const StatCard = ({ title, value, icon: Icon, color, sub, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden group transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-95' : ''}`}
  >
    <div className={`absolute right-0 top-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 transition-transform group-hover:scale-110`}>
      <Icon className="w-16 h-16 text-slate-800" />
    </div>
    <div className={`p-4 rounded-xl ${color} shadow-lg shadow-slate-200`}>
      <Icon className="w-8 h-8 text-white" />
    </div>
    <div>
      <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-black text-slate-800">{value}</h3>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
    </div>
  </div>
);

export default StatCard;
