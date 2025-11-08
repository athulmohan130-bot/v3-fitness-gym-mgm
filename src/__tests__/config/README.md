# Test Configuration

## Test Credentials

This directory contains test credentials and configuration for the V3 Fitness Gym Management System test suite.

### Available Credentials

```typescript
import { TEST_CREDENTIALS } from './test-credentials';

// Admin credentials (for testing admin features)
TEST_CREDENTIALS.admin.email     // admin@gymflex.com
TEST_CREDENTIALS.admin.password  // Admin@123

// Test user credentials (for testing regular user features)
TEST_CREDENTIALS.testUser.email     // test@gymflex.com
TEST_CREDENTIALS.testUser.password  // Test@123

// Invalid credentials (for testing error scenarios)
TEST_CREDENTIALS.invalid.email     // invalid@example.com
TEST_CREDENTIALS.invalid.password  // wrongpassword
```

### Usage in Tests

#### Example 1: Testing Successful Login

```typescript
import { TEST_CREDENTIALS } from '../config/test-credentials';

it('should login successfully with valid admin credentials', async () => {
  const user = userEvent.setup();
  renderWithProviders(<LoginForm />);

  // Use actual admin credentials
  await user.type(
    screen.getByLabelText(/email/i),
    TEST_CREDENTIALS.admin.email
  );
  await user.type(
    screen.getByLabelText(/password/i),
    TEST_CREDENTIALS.admin.password
  );
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => {
    expect(mockLogin).toHaveBeenCalledWith(
      TEST_CREDENTIALS.admin.email,
      TEST_CREDENTIALS.admin.password
    );
  });
});
```

#### Example 2: Testing Failed Login

```typescript
import { TEST_CREDENTIALS } from '../config/test-credentials';

it('should show error with invalid credentials', async () => {
  const user = userEvent.setup();
  mockLogin.mockRejectedValue(new Error('Invalid credentials'));

  renderWithProviders(<LoginForm />);

  // Use invalid credentials
  await user.type(
    screen.getByLabelText(/email/i),
    TEST_CREDENTIALS.invalid.email
  );
  await user.type(
    screen.getByLabelText(/password/i),
    TEST_CREDENTIALS.invalid.password
  );
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => {
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
```

#### Example 3: Testing Role-Based Access

```typescript
import { TEST_CREDENTIALS, createMockFirebaseUser } from '../config/test-credentials';

it('should grant admin access with admin credentials', async () => {
  const adminUser = createMockFirebaseUser(TEST_CREDENTIALS.admin);
  mockUseAuth.user = adminUser;

  renderWithProviders(<AdminDashboard />);

  // Admin should see all features
  expect(screen.getByText(/admin panel/i)).toBeInTheDocument();
});

it('should restrict regular user access', async () => {
  const regularUser = createMockFirebaseUser(TEST_CREDENTIALS.testUser);
  mockUseAuth.user = regularUser;

  renderWithProviders(<AdminDashboard />);

  // Regular user should not see admin features
  expect(screen.queryByText(/admin panel/i)).not.toBeInTheDocument();
});
```

### Security Notes

⚠️ **IMPORTANT SECURITY GUIDELINES:**

1. **Never use production credentials in tests**
   - These credentials are for testing only
   - Never commit production passwords to version control

2. **Environment-specific credentials**
   - Use different credentials for dev/staging/production
   - Keep production credentials in secure vaults (not in code)

3. **CI/CD Security**
   - Use environment variables for sensitive data
   - Never log credentials in test output
   - Rotate test credentials periodically

4. **Local Development**
   - These test credentials are safe for local testing
   - Use Firebase Emulator Suite for local development
   - Never connect tests to production Firebase

### Mock Firebase User Helper

The `createMockFirebaseUser()` function creates a mock user object matching Firebase's structure:

```typescript
import { createMockFirebaseUser, TEST_CREDENTIALS } from '../config/test-credentials';

const mockUser = createMockFirebaseUser(TEST_CREDENTIALS.admin);
// Returns:
// {
//   uid: 'test-user-id',
//   email: 'admin@gymflex.com',
//   displayName: 'admin',
//   emailVerified: true,
//   getIdToken: async () => 'mock-id-token',
//   ...
// }
```

### Best Practices

✅ **DO:**
- Use `TEST_CREDENTIALS` constants in all tests
- Test both valid and invalid credential scenarios
- Test role-based access control
- Mock Firebase responses appropriately
- Keep credentials updated if they change

❌ **DON'T:**
- Hard-code credentials directly in test files
- Use production credentials
- Commit sensitive credentials to git
- Share test credentials publicly
- Skip negative test cases

### Adding New Test Credentials

To add new test credentials:

1. Open `test-credentials.ts`
2. Add new credential object:
   ```typescript
   export const TEST_CREDENTIALS = {
     // ... existing credentials
     newRole: {
       email: 'newrole@gymflex.com',
       password: 'NewRole@123',
       role: 'newrole',
     },
   } as const;
   ```
3. Document the new credentials in this README
4. Update tests to use the new credentials

### Troubleshooting

**Issue: Tests fail with authentication errors**
- Verify mock setup is correct
- Check that `mockLogin` is properly configured
- Ensure credentials match expected format

**Issue: Credentials don't work in local environment**
- These are test credentials, not for actual Firebase
- Use Firebase Emulator Suite for local development
- Check Firebase mocks in `setup.ts`

---

For more information on testing, see:
- [TESTING.md](../../../TESTING.md) - Complete testing guide
- [src/__tests__/README.md](../README.md) - Test suite documentation
