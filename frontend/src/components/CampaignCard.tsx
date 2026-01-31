import React from 'react';
import { CURRENCY_SYMBOL } from '../constants';

interface CampaignCardProps {
  title: string;
  status: string;
  sent: number;
  conversions: number;
  icon: React.ReactNode;
}

export const CampaignCard: React.FC<CampaignCardProps> = ({ title, status, sent, conversions, icon }) => (
  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm card-hover relative overflow-hidden">
    <div className="flex items-center justify-between mb-6">
      <div className="bg-slate-50 p-3 rounded-2xl">
        {icon}
      </div>
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
        status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
      }`}>{status}</span>
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
    <div className="flex gap-4 mt-4">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase">Sent</p>
        <p className="text-lg font-black text-slate-700">{sent}</p>
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase">Rev</p>
        <p className="text-lg font-black text-indigo-600">{conversions > 0 ? `${CURRENCY_SYMBOL}${conversions * 5000}` : '-'}</p>
      </div>
    </div>
  </div>
);
