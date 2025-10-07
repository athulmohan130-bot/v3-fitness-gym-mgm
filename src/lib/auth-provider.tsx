
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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

const LoadingScreen = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent" />
      <p className="mt-4 text-muted-foreground">Loading application...</p>
    </div>
  </div>
);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const { auth, firestore, user: firebaseUser, isUserLoading } = useFirebase();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;
    const fetchUserProfile = async () => {
      if (!firebaseUser) {
        if(isMounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      
      if (!firestore) {
        // Firestore is not ready yet, wait for it.
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
            if (auth) {
              await signOut(auth);
            }
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Error fetching Firestore profile:', err);
        if(isMounted) setUser(null);
      } finally {
        if(isMounted) setLoading(false);
      }
    };
    
    if(!isUserLoading) {
      fetchUserProfile();
    }
    
    return () => {
      isMounted = false;
    }

  }, [firebaseUser, isUserLoading, firestore, auth]);
  
  useEffect(() => {
    if (loading) return; // Don't perform redirects until all loading is complete

    const isAuthPage = pathname === '/login';

    if (!user && !isAuthPage) {
      router.replace('/login');
    } else if (user && isAuthPage) {
      router.replace('/dashboard/overview');
    }
  }, [user, loading, pathname, router]);

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

  const value = { user, loading, login, logout };

  const isAuthPage = pathname === '/login';
  
  // Show loading screen until we're done, OR if we're about to redirect.
  if (loading || (!user && !isAuthPage) || (user && isAuthPage)) {
    return (
      <AuthContext.Provider value={value}>
        <LoadingScreen />
      </AuthContext.Provider>
    );
  }

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
