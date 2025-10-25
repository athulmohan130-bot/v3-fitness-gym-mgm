'use client';

import { useContext } from 'react';
import { FirebaseContext } from './provider';

/**
 * Hook to access Firebase Realtime Database
 * @returns Firebase Realtime Database instance
 */
export function useRealtimeDb() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useRealtimeDb must be used within a FirebaseProvider');
  }
  return context.realtimeDb;
}
