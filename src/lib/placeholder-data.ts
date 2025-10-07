import type { GymUser, MembershipPlan, Payment, AttendanceRecord, MonthlyPaymentSummary } from './types';
import { PlaceHolderImages } from './placeholder-images';

// This file is now deprecated as we are using live Firebase data.
// It is kept for reference and potential fallback scenarios.

const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

export const MOCK_USERS: GymUser[] = [
  // This data is no longer used in the application.
];

export const MOCK_PLANS: MembershipPlan[] = [
  // This data is no longer used in the application.
];

export const MOCK_PAYMENTS: Payment[] = [
  // This data is no longer used in the application.
];

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  // This data is no longer used in the application.
];

export const MOCK_STATS: MonthlyPaymentSummary = {
  // This data is no longer used in the application.
};

export const MOCK_AUTH_API = {
  // This data is no longer used in the application.
};
