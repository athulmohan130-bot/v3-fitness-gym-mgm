export type UserRole = "admin" | "trainer" | "member";

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

interface history {
  membershipPlanId: string;
  membershipEnd: string;
  membershipStart: string;
  price: number;
}
export interface GymUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: "Male" | "Female" | "Other";
  dateOfBirth: string;
  age: number;
  joinDate: string;
  address: string;
  emergencyContact: EmergencyContact;
  role: UserRole;
  membershipPlanId: string;
  membershipStatus: "active" | "expired" | "pending";
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
  biometricDeviceId: string;
  paymentStatus: "paid" | "unpaid" | "pending";
  membershipHistory: history[];
}

export interface Payment {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  paymentDate: string;
  mode: "UPI" | "Card" | "Cash" | "Bank Transfer";
  status: "success" | "failed" | "pending";
  month: string; // "YYYY-MM"
  transactionId: string;
  handledBy: string; // adminUserId
  type?: "registration" | "renewal"; // Payment type - registration or renewal
}

export interface MembershipPlan {
  id: string;
  name: string;
  type: "Cardio" | "Bodybuilding" | "Personal Training";
  durationInDays: number;
  price: number;
  registrationFee: number; // One-time fee for new members only
  features: { value: string }[];
  status: "active" | "inactive";
  createdBy: string; // adminUserId
  createdAt: string;
}

export interface AttendanceRecord {
  id: string; // Firestore document ID
  userId: string;
  name: string;
  email?: string;
  profileImageUrl?: string;
  biometricDeviceId?: string; // ESSL machine device ID
  checkInTime: string; // ISO timestamp
  checkOutTime?: string; // ISO timestamp (optional)
  date: string; // YYYY-MM-DD format for querying
  status: "present" | "absent";
  source: "essl" | "manual" | "app"; // Track how attendance was recorded
  membershipPlanId?: string;
  membershipPlan?: string; // Plan name for display
  membershipStatus?: "active" | "expired" | "pending";
  membershipEnd?: string; // ISO date when membership expires
  remarks?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MonthlyPaymentSummary {
  [month: string]: {
    // "YYYY-MM"
    totalReceived: number;
    totalTransactions: number;
  };
}

export interface UserSummary {
  totalMembers: number;
  activeMembers: number;
  lastUpdated: string;
}

export type UserWithPlan = GymUser & { planName: string };

export interface latestPlan {
  membershipPlan: string;
  membershipStart?: string;
  membershipEnd?: string;
}
