import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AnalyticsLoader } from "@/components/analytics-loader";
import { BugReportButton } from "@/components/bug-report-button";

// Prefer default dynamic behavior; remove force-dynamic for better caching where applicable

export const metadata: Metadata = {
  title: 'SCORE - Professional Trial Management System',
  description: 'Professional trial management and scoring system powered by K9 CREST technology.',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
    shortcut: '/icon.png',
  },
  manifest: '/manifest.json',
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
        <BugReportButton />
      </body>
    </html>
  );
}
