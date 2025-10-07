export type UserRole = 'admin' | 'trainer' | 'member';

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface GymUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string;
  age: number;
  joinDate: string;
  address: string;
  emergencyContact: EmergencyContact;
  role: UserRole;
  membershipPlanId: string;
  membershipStatus: 'active' | 'expired' | 'pending';
  membershipStart: string;
  membershipEnd: string;
  renewalDate: string;
  heightCm: number;
  weightKg: number;
  bmi: number;
  fitnessGoal: string;
  medicalConditions: string[];
  injuries: string[];
  createdAt: string;
  updatedAt: string;
  profileImageUrl: string;
}

export interface Payment {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  paymentDate: string;
  mode: 'UPI' | 'Card' | 'Cash';
  status: 'success' | 'failed' | 'pending';
  month: string; // "YYYY-MM"
  transactionId: string;
  handledBy: string; // adminUserId
}

export interface MembershipPlan {
  id: string;
  name: string;
  durationInDays: number;
  price: number;
  features: string[];
  status: 'active' | 'inactive';
  createdBy: string; // adminUserId
  createdAt: string;
}

export interface AttendanceRecord {
  id: string; // userId
  name: string;
  userId: string;
  checkInTime: string;
  status: 'present' | 'absent';
  handledBy: string; // adminUserId or trainerId
  membershipPlanId: string;
  remarks: string;
}

export interface MonthlyPaymentSummary {
  [month: string]: { // "YYYY-MM"
    totalReceived: number;
    totalTransactions: number;
  };
}

export interface UserSummary {
  totalMembers: number;
  activeMembers: number;
  lastUpdated: string;
}
