# V3 Fitness Gym Management - Testing Documentation

> **Professional-grade testing suite for enterprise-level quality assurance**

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Getting Started](#getting-started)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [Coverage Requirements](#coverage-requirements)
- [Continuous Integration](#continuous-integration)

---

## Overview

This project implements a comprehensive testing strategy covering:

- **Unit Tests** - Testing individual functions, validators, and utilities
- **Component Tests** - Testing React components in isolation
- **Integration Tests** - Testing feature workflows and data flows
- **E2E Tests** - Testing complete user journeys (when needed)

### Testing Philosophy

Our testing approach follows industry best practices from companies with 20+ years of experience:

1. **Test Behavior, Not Implementation** - Focus on what users see and experience
2. **Arrange-Act-Assert Pattern** - Clear test structure for maintainability
3. **Test Isolation** - Each test runs independently
4. **Meaningful Test Names** - Tests document expected behavior
5. **Fast Feedback** - Tests run quickly for rapid development

---

## Testing Stack

### Core Testing Framework
- **Vitest** - Fast, modern test runner with excellent DX
- **React Testing Library** - Component testing following best practices
- **@testing-library/user-event** - Simulating real user interactions
- **@testing-library/jest-dom** - Custom matchers for DOM assertions

### Mocking & Utilities
- **MSW (Mock Service Worker)** - API mocking for integration tests
- **Vitest Mocks** - Function and module mocking
- **Custom Test Utilities** - Project-specific testing helpers

### Why This Stack?

- ✅ **Fast**: Vitest is 10-20x faster than Jest
- ✅ **Modern**: ESM support, TypeScript out of the box
- ✅ **DX**: Hot module reload for tests, beautiful UI
- ✅ **Compatible**: Drop-in Jest replacement
- ✅ **Battle-tested**: Used by Vue, Nuxt, Vite, and thousands of projects

---

## Getting Started

### Prerequisites

Ensure you have Node.js 18+ installed:

\`\`\`bash
node --version  # Should be v18 or higher
\`\`\`

### Installation

Testing dependencies are already installed. To verify:

\`\`\`bash
npm list vitest @testing-library/react
\`\`\`

### First Test Run

Run all tests:

\`\`\`bash
npm test
\`\`\`

This will start Vitest in watch mode, automatically rerunning tests as files change.

---

## Test Structure

### Directory Organization

\`\`\`
src/__tests__/
├── setup.ts                    # Global test setup
├── utils/
│   ├── test-utils.tsx         # Custom render functions, helpers
│   └── ...
├── mocks/
│   ├── firebase-mocks.ts      # Firebase mocking utilities
│   └── ...
├── unit/
│   ├── utils.test.ts          # Utility function tests
│   └── validators/
│       ├── plan.test.ts       # Plan validator tests
│       └── settings.test.ts   # Settings validator tests
├── components/
│   └── auth/
│       └── login-form.test.tsx # Login form component tests
├── integration/
│   └── members/
│       └── member-crud.test.tsx # Member CRUD integration tests
└── e2e/
    └── user-flows.test.tsx     # End-to-end user journey tests
\`\`\`

### File Naming Conventions

- Test files: `*.test.ts` or `*.test.tsx`
- Spec files: `*.spec.ts` or `*.spec.tsx` (alternative)
- Located adjacent to source or in `__tests__` directory

---

## Running Tests

### Available Commands

\`\`\`bash
# Run tests in watch mode (development)
npm test

# Run tests once (CI/CD)
npm run test:run

# Run with UI (visual test runner)
npm run test:ui

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test src/__tests__/unit/utils.test.ts

# Run tests matching pattern
npm test -- --grep "login"
\`\`\`

### Watch Mode Commands

When tests are running in watch mode:

- Press `a` to run all tests
- Press `f` to run only failed tests
- Press `t` to filter by test name
- Press `p` to filter by file name
- Press `c` to clear console
- Press `q` to quit

### Coverage Reports

Generate coverage report:

\`\`\`bash
npm run test:coverage
\`\`\`

Coverage reports are generated in:
- `coverage/index.html` - HTML report (open in browser)
- `coverage/lcov.info` - LCOV format (for CI tools)
- Terminal output - Summary view

### Coverage Thresholds

Configured in `vitest.config.ts`:

- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

---

## Writing Tests

### Unit Test Example

\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { planSchema } from '@/lib/validators/plan';

describe('Plan Validator', () => {
  describe('Price Validation', () => {
    it('should accept zero price (free plan)', () => {
      const freePlan = {
        name: 'Free Plan',
        price: 0,
        durationInDays: 30,
        features: [{ value: 'Basic Access' }],
        status: 'active',
      };

      const result = planSchema.safeParse(freePlan);
      expect(result.success).toBe(true);
    });

    it('should reject negative price', () => {
      const invalidPlan = {
        name: 'Invalid Plan',
        price: -100,
        durationInDays: 30,
        features: [{ value: 'Access' }],
        status: 'active',
      };

      const result = planSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Price must be a positive number');
      }
    });
  });
});
\`\`\`

### Component Test Example

\`\`\`typescript
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/login-form';
import { renderWithProviders } from '../../utils/test-utils';

describe('LoginForm Component', () => {
  it('should render form with email and password inputs', () => {
    renderWithProviders(<LoginForm />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should show error for invalid email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'invalid-email');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });
});
\`\`\`

### Integration Test Example

\`\`\`typescript
describe('Member Management Integration', () => {
  it('should create a new member and display in the list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MembersPage />);

    // Click "Add Member" button
    await user.click(screen.getByRole('button', { name: /add member/i }));

    // Fill out the form
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '1234567890');

    // Submit form
    await user.click(screen.getByRole('button', { name: /create member/i }));

    // Verify member appears in the list
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });
});
\`\`\`

---

## Best Practices

### 1. Test Structure (AAA Pattern)

\`\`\`typescript
it('should do something when condition is met', () => {
  // Arrange - Set up test data and conditions
  const testData = { name: 'Test', value: 123 };

  // Act - Perform the action being tested
  const result = functionUnderTest(testData);

  // Assert - Verify the expected outcome
  expect(result).toBe(expected);
});
\`\`\`

### 2. Use Descriptive Test Names

✅ **Good:**
\`\`\`typescript
it('should reject member creation when email is already registered', ...)
\`\`\`

❌ **Bad:**
\`\`\`typescript
it('test member email', ...)
\`\`\`

### 3. Test User Behavior, Not Implementation

✅ **Good:**
\`\`\`typescript
await user.click(screen.getByRole('button', { name: /submit/i }));
expect(screen.getByText(/success/i)).toBeInTheDocument();
\`\`\`

❌ **Bad:**
\`\`\`typescript
component.handleSubmit();
expect(component.state.submitted).toBe(true);
\`\`\`

### 4. Keep Tests Independent

Each test should:
- Set up its own data
- Clean up after itself
- Not depend on other tests
- Be runnable in any order

### 5. Mock External Dependencies

\`\`\`typescript
// Mock Firebase
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
}));

// Mock API calls
vi.mock('@/lib/api', () => ({
  fetchMembers: vi.fn().mockResolvedValue([]),
}));
\`\`\`

### 6. Use Custom Render Functions

\`\`\`typescript
// Instead of plain render()
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// Wraps component with QueryProvider, AuthProvider, etc.
renderWithProviders(<MyComponent />);
\`\`\`

### 7. Wait for Async Updates

\`\`\`typescript
// Always use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText(/loaded/i)).toBeInTheDocument();
});

// Or use findBy queries (built-in waiting)
expect(await screen.findByText(/loaded/i)).toBeInTheDocument();
\`\`\`

### 8. Test Accessibility

\`\`\`typescript
// Use accessible queries
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email address/i);

// Avoid
screen.getByTestId('submit-button'); // Only as last resort
\`\`\`

---

## Coverage Requirements

### Target Coverage

- **Critical Paths**: 90%+ (auth, payments, data mutations)
- **Business Logic**: 80%+ (validators, utilities, services)
- **UI Components**: 70%+ (forms, tables, modals)
- **Overall Project**: 70%+ (enforced by CI)

### What to Test

✅ **Always Test:**
- Business logic and validation rules
- User interactions and form submissions
- Error handling and edge cases
- API integrations and data fetching
- State management and side effects
- Accessibility features

⚠️ **Test Selectively:**
- Simple presentational components
- Third-party library wrappers
- Configuration files
- Style-only components

❌ **Don't Test:**
- External libraries (they have their own tests)
- Framework internals (Next.js, React)
- Trivial getters/setters

---

## Continuous Integration

### GitHub Actions Example

\`\`\`yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
\`\`\`

### Pre-commit Hook

Add to `.husky/pre-commit`:

\`\`\`bash
#!/bin/sh
npm run test:run
npm run lint
npm run typecheck
\`\`\`

---

## Troubleshooting

### Tests Timeout

Increase timeout in `vitest.config.ts`:

\`\`\`typescript
export default defineConfig({
  test: {
    testTimeout: 20000, // 20 seconds
  },
});
\`\`\`

### Mock Not Working

Ensure mock is defined before import:

\`\`\`typescript
vi.mock('./module', () => ({ ... }));
import { Component } from './module'; // Import after mock
\`\`\`

### Firebase Errors

Check `src/__tests__/setup.ts` for proper Firebase mocks.

### Component Not Rendering

Use `renderWithProviders` instead of plain `render` to include all context providers.

---

## Resources

### Documentation
- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library User Event](https://testing-library.com/docs/user-event/intro)
- [Kent C. Dodds Testing Blog](https://kentcdodds.com/blog?q=testing)

### Testing Patterns
- [Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Best Practices](https://testingjavascript.com/)

---

## Support

For questions or issues with testing:

1. Check this documentation
2. Review existing test examples in `src/__tests__/`
3. Consult team members or senior developers
4. Refer to official documentation links above

---

**Happy Testing! 🎯**

*Remember: Tests are not just about catching bugs—they're living documentation of your application's behavior.*
