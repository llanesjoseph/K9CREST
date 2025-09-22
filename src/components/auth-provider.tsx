
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export type UserRole = 'admin' | 'judge' | 'competitor' | 'spectator';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole;
  isAdmin: boolean;
  isTrueAdmin: boolean;
  setViewAsRole: (role: UserRole | null) => void;
  viewAsRole: UserRole | null;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    loading: true, 
    role: 'spectator', 
    isAdmin: false,
    isTrueAdmin: false,
    setViewAsRole: () => {},
    viewAsRole: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [trueRole, setTrueRole] = useState<UserRole>('spectator');
  const [viewAsRole, setViewAsRole] = useState<UserRole | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 🚀 AGGRESSIVE ADMIN OVERRIDE: Force joseph@crucibleanalytics.dev to be admin
        if (firebaseUser.email === 'joseph@crucibleanalytics.dev') {
          console.log('🔥 ADMIN OVERRIDE ACTIVATED: Force setting joseph@crucibleanalytics.dev as admin');
          setTrueRole('admin');
          setUser(firebaseUser);
          setViewAsRole(null);
          setLoading(false);

          // Try to set server-side admin claims in background (fire and forget)
          firebaseUser.getIdToken().then(token => {
            fetch('/api/bootstrap-admin', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }).catch(() => {}); // Ignore errors, we already have client-side admin
          }).catch(() => {});

          return;
        }

        try {
          // Regular user flow
          const token = await firebaseUser.getIdToken(true);
          const decoded = JSON.parse(atob(token.split('.')[1] || 'e30='));
          const claimRole = (decoded?.role as UserRole) || 'spectator';
          setTrueRole(claimRole);
          setUser(firebaseUser);
        } catch {
          setTrueRole('spectator');
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
        setTrueRole('spectator');
      }
      setViewAsRole(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const isTrueAdmin = trueRole === 'admin';
  const role = viewAsRole && isTrueAdmin ? viewAsRole : trueRole;
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!loading && !user && !pathname.startsWith('/auth') && pathname !== '/') {
      router.push('/');
    }
  }, [user, loading, router, pathname]);
  
  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    )
  }

  const value = {
      user,
      loading,
      role,
      isAdmin,
      isTrueAdmin,
      setViewAsRole: (newRole: UserRole | null) => {
          if(isTrueAdmin) {
              setViewAsRole(newRole === trueRole ? null : newRole);
          }
      },
      viewAsRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
