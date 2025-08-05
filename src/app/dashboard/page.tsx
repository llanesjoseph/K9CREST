import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                <LayoutGrid className="h-10 w-10 text-primary" />
            </div>
          <CardTitle className="mt-4">Welcome to K9 Trial Pro</CardTitle>
          <CardDescription>
            Your central hub for managing K9 trial events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Select an option from the sidebar to begin. You can manage events, view leaderboards, handle judging, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
