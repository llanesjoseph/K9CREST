"use client";

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BootstrapAdminPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const router = useRouter();

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
            Set admin role for joseph@crucibleanalytics.dev
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p><strong>Current User:</strong> {user.email}</p>
            <p className="mt-2">
              This endpoint will set admin role for joseph@crucibleanalytics.dev only.
            </p>
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
            disabled={loading || user.email !== 'joseph@crucibleanalytics.dev'}
            className="w-full"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? 'Setting Admin Role...' : 'Set Admin Role'}
          </Button>

          {user.email !== 'joseph@crucibleanalytics.dev' && (
            <p className="text-sm text-muted-foreground text-center">
              Only joseph@crucibleanalytics.dev can use this bootstrap function.
            </p>
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