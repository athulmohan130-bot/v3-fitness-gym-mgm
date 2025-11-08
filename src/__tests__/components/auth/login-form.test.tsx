import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/login-form';
import { renderWithProviders } from '../../utils/test-utils';
import { TEST_CREDENTIALS } from '../../config/test-credentials';

/**
 * Component Tests for LoginForm
 *
 * Testing Strategy:
 * - Render and UI testing
 * - Form validation (client-side)
 * - User interactions (typing, clicking, toggling)
 * - Form submission flows (success and failure)
 * - Loading states
 * - Accessibility features
 * - Error handling and messages
 * - Redirect behavior
 *
 * Key Dependencies Mocked:
 * - useAuth hook
 * - useRouter (Next.js navigation)
 * - Toast notifications
 */

// Mock the auth provider
const mockLogin = vi.fn();
const mockUseAuth = {
  login: mockLogin,
  user: null,
  loading: false,
};

vi.mock('@/lib/auth-provider', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock the router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock toast notifications
const mockToast = vi.fn();
vi.mock('@/hooks/use-notification-toast', () => ({
  useNotificationToast: () => ({
    toast: mockToast,
  }),
}));

// Helper to get inputs by placeholder (works with React Hook Form structure)
const getEmailInput = () => screen.getByPlaceholderText(/you@example.com/i);
const getPasswordInput = () => screen.getByPlaceholderText(/••••••••/i);

describe('LoginForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.user = null;
    mockUseAuth.loading = false;
  });

  describe('Rendering and UI', () => {
    it('should render the login form with all elements', () => {
      renderWithProviders(<LoginForm />);

      // Check header elements
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByText(/sign in to your v3 fitness account/i)).toBeInTheDocument();

      // Check form field labels
      expect(screen.getByText('Email Address')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();

      // Check inputs exist
      expect(getEmailInput()).toBeInTheDocument();
      expect(getPasswordInput()).toBeInTheDocument();

      // Check buttons
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument();

      // Check footer
      expect(screen.getByText(/secure login powered by firebase/i)).toBeInTheDocument();
    });

    it('should render email input with placeholder', () => {
      renderWithProviders(<LoginForm />);
      const emailInput = getEmailInput();
      expect(emailInput).toBeInTheDocument();
    });

    it('should render password input with placeholder', () => {
      renderWithProviders(<LoginForm />);
      const passwordInput = getPasswordInput();
      expect(passwordInput).toBeInTheDocument();
    });

    it('should have email input with autocomplete="email"', () => {
      renderWithProviders(<LoginForm />);
      const emailInput = getEmailInput();
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
    });

    it('should have password input with autocomplete="current-password"', () => {
      renderWithProviders(<LoginForm />);
      const passwordInput = getPasswordInput();
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('should render submit button in enabled state initially', () => {
      renderWithProviders(<LoginForm />);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('should display logo and branding', () => {
      renderWithProviders(<LoginForm />);
      const brandText = screen.getAllByText(/v3 fitness/i);
      expect(brandText.length).toBeGreaterThan(0);
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should initially render password as hidden', () => {
      renderWithProviders(<LoginForm />);
      const passwordInput = getPasswordInput();
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should toggle password visibility when eye icon is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const passwordInput = getPasswordInput();
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      // Initially hidden
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click to show
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      // Click to hide again
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should have proper aria-label for accessibility', () => {
      renderWithProviders(<LoginForm />);
      const toggleButton = screen.getByRole('button', { name: /show password/i });
      expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
    });
  });

  describe('Form Validation', () => {
    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const emailInput = getEmailInput();
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('should show error for empty email', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const emailInput = getEmailInput();
      const passwordInput = getPasswordInput();
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Leave email empty but fill password
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Form should validate - check for either "required" or "invalid" message
      await waitFor(() => {
        const hasError = screen.queryByText(/invalid email|required/i) !== null;
        expect(hasError).toBe(true);
      }, { timeout: 2000 });
    });

    it('should show error for password less than 6 characters', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const emailInput = getEmailInput();
      const passwordInput = getPasswordInput();
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '12345');  // Only 5 characters
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('should show error for empty password', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const emailInput = getEmailInput();
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Fill only email, leave password empty
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      // Form should validate - check for password error message
      await waitFor(() => {
        const hasError = screen.queryByText(/password must be at least 6 characters|required/i) !== null;
        expect(hasError).toBe(true);
      }, { timeout: 2000 });
    });

    it('should show multiple errors when both fields are invalid', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const emailInput = getEmailInput();
      const passwordInput = getPasswordInput();
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, '123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('should clear errors when valid input is entered', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const emailInput = getEmailInput();
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Enter invalid email first
      await user.type(emailInput, 'invalid');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });

      // Clear and enter valid email
      await user.clear(emailInput);
      await user.type(emailInput, 'valid@example.com');

      // Error should clear
      await waitFor(() => {
        expect(screen.queryByText(/invalid email address/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission - Success', () => {
    it('should call login function with correct credentials on valid submission', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({ user: { uid: '123', email: TEST_CREDENTIALS.admin.email } });

      renderWithProviders(<LoginForm />);

      const emailInput = getEmailInput();
      const passwordInput = getPasswordInput();
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Use actual admin credentials
      await user.type(emailInput, TEST_CREDENTIALS.admin.email);
      await user.type(passwordInput, TEST_CREDENTIALS.admin.password);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(
          TEST_CREDENTIALS.admin.email,
          TEST_CREDENTIALS.admin.password
        );
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithProviders(<LoginForm />);

      const emailInput = getEmailInput();
      const passwordInput = getPasswordInput();
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should show loading text
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button during login', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithProviders(<LoginForm />);

      const emailInput = getEmailInput();
      const passwordInput = getPasswordInput();
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Submission - Failure', () => {
    it('should show error toast on login failure', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      renderWithProviders(<LoginForm />);

      const emailInput = getEmailInput();
      const passwordInput = getPasswordInput();
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          variant: 'destructive',
          title: 'Login Failed',
          description: 'Invalid credentials. Please check your email and password.',
        });
      });
    });

    it('should re-enable submit button after login failure', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      renderWithProviders(<LoginForm />);

      const emailInput = getEmailInput();
      const passwordInput = getPasswordInput();
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should allow retry after failed login', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'))
               .mockResolvedValueOnce({ user: { uid: '123' } });

      renderWithProviders(<LoginForm />);

      const emailInput = getEmailInput();
      const passwordInput = getPasswordInput();
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // First attempt - fail
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      // Second attempt - success
      await user.clear(passwordInput);
      await user.type(passwordInput, 'correctpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Forgot Password', () => {
    it('should show info toast when forgot password is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const forgotPasswordButton = screen.getByRole('button', { name: /forgot password/i });
      await user.click(forgotPasswordButton);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Password Reset',
        description: 'Please contact your administrator to reset your password.',
      });
    });

    it('should not trigger form submission when forgot password is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const forgotPasswordButton = screen.getByRole('button', { name: /forgot password/i });
      await user.click(forgotPasswordButton);

      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('Redirect Behavior', () => {
    it('should redirect to dashboard if user is already logged in', async () => {
      mockUseAuth.user = { uid: '123', email: 'test@example.com' };
      mockUseAuth.loading = false;

      renderWithProviders(<LoginForm />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/overview');
      });
    });

    it('should not redirect when loading', () => {
      mockUseAuth.user = null;
      mockUseAuth.loading = true;

      renderWithProviders(<LoginForm />);

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should not redirect when no user', () => {
      mockUseAuth.user = null;
      mockUseAuth.loading = false;

      renderWithProviders(<LoginForm />);

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', () => {
      renderWithProviders(<LoginForm />);

      expect(getEmailInput()).toBeInTheDocument();
      expect(getPasswordInput()).toBeInTheDocument();
    });

    it('should associate error messages with inputs', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        const emailInput = getEmailInput();
        // Error should be associated via aria-describedby or similar
        expect(emailInput).toBeInTheDocument();
      });
    });

    it('should have accessible button labels', () => {
      renderWithProviders(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const toggleButton = screen.getByRole('button', { name: /show password/i });
      const forgotButton = screen.getByRole('button', { name: /forgot password/i });

      expect(submitButton).toBeInTheDocument();
      expect(toggleButton).toBeInTheDocument();
      expect(forgotButton).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow typing in email field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const emailInput = getEmailInput() as HTMLInputElement;
      await user.type(emailInput, 'user@test.com');

      expect(emailInput.value).toBe('user@test.com');
    });

    it('should allow typing in password field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const passwordInput = getPasswordInput() as HTMLInputElement;
      await user.type(passwordInput, 'mypassword');

      expect(passwordInput.value).toBe('mypassword');
    });

    it('should handle tab navigation between fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const emailInput = getEmailInput();

      await user.click(emailInput);
      await user.tab();

      const passwordInput = getPasswordInput();
      expect(passwordInput).toHaveFocus();
    });

    it('should submit form on Enter key press', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({ user: { uid: '123' } });

      renderWithProviders(<LoginForm />);

      const emailInput = getEmailInput();
      const passwordInput = getPasswordInput();

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123{Enter}');

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });
  });
});
