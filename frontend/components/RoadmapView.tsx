import React, { useState } from 'react';
import { GlassCard } from './ui/GlassCard';
import { StudySession } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw, Clock } from 'lucide-react';

interface RoadmapViewProps {
  sessions: StudySession[];
  generatePlan: () => void;
  loading: boolean;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({ sessions, generatePlan, loading }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getSessionsForDay = (day: number) => {
    return sessions.filter(s => {
        const d = new Date(s.date);
        return d.getDate() === day && 
               d.getMonth() === currentDate.getMonth() && 
               d.getFullYear() === currentDate.getFullYear();
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col max-w-[1600px] mx-auto text-gray-200 pb-8">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-2">Roadmap</h2>
            <div className="flex items-center gap-3 px-3 py-1 bg-brand-emerald/10 rounded-full w-fit border border-brand-emerald/20">
                <span className="flex h-2 w-2 rounded-full bg-brand-emerald shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse"></span>
                <p className="text-[10px] text-brand-emerald font-bold uppercase tracking-wider">Live Sync Active</p>
            </div>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={generatePlan}
                disabled={loading}
                className="flex items-center gap-3 bg-brand-primary hover:bg-brand-primary/90 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all disabled:opacity-70 active:scale-95 hover:scale-105"
            >
                {loading ? <RefreshCw className="animate-spin" size={16} /> : <CalendarIcon size={16} />}
                {loading ? 'Optimizing...' : 'Regenerate'}
            </button>
        </div>
      </header>

      <GlassCard className="flex flex-col animate-scale-in border-white/[0.08] relative overflow-hidden" noPadding>
        {/* Card Header (Controls) */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.05] bg-white/[0.02] shrink-0 z-20 relative">
            <h3 className="text-2xl md:text-3xl font-bold text-white font-mono">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}
            </h3>
            <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl border border-white/[0.05]">
                <button onClick={prevMonth} className="p-2 hover:bg-white/[0.1] rounded-lg text-gray-400 hover:text-white transition-all">
                    <ChevronLeft size={20} />
                </button>
                <button onClick={nextMonth} className="p-2 hover:bg-white/[0.1] rounded-lg text-gray-400 hover:text-white transition-all">
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>

        {/* Scrollable Calendar Area - Fixed Height */}
        <div className="overflow-auto bg-black/20 custom-scrollbar relative" style={{ height: 'calc(100vh - 340px)', minHeight: '500px' }}>
            <div className="min-w-[1000px] h-full">
                
                {/* Days Header - Sticky */}
                <div className="grid grid-cols-7 text-center border-b border-white/[0.05] bg-void/90 backdrop-blur-md sticky top-0 z-10">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="py-4 text-[10px] font-bold text-brand-primary/60 uppercase tracking-[0.2em]">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid - Flexible height */}
                <div className="grid grid-cols-7 auto-rows-fr" style={{ minHeight: 'calc(100% - 60px)' }}>
                    {blanks.map(blank => (
                        <div key={`blank-${blank}`} className="border-r border-b border-white/[0.03] min-h-[140px] bg-white/[0.005]"></div>
                    ))}
                    
                    {days.map(day => {
                        const daySessions = getSessionsForDay(day);
                        const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const isToday = isSameDay(currentDayDate, new Date());
                        const isPast = currentDayDate < new Date(new Date().setHours(0,0,0,0));

                        return (
                            <div key={day} className={`
                                border-r border-b border-white/[0.05] p-3 min-h-[140px] group transition-all duration-300 relative
                                ${isToday ? 'bg-brand-primary/5' : 'hover:bg-white/[0.02]'}
                                ${isPast ? 'opacity-60' : ''}
                            `}>
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`
                                        w-8 h-8 flex items-center justify-center rounded-lg text-sm font-mono font-bold transition-all
                                        ${isToday ? 'bg-brand-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'text-gray-500 group-hover:text-white'}
                                    `}>
                                        {day}
                                    </span>
                                    {daySessions.length > 0 && (
                                        <span className="text-[10px] text-gray-600 font-mono bg-white/[0.05] px-1.5 py-0.5 rounded">
                                            {daySessions.length}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="space-y-2 max-h-[calc(100%-50px)] overflow-y-auto custom-scrollbar">
                                    {daySessions.map(session => (
                                        <div key={session.id} className={`
                                            p-2 rounded-lg border backdrop-blur-sm cursor-pointer transition-all hover:scale-[1.02] relative
                                            ${session.type === 'MOCK_TEST' 
                                                ? 'bg-brand-rose/10 border-brand-rose/30 text-brand-rose' 
                                                : session.type === 'REVISION'
                                                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                                                : 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary'}
                                        `}>
                                            <div className="flex items-center gap-1.5 mb-1 opacity-70">
                                                <Clock size={10} />
                                                <span className="text-[9px] font-mono font-bold uppercase">
                                                    {new Date(session.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                            <div className="font-bold text-[11px] leading-tight line-clamp-2">{session.title}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </GlassCard>
    </div>
  );
};
