"use client";

import { useState, useEffect } from "react";
import { useFirestore } from "@/firebase";
import { SettingsService } from "@/lib/settings-service";
import type { GymSettings } from "@/lib/types/settings";
import { defaultGymSettings } from "@/lib/types/settings";
import { doc } from "firebase/firestore";
import { useDoc } from "@/firebase";

export function useGymSettings() {
  const firestore = useFirestore();
  const [settingsService, setSettingsService] = useState<SettingsService | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize settings service
  useEffect(() => {
    if (firestore) {
      setSettingsService(new SettingsService(firestore));
    }
  }, [firestore]);

  // Real-time settings listener
  const settingsDoc = firestore
    ? doc(firestore, "settings", "gym_settings")
    : null;

  const { data: settings, isLoading, error } = useDoc<GymSettings>(settingsDoc);

  // Save settings
  const saveSettings = async (newSettings: GymSettings) => {
    if (!settingsService) {
      throw new Error("Settings service not initialized");
    }

    setIsSaving(true);
    try {
      await settingsService.saveSettings(newSettings);
    } finally {
      setIsSaving(false);
    }
  };

  // Update partial settings
  const updateSettings = async (partialSettings: Partial<GymSettings>) => {
    if (!settingsService) {
      throw new Error("Settings service not initialized");
    }

    setIsSaving(true);
    try {
      await settingsService.updateSettings(partialSettings);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset settings
  const resetSettings = async () => {
    if (!settingsService) {
      throw new Error("Settings service not initialized");
    }

    setIsSaving(true);
    try {
      await settingsService.resetSettings();
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings: settings || defaultGymSettings,
    isLoading,
    isSaving,
    error,
    saveSettings,
    updateSettings,
    resetSettings,
  };
}
