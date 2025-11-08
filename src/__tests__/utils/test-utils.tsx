import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

/**
 * Custom render function that wraps components with necessary providers
 * This is a best practice for testing React applications with context providers
 */
interface AllTheProvidersProps {
  children: React.ReactNode;
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

export function AllTheProviders({ children }: AllTheProvidersProps) {
  const testQueryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Custom render that includes all providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

/**
 * Mock authenticated user context
 * Using actual admin credentials for realistic testing
 */
export const mockAuthUser = {
  uid: 'test-user-id',
  email: 'admin@gymflex.com',
  displayName: 'Admin User',
  emailVerified: true,
};

/**
 * Mock Firebase Timestamp
 */
export const createMockTimestamp = (date: Date = new Date()) => ({
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
  toDate: () => date,
  toMillis: () => date.getTime(),
});

/**
 * Wait for async updates (useful for testing async state updates)
 */
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Create mock member data
 */
export const createMockMember = (overrides = {}) => ({
  id: 'member-1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '1234567890',
  planId: 'plan-1',
  planName: 'Gold Plan',
  planStartDate: createMockTimestamp(new Date('2024-01-01')),
  planEndDate: createMockTimestamp(new Date('2024-12-31')),
  amount: 1200,
  status: 'active',
  photoURL: '',
  address: '123 Main St',
  emergencyContact: '9876543210',
  createdAt: createMockTimestamp(),
  ...overrides,
});

/**
 * Create mock attendance record
 */
export const createMockAttendance = (overrides = {}) => ({
  id: 'attendance-1',
  memberId: 'member-1',
  memberName: 'John Doe',
  checkInTime: createMockTimestamp(),
  checkOutTime: null,
  date: '2024-01-15',
  status: 'checked-in',
  ...overrides,
});

/**
 * Create mock billing record
 */
export const createMockBilling = (overrides = {}) => ({
  id: 'billing-1',
  memberId: 'member-1',
  memberName: 'John Doe',
  planName: 'Gold Plan',
  amount: 1200,
  paymentDate: createMockTimestamp(),
  paymentMethod: 'card',
  status: 'completed',
  receiptNumber: 'RCP-001',
  ...overrides,
});

/**
 * Create mock plan
 */
export const createMockPlan = (overrides = {}) => ({
  id: 'plan-1',
  name: 'Gold Plan',
  description: 'Premium gym membership',
  price: 1200,
  duration: 365,
  features: ['24/7 Access', 'Personal Training', 'Group Classes'],
  isActive: true,
  createdAt: createMockTimestamp(),
  ...overrides,
});

/**
 * Create mock activity log
 */
export const createMockActivity = (overrides = {}) => ({
  id: 'activity-1',
  action: 'create',
  entityType: 'member',
  entityId: 'member-1',
  performedBy: 'test@v3fitness.com',
  timestamp: createMockTimestamp(),
  details: 'Created new member: John Doe',
  ...overrides,
});

/**
 * Mock Firestore query snapshot
 */
export const createMockQuerySnapshot = (docs: any[]) => ({
  docs: docs.map((doc) => ({
    id: doc.id,
    data: () => doc,
    exists: () => true,
  })),
  empty: docs.length === 0,
  size: docs.length,
  forEach: (callback: any) => docs.forEach((doc) => callback({ id: doc.id, data: () => doc })),
});

/**
 * Mock Firestore document snapshot
 */
export const createMockDocSnapshot = (data: any, exists = true) => ({
  id: data?.id || 'mock-id',
  data: () => data,
  exists: () => exists,
  ref: {
    id: data?.id || 'mock-id',
  },
});

/**
 * Mock form submission helper
 */
export const mockFormSubmit = (form: HTMLFormElement, data: Record<string, any>) => {
  Object.keys(data).forEach((key) => {
    const input = form.elements.namedItem(key) as HTMLInputElement;
    if (input) {
      input.value = data[key];
    }
  });
};

/**
 * Assert error message is displayed
 */
export const expectErrorMessage = (container: HTMLElement, message: string) => {
  const errorElement = container.querySelector('[role="alert"]');
  expect(errorElement).toBeInTheDocument();
  expect(errorElement).toHaveTextContent(message);
};

/**
 * Create a deferred promise for testing async operations
 */
export const createDeferred = <T,>() => {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve: resolve!, reject: reject! };
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { vi } from 'vitest';
