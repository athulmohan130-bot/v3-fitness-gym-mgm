# Gym Settings Feature

## Overview
Comprehensive settings system for single-owner gym management application. All settings are stored in Firestore and synced in real-time across the application.

## Settings Categories

### 1. **Business Information**
Configure your gym's basic details:
- **Gym Name** (required) - Your gym's name
- **Owner Name** - Owner/manager name
- **Email** - Contact email address
- **Phone** - Contact phone number
- **Address** - Physical gym address

### 2. **Regional Settings**
Customize regional preferences:
- **Currency** - INR, USD, EUR, or GBP (default: INR)
- **Locale** - Date and number formatting (default: en-IN)
- **Timezone** - Time zone for scheduling (default: Asia/Kolkata)

### 3. **Notification Settings** ⭐
Configure audio feedback for attendance check-ins:
- **Sound Alerts** - Play beep sounds when members check in
  - Active members: Success beep (800Hz)
  - Expiring soon: Warning beeps (600Hz double)
  - Expired: Error beep (300Hz)
  - Pending: Info beep (700Hz)
- **Voice Announcements** - Text-to-speech member name and status
- **Volume** - Adjustable from 0-100% (default: 70%)

**Integration**: These settings sync with the Attendance page notification controls.

### 4. **Attendance Settings**
Customize attendance tracking:
- **Enable Biometric** - Use biometric authentication for check-in
- **Auto Mark Present** - Automatically mark attendance when scanning
- **Expiry Warning Threshold** - Days before expiry to show warning (default: 3 days)

### 5. **Membership Settings**
Default membership preferences:
- **Default Plan Duration** - Default duration in days (default: 30)
- **Auto Renewal Reminders** - Send renewal reminders to members
- **Reminder Days Before** - Days before expiry to send reminder (default: 7)

### 6. **Display Settings**
Customize UI appearance:
- **Default View Mode** - Grid, List, or Compact (default: Grid)
- **Items Per Page** - Number of items to show per page (5-100)
- **Show Avatars** - Display member profile pictures
- **Compact Mode** - Reduce spacing for information density

### 7. **Billing Settings**
Configure billing and invoices:
- **Enable Tax** - Apply tax to membership prices
- **Tax Rate** - Tax percentage (default: 18% GST)
- **Invoice Prefix** - Prefix for invoice numbers (default: "INV")
- **Payment Methods** - Accepted payment methods (Cash, Card, UPI)

## Technical Implementation

### Files Created
```
src/lib/types/settings.ts           # Settings type definitions
src/lib/validators/settings.ts      # Zod validation schemas
src/lib/settings-service.ts         # Firestore CRUD service
src/hooks/use-gym-settings.ts       # React hook for settings
src/app/dashboard/settings/page.tsx # Settings UI
```

### Firebase Structure
Settings are stored in Firestore:
```
/settings/gym_settings
  - gymName: string
  - ownerName: string
  - email: string
  - phone: string
  - address: string
  - currency: "INR" | "USD" | "EUR" | "GBP"
  - locale: string
  - timezone: string
  - notifications: { playSound, playVoice, volume }
  - attendance: { enableBiometric, autoMarkPresent, expiringThresholdDays }
  - membership: { defaultPlanDuration, autoRenewalReminder, reminderDaysBefore }
  - display: { defaultViewMode, itemsPerPage, showAvatars, compactMode }
  - billing: { taxRate, enableTax, invoicePrefix, paymentMethods }
```

### Usage Example
```tsx
import { useGymSettings } from "@/hooks/use-gym-settings";

function MyComponent() {
  const { settings, isLoading, saveSettings, updateSettings } = useGymSettings();
  
  // Access settings
  const gymName = settings.gymName;
  const currency = settings.currency;
  
  // Update specific setting
  await updateSettings({ 
    notifications: { 
      ...settings.notifications, 
      playSound: false 
    } 
  });
  
  // Save all settings
  await saveSettings(newSettings);
}
```

### Real-time Sync
- Settings use Firestore real-time listeners
- Changes are immediately reflected across all components
- Attendance page notification controls sync with global settings

## Features

### Save/Reset Functionality
- **Save Changes** - Only enabled when form is dirty
- **Reset All** - Restore all settings to default values (with confirmation)
- **Auto-save indicator** - Shows loading state during save

### Validation
- Form validation using Zod schemas
- Real-time error messages
- Type-safe with TypeScript

### Responsive Design
- Mobile-optimized tab navigation
- Responsive form layouts
- Touch-friendly controls

## Future Enhancements
Potential additions for future versions:
- **Backup Settings** - Automated data backups
- **Theme Settings** - Light/Dark mode toggle
- **Language Settings** - Multi-language support
- **Email Templates** - Customizable email templates for reminders
- **Working Hours** - Set gym operating hours
- **Holidays** - Mark gym holidays/closures
- **Custom Fields** - Add custom member fields
- **Reports Settings** - Configure default report parameters
