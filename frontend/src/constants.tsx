
import { Pet, Reminder } from './types';

export const INITIAL_PETS: Pet[] = [
  {
    id: '1',
    name: 'Bingo',
    species: 'Dog',
    breed: 'Boerboel mix',
    age: '4 years',
    weight: '28.4 kg',
    ownerName: 'Samuel Okafor',
    ownerPhone: '2348012345678',
    lastVaccinationDate: '2025-06-18',
    nextVaccinationDate: '2026-06-18',
    status: 'Due Soon',
  },
  {
    id: '2',
    name: 'Fluffy',
    species: 'Cat',
    breed: 'Domestic shorthair',
    age: '6 years',
    weight: '4.8 kg',
    ownerName: 'Amaka Adeleke',
    ownerPhone: '2348098765432',
    lastVaccinationDate: '2025-05-20',
    nextVaccinationDate: '2026-05-20',
    status: 'Overdue',
  },
  {
    id: '3',
    name: 'Rex',
    species: 'Dog',
    breed: 'German Shepherd',
    age: '3 years',
    weight: '31.2 kg',
    ownerName: 'Chidi Nwosu',
    ownerPhone: '2348123456789',
    lastVaccinationDate: '2026-01-10',
    nextVaccinationDate: '2027-01-10',
    status: 'Up-to-date',
  },
  {
    id: '4',
    name: 'Luna',
    species: 'Rabbit',
    breed: 'New Zealand White',
    age: '2 years',
    weight: '3.6 kg',
    ownerName: 'Tunde Bakare',
    ownerPhone: '2347034567890',
    lastVaccinationDate: '2025-06-02',
    nextVaccinationDate: '2026-06-02',
    status: 'Overdue',
  },
];

export const INITIAL_REMINDERS: Reminder[] = [
  {
    id: 'r1',
    petId: '1',
    petName: 'Bingo',
    message: 'Bingo is due for rabies vaccine next week. Book at PawCare Clinic: https://book.vet/pawcare',
    sentAt: '2026-06-09T10:00:00Z',
    status: 'sent',
    type: 'vaccination',
  },
  {
    id: 'r2',
    petId: '2',
    petName: 'Fluffy',
    message: "Fluffy's annual checkup is due. WhatsApp us to book: 2348000000000",
    sentAt: '2026-06-09T14:30:00Z',
    status: 'converted',
    type: 'checkup',
  },
];

export const CURRENCY_SYMBOL = '₦';
