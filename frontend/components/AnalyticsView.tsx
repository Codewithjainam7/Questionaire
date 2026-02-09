import React from 'react';
import { GlassCard } from './ui/GlassCard';
import { AnalyticsData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';

interface AnalyticsViewProps {
  data: AnalyticsData[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ data }) => {
  return (
    <div className="space-y-8 animate-fade-in h-full text-gray-200">
        <header className="mb-8">
            <h2 className="text-4xl font-bold text-white tracking-tight">Analytics</h2>
            <p className="text-gray-500 mt-2 text-sm uppercase tracking-widest">Performance Metrics & Mastery Levels</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Topic Mastery Chart */}
            <GlassCard className="h-96 flex flex-col border-white/[0.08]">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Topic Mastery</h3>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis dataKey="topic" type="category" width={100} tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#030305', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                            />
                            <Bar dataKey="mastery" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.mastery > 80 ? '#8b5cf6' : entry.mastery > 50 ? '#3b82f6' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </GlassCard>

            {/* Study Hours Trend */}
            <GlassCard className="h-96 flex flex-col border-white/[0.08]">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Study Volume (7 Days)</h3>
                 <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="topic" tick={{fontSize: 12, fill: '#94a3b8'}} hide />
                            <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#030305', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                            />
                            <Line type="monotone" dataKey="hoursStudied" stroke="#d946ef" strokeWidth={3} dot={{r: 4, fill: '#d946ef', strokeWidth: 0}} activeDot={{r: 8, fill: '#fff', stroke: '#d946ef', strokeWidth: 2}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </GlassCard>
            
            {/* Prediction Card */}
            <GlassCard className="md:col-span-2 relative overflow-hidden group border-brand-primary/20">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[100px] -mr-20 -mt-20 animate-pulse-slow"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6">
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-3">AI Score Prediction</h3>
                        <p className="text-gray-400 max-w-lg text-base font-light">
                            Based on your recent quiz performance and consistency, you are on track to score in the top 10% for your upcoming Calculus exam.
                        </p>
                    </div>
                    <div className="mt-8 md:mt-0 text-center">
                        <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-accent mb-2 drop-shadow-[0_0_15px_rgba(139,92,246,0.3)]">94%</div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Confidence Interval</div>
                    </div>
                </div>
            </GlassCard>
        </div>
    </div>
  );
};