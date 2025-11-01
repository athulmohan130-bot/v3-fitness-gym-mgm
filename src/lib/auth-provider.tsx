
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { GymUser, UserRole } from './types';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profileImageUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex h-screen w-full flex-col items-center justify-center bg-background transition-opacity duration-500 animate-fadeIn">
      {/* Logo / App name */}
      <div className="flex items-center space-x-2 mb-8 scale-100 sm:scale-110 md:scale-125">
        <span className="text-3xl md:text-4xl font-bold text-primary">V3</span>
        <span className="text-3xl md:text-4xl font-bold text-white bg-primary px-2 py-1 rounded">
          Fitness
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative w-40 sm:w-56 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-1/3 bg-primary rounded-full animate-loading-bar" />
      </div>
    </div>
  );
};

export default function AuthProvider({ children }: { children: ReactNode }) {
  const { auth, firestore, user: firebaseUser, isUserLoading } = useFirebase();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

useEffect(() => {
  let isMounted = true;

  const handleAuthChange = async () => {
    if (isUserLoading) return;
    setLoading(true);

    if (!firebaseUser) {
      if (isMounted) {
        setUser(null);
        setLoading(false);
      }
      return;
    }

    if (!firestore) {
      setLoading(false);
      return;
    }

    try {
      const userDocRef = doc(firestore, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (isMounted) {
        if (userDocSnap.exists()) {
          const data = userDocSnap.data() as GymUser;
          setUser({
            id: firebaseUser.uid,
            name: data.name,
            email: data.email,
            role: data.role,
            profileImageUrl: data.profileImageUrl,
          });
        } else {
          console.warn(`No Firestore profile for user ${firebaseUser.uid}, logging out.`);
          if (auth) await signOut(auth);
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Error fetching Firestore profile:', err);
      if (isMounted) setUser(null);
    } finally {
      if (isMounted) {
        setLoading(false);
        setHasInitialized(true);
      }
    }
  };

  handleAuthChange();

  return () => {
    isMounted = false;
  };
}, [firebaseUser, isUserLoading, firestore, auth]);
  
  useEffect(() => {
    // Don't redirect until auth has been fully initialized
    if (!hasInitialized) return;
    if (loading) return;

    const isAuthPage = pathname === '/login';

    // Only redirect logged-in users away from login page to overview
    // Don't redirect on other pages - stay where you are
    // ProtectedRoute handles redirecting unauthenticated users to login
    if (user && isAuthPage) {
      router.replace('/dashboard/overview');
    }
  }, [user, loading, pathname, router, hasInitialized]);

  const login = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error('Auth service not initialized');
    await signInWithEmailAndPassword(auth, email, password);
    // The state change from firebase will trigger the useEffect hooks above
  },[auth]);

  const logout = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
    setUser(null);
    setLoading(false); 
    // The change in `user` state will trigger the redirect useEffect
  }, [auth]);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  const isAuthPage = pathname === '/login';

  // If we are still loading user state, show loading screen
  if (loading || isUserLoading) {
    return (
      <AuthContext.Provider value={value}>
        <LoadingScreen />
      </AuthContext.Provider>
    );
  }

  // If the user is authenticated and on the login page, show loading until redirect happens
  if (user && isAuthPage) {
    return (
      <AuthContext.Provider value={value}>
        <LoadingScreen />
      </AuthContext.Provider>
    );
  }

  // For all other cases (including unauthenticated users on dashboard pages),
  // let the ProtectedRoute component handle the redirect and loading screen
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
