# Notification System Documentation

## Overview

The notification system provides an Azure-style notification bar that displays all toast messages and allows users to manage them. Notifications appear in a bell icon in the header with an unread count badge, and users can:

- View all notifications in a dropdown panel
- Mark individual notifications as read (by clicking)
- Clear individual notifications (X button)
- Mark all as read
- Clear all notifications

## Architecture

### Components

1. **NotificationProvider** (`/lib/notification-provider.tsx`)
   - Context provider that manages notification state
   - Provides methods to add, read, and clear notifications

2. **AppHeader** (`/components/layout/header.tsx`)
   - Displays the notification bell icon with badge
   - Shows desktop dropdown and mobile panel

3. **useNotificationToast** (`/hooks/use-notification-toast.ts`)
   - Custom hook that combines toast and notification functionality
   - Automatically adds all toast messages to the notification bar

## Usage

### Basic Usage - Add Notification Only

```tsx
import { useNotifications } from "@/lib/notification-provider";

function MyComponent() {
  const { addNotification } = useNotifications();

  const handleAction = () => {
    addNotification({
      title: "Success",
      message: "Action completed successfully!",
      type: "success", // success, error, warning, info
    });
  };
}
```

### Recommended Usage - Toast + Notification

```tsx
import { useNotificationToast } from "@/hooks/use-notification-toast";

function MyComponent() {
  const { toast } = useNotificationToast();

  const handleSave = () => {
    // This shows both a toast AND adds to notification bar
    toast({
      title: "Success",
      description: "Member details saved successfully!",
      // variant: "destructive" for errors
    });
  };
}
```

### Replace Existing Toast Usage

**Before:**
```tsx
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();
toast({
  title: "Success",
  description: "Action completed",
});
```

**After:**
```tsx
import { useNotificationToast } from "@/hooks/use-notification-toast";

const { toast } = useNotificationToast();
toast({
  title: "Success",
  description: "Action completed",
});
```

## Notification Types

- **success** (green): Successful operations
- **error** (red): Failed operations, errors
- **warning** (yellow): Warnings, expiry reminders
- **info** (blue): General information, announcements

## Features

### Unread Badge
- Shows count of unread notifications
- Updates in real-time
- Displays "9+" for counts > 9

### Mark as Read
- Click on any notification to mark it as read
- "Mark all read" button to read all at once
- Unread notifications have a highlighted background

### Clear Notifications
- Individual clear: X button on each notification (appears on hover)
- Clear all: "Clear" button in header

### Timestamp
- Shows relative time (e.g., "5m ago", "2h ago", "3d ago")
- Auto-formats to date for older notifications

### Mobile Support
- Full-screen panel for mobile devices
- Swipe-friendly interface
- Touch-optimized buttons

## Examples

See `/components/notification-demo.tsx` for working examples of all notification types.

## Integration with Existing Code

To integrate with your existing toast calls:

1. Replace `useToast` import with `useNotificationToast`
2. All existing toast calls will automatically add notifications to the bar
3. No other changes required!

## API Reference

### `useNotifications()`

```ts
{
  notifications: Notification[],
  unreadCount: number,
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void,
  markAsRead: (id: string) => void,
  clearNotification: (id: string) => void,
  clearAllNotifications: () => void,
}
```

### `useNotificationToast()`

```ts
{
  toast: (options: ToastOptions) => void,
}
```

## Notification Object

```ts
interface Notification {
  id: string;
  title?: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  timestamp: Date;
  read: boolean;
}
```

## Best Practices

1. **Use descriptive titles**: Help users understand the notification at a glance
2. **Keep messages concise**: Long messages wrap but brief is better
3. **Choose appropriate types**: Use the right color code for the message type
4. **Use useNotificationToast**: Instead of direct useNotifications for consistency
5. **Don't spam**: Group related notifications when possible
