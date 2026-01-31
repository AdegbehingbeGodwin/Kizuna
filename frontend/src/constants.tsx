
import { Pet, Reminder } from './types';

export const INITIAL_PETS: Pet[] = [
  {
    id: '1',
    name: 'Bingo',
    species: 'Dog',
    ownerName: 'Samuel Okafor',
    ownerPhone: '2348012345678',
    lastVaccinationDate: '2023-11-15',
    nextVaccinationDate: '2024-11-15',
    status: 'Due Soon',
  },
  {
    id: '2',
    name: 'Fluffy',
    species: 'Cat',
    ownerName: 'Amaka Adeleke',
    ownerPhone: '2348098765432',
    lastVaccinationDate: '2023-05-20',
    nextVaccinationDate: '2024-05-20',
    status: 'Overdue',
  },
  {
    id: '3',
    name: 'Rex',
    species: 'Dog',
    ownerName: 'Chidi Nwosu',
    ownerPhone: '2348123456789',
    lastVaccinationDate: '2024-01-10',
    nextVaccinationDate: '2025-01-10',
    status: 'Up-to-date',
  },
  {
    id: '4',
    name: 'Luna',
    species: 'Rabbit',
    ownerName: 'Tunde Bakare',
    ownerPhone: '2347034567890',
    lastVaccinationDate: '2023-08-30',
    nextVaccinationDate: '2024-08-30',
    status: 'Overdue',
  },
];

export const INITIAL_REMINDERS: Reminder[] = [
  {
    id: 'r1',
    petId: '1',
    petName: 'Bingo',
    message: 'Bingo is due for rabies vaccine next week. Book at PawCare Clinic: https://book.vet/pawcare',
    sentAt: '2024-11-01T10:00:00Z',
    status: 'sent',
    type: 'vaccination',
  },
  {
    id: 'r2',
    petId: '2',
    petName: 'Fluffy',
    message: "Fluffy's annual checkup is due. WhatsApp us to book: 2348000000000",
    sentAt: '2024-11-05T14:30:00Z',
    status: 'converted',
    type: 'checkup',
  },
];

export const CURRENCY_SYMBOL = '₦';
