import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AnalyticsLoader } from "@/components/analytics-loader";

// Prefer default dynamic behavior; remove force-dynamic for better caching where applicable

export const metadata: Metadata = {
  title: 'K9 Trial Scoring System',
  description: 'A comprehensive system for managing and scoring K9 trials.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <AnalyticsLoader />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
