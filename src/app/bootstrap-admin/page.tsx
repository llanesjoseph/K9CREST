"use client";

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const AUTHORIZED_ADMINS = [
  'joseph@crucibleanalytics.dev',
  'secretary@alecanpolice9.com'
];

export default function BootstrapAdminPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const router = useRouter();

  const isAuthorizedAdmin = user?.email && AUTHORIZED_ADMINS.includes(user.email);

  const handleBootstrapAdmin = async () => {
    if (!user) return;

    setLoading(true);
    setResult(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/bootstrap-admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: data.message });
        // Refresh the user token to get new claims
        await user.getIdToken(true);
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setResult({ success: false, message: data.error || 'Failed to set admin role' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Network error - please try again' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Admin Bootstrap</CardTitle>
            <CardDescription>Please log in first</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 mx-auto text-primary mb-4" />
          <CardTitle>Bootstrap Admin Role</CardTitle>
          <CardDescription>
            Set admin role for authorized users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p><strong>Current User:</strong> {user.email}</p>
            {isAuthorizedAdmin ? (
              <p className="mt-2 text-green-600 dark:text-green-400 font-medium">
                ✓ You are authorized to bootstrap admin access
              </p>
            ) : (
              <p className="mt-2 text-red-600 dark:text-red-400">
                You are not authorized to use this bootstrap function
              </p>
            )}
          </div>

          {result && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              result.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {result.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span className="text-sm">{result.message}</span>
            </div>
          )}

          <Button
            onClick={handleBootstrapAdmin}
            disabled={loading || !isAuthorizedAdmin}
            className="w-full"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? 'Setting Admin Role...' : 'Set Admin Role'}
          </Button>

          {!isAuthorizedAdmin && (
            <div className="text-sm text-muted-foreground text-center space-y-2">
              <p className="font-medium">Authorized Admins:</p>
              <ul className="text-xs space-y-1">
                {AUTHORIZED_ADMINS.map(email => (
                  <li key={email}>{email}</li>
                ))}
              </ul>
            </div>
          )}

          {result?.success && (
            <p className="text-sm text-muted-foreground text-center">
              Redirecting to dashboard...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}