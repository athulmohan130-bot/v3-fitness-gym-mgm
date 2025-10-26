import { doc, getDoc, setDoc } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import type { GymSettings } from "./types/settings";
import { defaultGymSettings } from "./types/settings";

const SETTINGS_DOC_ID = "gym_settings";
const SETTINGS_COLLECTION = "settings";

export class SettingsService {
  constructor(private firestore: Firestore) {}

  /**
   * Load gym settings from Firestore
   */
  async loadSettings(): Promise<GymSettings> {
    try {
      const settingsRef = doc(this.firestore, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        return settingsDoc.data() as GymSettings;
      }

      // If settings don't exist, create default settings
      await this.saveSettings(defaultGymSettings);
      return defaultGymSettings;
    } catch (error) {
      console.error("Error loading settings:", error);
      return defaultGymSettings;
    }
  }

  /**
   * Save gym settings to Firestore
   */
  async saveSettings(settings: GymSettings): Promise<void> {
    try {
      const settingsRef = doc(this.firestore, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
      await setDoc(settingsRef, settings, { merge: true });
    } catch (error) {
      console.error("Error saving settings:", error);
      throw error;
    }
  }

  /**
   * Update partial settings
   */
  async updateSettings(partialSettings: Partial<GymSettings>): Promise<void> {
    try {
      const settingsRef = doc(this.firestore, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
      await setDoc(settingsRef, partialSettings, { merge: true });
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  }

  /**
   * Reset settings to default
   */
  async resetSettings(): Promise<void> {
    await this.saveSettings(defaultGymSettings);
  }
}
