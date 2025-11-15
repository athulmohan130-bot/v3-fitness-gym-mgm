"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  const saveSettings = useCallback(async (newSettings: GymSettings) => {
    if (!settingsService) {
      throw new Error("Settings service not initialized");
    }

    setIsSaving(true);
    try {
      await settingsService.saveSettings(newSettings);
    } finally {
      setIsSaving(false);
    }
  }, [settingsService]);

  // Update partial settings
  const updateSettings = useCallback(async (partialSettings: Partial<GymSettings>) => {
    if (!settingsService) {
      throw new Error("Settings service not initialized");
    }

    setIsSaving(true);
    try {
      await settingsService.updateSettings(partialSettings);
    } finally {
      setIsSaving(false);
    }
  }, [settingsService]);

  // Reset settings
  const resetSettings = useCallback(async () => {
    if (!settingsService) {
      throw new Error("Settings service not initialized");
    }

    setIsSaving(true);
    try {
      await settingsService.resetSettings();
    } finally {
      setIsSaving(false);
    }
  }, [settingsService]);

  // Memoize the settings object to prevent unnecessary re-renders
  const memoizedSettings = useMemo(() => settings || defaultGymSettings, [settings]);

  return useMemo(() => ({
    settings: memoizedSettings,
    isLoading,
    isSaving,
    error,
    saveSettings,
    updateSettings,
    resetSettings,
  }), [memoizedSettings, isLoading, isSaving, error, saveSettings, updateSettings, resetSettings]);
}
