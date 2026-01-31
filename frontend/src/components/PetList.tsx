import React from 'react';
import { Pet } from '../types';
import { Send, Trash2, PawPrint } from 'lucide-react';

interface PetListProps {
  pets: Pet[];
  onSendReminder: (pet: Pet) => void;
  onDeletePet: (petId: string) => void;
  onViewAll?: () => void;
}

export const PetList: React.FC<PetListProps> = ({ pets, onSendReminder, onDeletePet, onViewAll }) => {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
      <div className="p-8 border-b border-slate-50 flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900 flex items-center">
          <PawPrint size={20} className="mr-2 text-indigo-500" aria-hidden="true" />
          Recent Patients
        </h3>
        {onViewAll && (
          <button 
            type="button" 
            onClick={onViewAll}
            className="text-sm font-bold text-amber-600 hover:text-amber-800 transition-colors" 
            aria-label="View all patient records"
          >
            View All
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-50">
            <tr>
              <th className="px-8 py-4">Pet / Owner</th>
              <th className="px-8 py-4">Status</th>
              <th className="px-8 py-4">Next Visit</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pets.map((pet) => (
              <tr key={pet.id} className="hover:bg-slate-50/30 transition-all duration-200 group">
                <td className="px-8 py-5">
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mr-4 text-slate-400 font-bold group-hover:bg-indigo-100 group-hover:text-indigo-500 transition-all">
                      {pet.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-tight">{pet.name} <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded ml-1">{pet.sex || 'Unknown'}</span></p>
                      <p className="text-xs font-medium text-slate-500 mt-1">
                        {pet.breed} {pet.color && `• ${pet.color}`} <span className="text-slate-300 mx-1">/</span> {pet.ownerName}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      pet.status === 'Up-to-date' ? 'bg-emerald-50 text-emerald-600' : 
                      pet.status === 'Due Soon' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {pet.status}
                    </span>
                    <p className="text-[10px] font-bold text-slate-400 pl-1">
                      {pet.age || 'Age?'} • {pet.weight ? `${pet.weight}kg` : 'Wt?'}
                    </p>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <p className="text-sm font-bold text-slate-700">
                    {pet.nextVaccinationDate 
                      ? new Date(pet.nextVaccinationDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Not set'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{pet.species}</p>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      type="button"
                      onClick={() => onSendReminder(pet)}
                      className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                      aria-label={`Send AI reminder to ${pet.ownerName} about ${pet.name}`}
                    >
                      <Send size={16} aria-hidden="true" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => onDeletePet(pet.id)}
                      className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" 
                      aria-label={`Delete record for ${pet.name}`}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
