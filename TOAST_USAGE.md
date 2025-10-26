# Beautiful Toast Notification System

The toast notification system has been enhanced with beautiful colors, icons, and better styling.

## Toast Variants

### 1. Success Toast (Green)
```tsx
toast({
  variant: "success",
  title: "Success!",
  description: "Member added successfully.",
});
```
- **Color**: Green background with green border
- **Icon**: CheckCircle2 (✓)
- **Use for**: Successful operations, confirmations

### 2. Error/Destructive Toast (Red)
```tsx
toast({
  variant: "destructive",
  title: "Error",
  description: "Failed to save member. Please try again.",
});
```
- **Color**: Red background with red border
- **Icon**: XCircle (✗)
- **Use for**: Errors, failures, critical issues

### 3. Warning Toast (Amber)
```tsx
toast({
  variant: "warning",
  title: "Warning",
  description: "Membership expires in 3 days.",
});
```
- **Color**: Amber background with amber border
- **Icon**: AlertCircle (⚠)
- **Use for**: Warnings, cautionary messages

### 4. Info Toast (Blue)
```tsx
toast({
  variant: "info",
  title: "Information",
  description: "Your data has been synced.",
});
```
- **Color**: Blue background with blue border
- **Icon**: Info (ℹ)
- **Use for**: Informational messages, tips

### 5. Default Toast (Blue)
```tsx
toast({
  title: "Notification",
  description: "This is a default notification.",
});
```
- **Color**: White/Gray background with blue border
- **Icon**: Info (ℹ)
- **Use for**: General notifications

## Features

✨ **Beautiful Design**
- Rounded corners (rounded-xl)
- Left border accent (4px thick)
- Box shadow for depth
- Backdrop blur effect
- Smooth animations

🎨 **Color-Coded**
- Success: Green
- Error: Red
- Warning: Amber
- Info: Blue

🌗 **Dark Mode Support**
- Automatically adapts to dark mode
- Proper contrast in both themes

🔔 **Icons**
- Each variant has a unique icon
- Colored to match the theme

⚡ **Smooth Animations**
- Slide in from top/bottom
- Fade out on close
- Swipe to dismiss

## Example Usage in Code

```tsx
import { useToast } from "@/hooks/use-toast";

export function MyComponent() {
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      variant: "success",
      title: "Member Created",
      description: "John Doe has been added to the system.",
    });
  };

  const handleError = () => {
    toast({
      variant: "destructive",
      title: "Uh oh! Something went wrong.",
      description: "There was a problem with your request.",
    });
  };

  const handleWarning = () => {
    toast({
      variant: "warning",
      title: "Payment Due",
      description: "Membership payment is due in 5 days.",
    });
  };

  return (
    // Your component JSX
  );
}
```

## Real-World Examples

### Membership Renewal
```tsx
toast({
  variant: "success",
  title: "Membership Renewed 🎉",
  description: `Plan: Premium Monthly, valid till ${format(endDate, "PPP")}`,
});
```

### Payment Success
```tsx
toast({
  variant: "success",
  title: "Payment Received",
  description: `₹${amount} received via ${paymentMode}.`,
});
```

### Delete Confirmation
```tsx
toast({
  variant: "destructive",
  title: "Member Deleted",
  description: "The member has been permanently removed.",
});
```

### Expiry Warning
```tsx
toast({
  variant: "warning",
  title: "Membership Expiring Soon",
  description: "Your membership expires in 3 days. Please renew.",
});
```
