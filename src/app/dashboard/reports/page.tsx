
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function ReportsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Reports</CardTitle>
        <CardDescription>
          Generate and send event summaries and individual report cards.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-lg">
          <Construction className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-semibold">Under Construction</p>
          <p className="text-muted-foreground">
            This feature for generating and sending reports is coming soon.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
