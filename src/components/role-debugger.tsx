"use client";

import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Eye, EyeOff, Settings, Users, Calendar, ListChecks, ClipboardList, LineChart, Trophy, Gavel } from "lucide-react";

export function RoleDebugger() {
  const { user, role, isAdmin, isTrueAdmin, setViewAsRole, viewAsRole } = useAuth();

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: Settings, roles: ['admin', 'competitor', 'judge'] },
    { href: "/dashboard/events", label: "Events", icon: Calendar, roles: ['admin', 'judge', 'competitor', 'spectator'] },
    { href: "/dashboard/rubrics", label: "Manage Rubrics", icon: ListChecks, roles: ['admin'] },
    { href: "/dashboard/reports", label: "Reports", icon: ClipboardList, roles: ['admin'] },
    { href: "/dashboard/analysis", label: "Analysis", icon: LineChart, roles: ['admin'] },
    { href: "/dashboard/users", label: "Users", icon: Users, roles: ['admin'] },
    { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ['admin', 'judge', 'competitor', 'spectator'] },
  ];

  const eventMenuItems = [
    { href: "/dashboard/events/test-event/schedule", label: "Schedule (Click to Judge)", icon: Calendar, roles: ['admin', 'judge', 'competitor', 'spectator'] },
    { href: "/dashboard/events/test-event/competitors", label: "Competitors", icon: Users, roles: ['admin', 'judge', 'competitor', 'spectator'] },
    { href: "/dashboard/events/test-event/leaderboard", label: "Leaderboard", icon: Trophy, roles: ['admin', 'judge', 'competitor', 'spectator'] },
  ];

  const currentRole = viewAsRole || role;

  const getVisibleMenuItems = (testRole: string) => {
    return menuItems.filter(item => {
      if (['spectator'].includes(testRole) && item.href === '/dashboard') return false;
      return item.roles.includes(testRole);
    });
  };

  const getVisibleEventItems = (testRole: string) => {
    return eventMenuItems.filter(item => item.roles.includes(testRole));
  };

  const testRoles = ['admin', 'judge', 'competitor', 'spectator'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Current User Role Status
          </CardTitle>
          <CardDescription>
            Debug information for role-based access control
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">User Email</label>
              <p className="text-sm text-muted-foreground">{user?.email || 'Not logged in'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">True Role</label>
              <Badge variant={isTrueAdmin ? "default" : "secondary"}>
                {role}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium">View As Role</label>
              <Badge variant={viewAsRole ? "outline" : "secondary"}>
                {viewAsRole || 'None'}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium">Effective Role</label>
              <Badge variant="default">
                {currentRole}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium">Is Admin</label>
              <div className="flex items-center gap-2">
                {isAdmin ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <span className="text-sm">{isAdmin ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Is True Admin</label>
              <div className="flex items-center gap-2">
                {isTrueAdmin ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <span className="text-sm">{isTrueAdmin ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {isTrueAdmin && (
            <div>
              <label className="text-sm font-medium">Role Switching</label>
              <div className="flex gap-2 mt-2">
                <Select value={viewAsRole || ''} onValueChange={(value) => setViewAsRole(value as any || null)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Switch to role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Reset to true role</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="judge">Judge</SelectItem>
                    <SelectItem value="competitor">Competitor</SelectItem>
                    <SelectItem value="spectator">Spectator</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setViewAsRole(null)}
                >
                  Reset
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Current Role Visibility
          </CardTitle>
          <CardDescription>
            What this role can currently see and access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Main Navigation</h4>
              <div className="grid grid-cols-2 gap-2">
                {getVisibleMenuItems(currentRole).map((item) => (
                  <div key={item.href} className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                    <item.icon className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{item.label}</span>
                    <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                  </div>
                ))}
                {menuItems.filter(item => !getVisibleMenuItems(currentRole).includes(item)).map((item) => (
                  <div key={item.href} className="flex items-center gap-2 p-2 bg-red-50 rounded-md">
                    <item.icon className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-red-600">{item.label}</span>
                    <XCircle className="h-4 w-4 text-red-500 ml-auto" />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Event Navigation</h4>
              <div className="grid grid-cols-2 gap-2">
                {getVisibleEventItems(currentRole).map((item) => (
                  <div key={item.href} className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                    <item.icon className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{item.label}</span>
                    <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                  </div>
                ))}
                {eventMenuItems.filter(item => !getVisibleEventItems(currentRole).includes(item)).map((item) => (
                  <div key={item.href} className="flex items-center gap-2 p-2 bg-red-50 rounded-md">
                    <item.icon className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-red-600">{item.label}</span>
                    <XCircle className="h-4 w-4 text-red-500 ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeOff className="h-5 w-5" />
            Role Comparison
          </CardTitle>
          <CardDescription>
            Compare what each role can see and access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testRoles.map((testRole) => (
              <div key={testRole} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={testRole === currentRole ? "default" : "outline"}>
                    {testRole}
                  </Badge>
                  {testRole === currentRole && <span className="text-sm text-muted-foreground">(Current)</span>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium mb-2">Main Navigation</h5>
                    <div className="space-y-1">
                      {getVisibleMenuItems(testRole).map((item) => (
                        <div key={item.href} className="flex items-center gap-2 text-xs">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium mb-2">Event Navigation</h5>
                    <div className="space-y-1">
                      {getVisibleEventItems(testRole).map((item) => (
                        <div key={item.href} className="flex items-center gap-2 text-xs">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
