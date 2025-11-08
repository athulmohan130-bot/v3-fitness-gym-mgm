/**
 * Test Credentials Configuration
 *
 * IMPORTANT: These are test credentials for local development and testing only.
 * DO NOT use production credentials in tests.
 * DO NOT commit sensitive production credentials to version control.
 */

export const TEST_CREDENTIALS = {
  // Valid admin credentials for testing
  admin: {
    email: 'admin@gymflex.com',
    password: 'Admin@123',
    role: 'admin',
  },

  // Mock user credentials for testing
  testUser: {
    email: 'test@gymflex.com',
    password: 'Test@123',
    role: 'user',
  },

  // Invalid credentials for negative testing
  invalid: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  },
} as const;

/**
 * Mock Firebase User Object
 * Matches the structure returned by Firebase Authentication
 */
export const createMockFirebaseUser = (credentials: typeof TEST_CREDENTIALS.admin) => ({
  uid: 'test-user-id',
  email: credentials.email,
  displayName: credentials.email.split('@')[0],
  emailVerified: true,
  photoURL: null,
  phoneNumber: null,
  providerId: 'password',
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
  getIdToken: async () => 'mock-id-token',
  reload: async () => {},
  toJSON: () => ({}),
});

/**
 * Usage in tests:
 *
 * import { TEST_CREDENTIALS } from '../config/test-credentials';
 *
 * await user.type(emailInput, TEST_CREDENTIALS.admin.email);
 * await user.type(passwordInput, TEST_CREDENTIALS.admin.password);
 */
