// Attendance notification utilities with sound feedback

export interface NotificationConfig {
  playSound: boolean;
  volume: number; // 0 to 1
}

export type MembershipAlertType =
  | 'active'
  | 'expiring-soon'
  | 'expired'
  | 'pending';

export interface AttendanceNotification {
  memberName: string;
  alertType: MembershipAlertType;
  daysRemaining?: number;
  membershipEndDate?: string;
}

// Default notification config
export const defaultNotificationConfig: NotificationConfig = {
  playSound: true,
  volume: 0.7,
};

// Sound effects using Web Audio API
class NotificationSounds {
  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  // Success beep for active members
  playSuccessBeep(volume: number = 0.7) {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }

  // Warning beep for expiring soon
  playWarningBeep(volume: number = 0.7) {
    const ctx = this.getAudioContext();

    // First beep
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 600;
    osc1.type = 'square';
    gain1.gain.setValueAtTime(volume * 0.8, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    // Second beep
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 600;
    osc2.type = 'square';
    gain2.gain.setValueAtTime(volume * 0.8, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.35);
  }

  // Error beep for expired members
  playErrorBeep(volume: number = 0.7) {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 300;
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  }

  // Info beep for pending
  playInfoBeep(volume: number = 0.7) {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 700;
    oscillator.type = 'triangle';

    gainNode.gain.setValueAtTime(volume * 0.6, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }
}

// Main notification handler
export class AttendanceNotificationHandler {
  private sounds = new NotificationSounds();
  private config: NotificationConfig;

  constructor(config: NotificationConfig = defaultNotificationConfig) {
    this.config = config;
  }

  updateConfig(config: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...config };
  }

  notify(notification: AttendanceNotification) {
    const { alertType } = notification;

    // Play sound
    if (this.config.playSound) {
      switch (alertType) {
        case 'active':
          this.sounds.playSuccessBeep(this.config.volume);
          break;
        case 'expiring-soon':
          this.sounds.playWarningBeep(this.config.volume);
          break;
        case 'expired':
          this.sounds.playErrorBeep(this.config.volume);
          break;
        case 'pending':
          this.sounds.playInfoBeep(this.config.volume);
          break;
      }
    }
  }

  // Test all notification types
  test() {
    console.log('Testing notifications...');

    setTimeout(() => {
      this.notify({
        memberName: 'John',
        alertType: 'active'
      });
    }, 500);

    setTimeout(() => {
      this.notify({
        memberName: 'Sarah',
        alertType: 'expiring-soon',
        daysRemaining: 3
      });
    }, 3000);

    setTimeout(() => {
      this.notify({
        memberName: 'Mike',
        alertType: 'expired'
      });
    }, 6000);

    setTimeout(() => {
      this.notify({
        memberName: 'Emma',
        alertType: 'pending'
      });
    }, 9000);
  }
}

// Helper function to determine alert type based on membership dates
export function getMembershipAlertType(
  membershipStatus: string,
  membershipEndDate?: string
): { alertType: MembershipAlertType; daysRemaining?: number } {
  // Calculate days remaining/expired if we have an end date
  let daysRemaining: number | undefined;

  if (membershipEndDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(membershipEndDate);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  if (membershipStatus === 'expired') {
    return { alertType: 'expired', daysRemaining };
  }

  if (membershipStatus === 'pending') {
    return { alertType: 'pending', daysRemaining };
  }

  if (membershipStatus === 'active' && daysRemaining !== undefined) {
    if (daysRemaining <= 3 && daysRemaining >= 0) {
      return { alertType: 'expiring-soon', daysRemaining };
    }

    return { alertType: 'active', daysRemaining };
  }

  return { alertType: 'active', daysRemaining };
}
