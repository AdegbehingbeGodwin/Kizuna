
export interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  sex?: string;
  color?: string;
  age?: string;
  weight?: string;
  ownerName: string;
  ownerPhone: string;
  lastVaccinationDate?: string;
  nextVaccinationDate?: string;
  lastDewormingDate?: string;
  lastCheckupDate?: string;
  status: 'Up-to-date' | 'Due Soon' | 'Overdue' | 'Healthy';
}

export interface Reminder {
  id: string;
  petId: string;
  petName: string;
  message: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'read' | 'converted';
  type: 'vaccination' | 'checkup' | 'birthday' | 'anniversary';
}

export interface ClinicStats {
  totalPets: number;
  remindersSent: number;
  conversionRate: number;
  estimatedRevenue: number;
  activeClinics?: number;
}

export interface AppState {
  pets: Pet[];
  reminders: Reminder[];
  stats: ClinicStats;
  clinicInfo: {
    name: string;
    bookingLink: string;
    whatsappNumber: string;
  };
}
