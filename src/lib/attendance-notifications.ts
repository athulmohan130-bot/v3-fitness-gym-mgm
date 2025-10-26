// Attendance notification utilities with sound and voice feedback

export interface NotificationConfig {
  playSound: boolean;
  playVoice: boolean;
  volume: number; // 0 to 1
  voiceRate?: number; // 0.1 to 2.0, default 0.95
  voicePitch?: number; // 0 to 2.0, default 1.05
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
  playVoice: true,
  volume: 0.7,
  voiceRate: 0.95,
  voicePitch: 1.05,
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

// Voice announcements using Web Speech API
class VoiceAnnouncer {
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;

      // Wait for voices to load
      const loadVoices = () => {
        const voices = this.synth?.getVoices() || [];

        // Prefer natural-sounding voices in order of preference
        // Priority: Premium/Natural voices > Local voices > Any English voice
        const preferredVoiceNames = [
          'Samantha', // macOS natural voice
          'Google US English', // Google's natural voice
          'Microsoft Aria Online', // Microsoft natural voice
          'Alex', // macOS voice
          'Google UK English Female',
          'Microsoft Zira', // Windows voice
          'Karen', // macOS voice
          'Moira', // macOS voice
        ];

        // First, try to find a preferred natural voice
        for (const name of preferredVoiceNames) {
          const voice = voices.find(v => v.name.includes(name));
          if (voice) {
            this.voice = voice;
            console.log('Selected voice:', voice.name);
            return;
          }
        }

        // Fallback: Find any English voice that's marked as local (usually higher quality)
        const localEnglishVoice = voices.find(v =>
          v.lang.startsWith('en') && v.localService
        );
        if (localEnglishVoice) {
          this.voice = localEnglishVoice;
          console.log('Selected local English voice:', localEnglishVoice.name);
          return;
        }

        // Last resort: Any English voice
        this.voice = voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
        if (this.voice) {
          console.log('Selected fallback voice:', this.voice.name);
        }
      };

      if (this.synth.getVoices().length > 0) {
        loadVoices();
      } else {
        this.synth.addEventListener('voiceschanged', loadVoices);
      }
    }
  }

  speak(text: string, volume: number = 0.7, rate: number = 0.95, pitch: number = 1.05) {
    if (!this.synth) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume;
    utterance.rate = rate;
    utterance.pitch = pitch;

    if (this.voice) {
      utterance.voice = this.voice;
    }

    this.synth.speak(utterance);
  }
}

// Main notification handler
export class AttendanceNotificationHandler {
  private sounds = new NotificationSounds();
  private voice = new VoiceAnnouncer();
  private config: NotificationConfig;

  constructor(config: NotificationConfig = defaultNotificationConfig) {
    this.config = config;
  }

  updateConfig(config: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...config };
  }

  private getMessage(notification: AttendanceNotification): string {
    const { memberName, alertType, daysRemaining } = notification;

    switch (alertType) {
      case 'active':
        return `Welcome ${memberName}! Your membership is active.`;

      case 'expiring-soon':
        if (daysRemaining !== undefined) {
          if (daysRemaining === 0) {
            return `Attention ${memberName}! Your membership expires today. Please renew immediately.`;
          } else if (daysRemaining === 1) {
            return `Alert ${memberName}! Your membership expires tomorrow. Please renew soon.`;
          } else {
            return `Reminder ${memberName}! Your membership expires in ${daysRemaining} days. Please consider renewing.`;
          }
        }
        return `Alert ${memberName}! Your membership is expiring soon. Please renew.`;

      case 'expired':
        return `Attention ${memberName}! Your membership has expired. Please renew to continue using the gym.`;

      case 'pending':
        return `Welcome ${memberName}! Your membership is pending approval.`;

      default:
        return `Welcome ${memberName}!`;
    }
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

    // Play voice message
    if (this.config.playVoice) {
      const message = this.getMessage(notification);
      // Delay voice slightly so it doesn't overlap with sound
      setTimeout(() => {
        this.voice.speak(
          message,
          this.config.volume,
          this.config.voiceRate ?? 0.95,
          this.config.voicePitch ?? 1.05
        );
      }, 300);
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
  if (membershipStatus === 'expired') {
    return { alertType: 'expired' };
  }

  if (membershipStatus === 'pending') {
    return { alertType: 'pending' };
  }

  if (membershipStatus === 'active' && membershipEndDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(membershipEndDate);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 3 && daysRemaining >= 0) {
      return { alertType: 'expiring-soon', daysRemaining };
    }

    return { alertType: 'active', daysRemaining };
  }

  return { alertType: 'active' };
}
