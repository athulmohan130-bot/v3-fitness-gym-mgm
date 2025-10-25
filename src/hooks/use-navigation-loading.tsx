'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface NavigationLoadingContextType {
  isNavigating: boolean;
  targetPath: string | null;
  startNavigation: (path: string) => void;
  stopNavigation: () => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType | undefined>(undefined);

export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [targetPath, setTargetPath] = useState<string | null>(null);
  const pathname = usePathname();

  const startNavigation = useCallback((path: string) => {
    setIsNavigating(true);
    setTargetPath(path);
  }, []);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setTargetPath(null);
  }, []);

  // Auto-stop navigation when pathname changes
  useEffect(() => {
    if (isNavigating && pathname === targetPath) {
      stopNavigation();
    }
  }, [pathname, targetPath, isNavigating, stopNavigation]);

  return (
    <NavigationLoadingContext.Provider value={{ isNavigating, targetPath, startNavigation, stopNavigation }}>
      {children}
    </NavigationLoadingContext.Provider>
  );
}

export function useNavigationLoading() {
  const context = useContext(NavigationLoadingContext);
  if (!context) {
    throw new Error('useNavigationLoading must be used within a NavigationLoadingProvider');
  }
  return context;
}
