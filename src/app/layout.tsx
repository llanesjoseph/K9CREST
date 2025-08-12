import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { Inter } from 'next/font/google'

export const metadata: Metadata = {
  title: 'K9 Trial Scoring System',
  description: 'A comprehensive system for managing and scoring K9 trials.',
};

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.className}>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
