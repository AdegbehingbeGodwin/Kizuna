import React from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon, trend, trendUp }) => {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm card-hover stats-card-bg relative overflow-hidden group">
      <div className="flex items-center justify-between mb-4">
        <div className="bg-sage/10 p-3 rounded-2xl text-marine group-hover:bg-ink group-hover:text-sage transition-all">
          {icon}
        </div>
        {trend && (
          <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
            trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}>
            {trendUp ? '↑' : '↓'} {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
      </div>
    </div>
  );
};
