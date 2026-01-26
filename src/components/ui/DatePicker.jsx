// Date Picker Component for Events
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const DatePicker = ({ value, onChange, placeholder = "Pilih Tanggal" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const containerRef = useRef(null);

    // Parse value to Date object
    const selectedDate = value ? new Date(value) : null;

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get days in month
    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    // Get first day of month (0 = Sunday)
    const getFirstDayOfMonth = (year, month) => {
        return new Date(year, month, 1).getDay();
    };

    // Navigate months
    const prevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    // Select date
    const selectDate = (day) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        onChange(newDate.toISOString());
        setIsOpen(false);
    };

    // Format display value
    const formatDisplayDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    };

    // Render calendar grid
    const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const today = new Date();
        
        const days = [];
        
        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="w-9 h-9"></div>);
        }
        
        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const isSelected = selectedDate && 
                selectedDate.getDate() === day && 
                selectedDate.getMonth() === month && 
                selectedDate.getFullYear() === year;
            
            const isToday = today.getDate() === day && 
                today.getMonth() === month && 
                today.getFullYear() === year;
            
            days.push(
                <button
                    key={day}
                    type="button"
                    onClick={() => selectDate(day)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all
                        ${isSelected 
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                            : isToday 
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' 
                                : 'text-slate-700 hover:bg-slate-100'
                        }
                    `}
                >
                    {day}
                </button>
            );
        }
        
        return days;
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Input Display */}
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-2 border rounded-lg text-sm flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-colors bg-white"
            >
                <span className={value ? 'text-slate-800' : 'text-slate-400'}>
                    {value ? formatDisplayDate(value) : placeholder}
                </span>
                <div className="flex items-center gap-1">
                    {value && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onChange(''); }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                    <Calendar className="w-4 h-4 text-slate-400" />
                </div>
            </div>

            {/* Dropdown Calendar */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-50 animate-fade-in w-[280px]">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={prevMonth}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>
                        <h4 className="font-bold text-slate-800 text-sm">
                            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                        </h4>
                        <button
                            type="button"
                            onClick={nextMonth}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>

                    {/* Days Header */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS.map(day => (
                            <div key={day} className="w-9 h-8 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {renderCalendar()}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => { onChange(new Date().toISOString()); setIsOpen(false); }}
                            className="flex-1 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                            Hari Ini
                        </button>
                        <button
                            type="button"
                            onClick={() => { onChange(''); setIsOpen(false); }}
                            className="flex-1 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            Hapus
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
