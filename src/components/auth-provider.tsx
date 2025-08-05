
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export type UserRole = 'admin' | 'judge' | 'competitor' | 'spectator';

// Simple list of emails for role checking
const USER_ROLES: { [email: string]: UserRole } = {
  'admin@example.com': 'admin',
  'super@user.com': 'admin',
  'llanes.joseph.m@gmail.com': 'admin',
  'judge@example.com': 'judge',
  'competitor@example.com': 'competitor',
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole;
  isAdmin: boolean;
  isTrueAdmin: boolean;
  setViewAsRole: (role: UserRole) => void;
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      const userEmail = user?.email || '';
      const userRole = USER_ROLES[userEmail] || 'spectator';
      setTrueRole(userRole);
      // Reset viewAsRole on user change
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
      setViewAsRole: (newRole: UserRole) => {
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
