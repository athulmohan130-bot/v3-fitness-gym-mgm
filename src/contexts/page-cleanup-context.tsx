'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PageCleanupContextType {
  registerCleanup: (cleanup: (() => void) | null) => void;
  runCleanup: () => void;
}

const PageCleanupContext = createContext<PageCleanupContextType | undefined>(undefined);

export function PageCleanupProvider({ children }: { children: ReactNode }) {
  const [cleanup, setCleanup] = useState<(() => void) | null>(null);

  const registerCleanup = useCallback((cleanupFunc: (() => void) | null) => {
    setCleanup(() => cleanupFunc);
  }, []);

  const runCleanup = useCallback(() => {
    if (cleanup) {
      console.log('Running page cleanup function...');
      cleanup();
    }
  }, [cleanup]);

  return (
    <PageCleanupContext.Provider value={{ registerCleanup, runCleanup }}>
      {children}
    </PageCleanupContext.Provider>
  );
}

export function usePageCleanup() {
  const context = useContext(PageCleanupContext);
  if (!context) {
    throw new Error('usePageCleanup must be used within a PageCleanupProvider');
  }
  return context;
}
