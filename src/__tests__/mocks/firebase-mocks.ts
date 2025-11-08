import { vi } from 'vitest';
import { createMockTimestamp } from '../utils/test-utils';

/**
 * Firebase Auth Mocks
 * Professional-grade mocks for Firebase Authentication
 */
export const mockFirebaseAuth = {
  currentUser: {
    uid: 'test-user-id',
    email: 'test@v3fitness.com',
    displayName: 'Test User',
    emailVerified: true,
    getIdToken: vi.fn().mockResolvedValue('mock-token'),
  },
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updatePassword: vi.fn(),
  updateProfile: vi.fn(),
};

/**
 * Firestore Mocks
 * Comprehensive mocks for Firestore operations
 */
export const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  runTransaction: vi.fn(),
};

/**
 * Mock Firestore Transaction
 */
export const createMockTransaction = () => ({
  get: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

/**
 * Mock Storage operations
 */
export const mockFirebaseStorage = {
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
};

/**
 * Setup successful auth state
 */
export const setupAuthSuccess = () => {
  mockFirebaseAuth.signInWithEmailAndPassword.mockResolvedValue({
    user: mockFirebaseAuth.currentUser,
  });
  mockFirebaseAuth.onAuthStateChanged.mockImplementation((callback) => {
    callback(mockFirebaseAuth.currentUser);
    return vi.fn(); // unsubscribe function
  });
};

/**
 * Setup auth failure
 */
export const setupAuthFailure = (errorCode = 'auth/wrong-password') => {
  mockFirebaseAuth.signInWithEmailAndPassword.mockRejectedValue({
    code: errorCode,
    message: 'Authentication failed',
  });
};

/**
 * Setup Firestore query success
 */
export const setupFirestoreQuerySuccess = (data: any[]) => {
  mockFirestore.getDocs.mockResolvedValue({
    docs: data.map((item) => ({
      id: item.id,
      data: () => item,
      exists: () => true,
    })),
    empty: data.length === 0,
    size: data.length,
  });
};

/**
 * Setup Firestore document get success
 */
export const setupFirestoreDocSuccess = (data: any) => {
  mockFirestore.getDoc.mockResolvedValue({
    id: data.id,
    data: () => data,
    exists: () => true,
  });
};

/**
 * Setup Firestore document not found
 */
export const setupFirestoreDocNotFound = () => {
  mockFirestore.getDoc.mockResolvedValue({
    exists: () => false,
    data: () => undefined,
  });
};

/**
 * Setup Firestore add document success
 */
export const setupFirestoreAddSuccess = (id = 'new-doc-id') => {
  mockFirestore.addDoc.mockResolvedValue({
    id,
  });
};

/**
 * Setup Firestore update success
 */
export const setupFirestoreUpdateSuccess = () => {
  mockFirestore.updateDoc.mockResolvedValue(undefined);
  mockFirestore.setDoc.mockResolvedValue(undefined);
};

/**
 * Setup Firestore delete success
 */
export const setupFirestoreDeleteSuccess = () => {
  mockFirestore.deleteDoc.mockResolvedValue(undefined);
};

/**
 * Setup Firestore real-time listener
 */
export const setupFirestoreListener = (data: any[]) => {
  mockFirestore.onSnapshot.mockImplementation((callback) => {
    callback({
      docs: data.map((item) => ({
        id: item.id,
        data: () => item,
        exists: () => true,
      })),
      empty: data.length === 0,
      size: data.length,
    });
    return vi.fn(); // unsubscribe function
  });
};

/**
 * Setup Firestore transaction success
 */
export const setupTransactionSuccess = () => {
  const mockTransaction = createMockTransaction();
  mockFirestore.runTransaction.mockImplementation(async (updateFunction) => {
    return updateFunction(mockTransaction);
  });
  return mockTransaction;
};

/**
 * Reset all Firebase mocks
 */
export const resetFirebaseMocks = () => {
  vi.clearAllMocks();
  Object.values(mockFirebaseAuth).forEach((mock) => {
    if (typeof mock === 'function' && 'mockClear' in mock) {
      (mock as any).mockClear();
    }
  });
  Object.values(mockFirestore).forEach((mock) => {
    if (typeof mock === 'function' && 'mockClear' in mock) {
      (mock as any).mockClear();
    }
  });
};

/**
 * Mock date-fns functions commonly used in the app
 */
export const mockDateFns = {
  format: vi.fn((date: Date, formatStr: string) => {
    return date.toLocaleDateString();
  }),
  addDays: vi.fn((date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }),
  differenceInDays: vi.fn((date1: Date, date2: Date) => {
    return Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
  }),
};
