import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>
                Manage your account and platform settings.
                </CardDescription>
            </CardHeader>
            <CardContent>
               <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
                    <p className="text-muted-foreground">Settings content will go here.</p>
               </div>
            </CardContent>
        </Card>
    </div>
  );
}
