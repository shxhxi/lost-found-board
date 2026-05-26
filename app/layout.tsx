import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Lost But Now Found | East Bay',
  description: 'East Bay lost and found board for Martinez, Concord, Walnut Creek, and nearby cities.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-amber-50 text-zinc-900 antialiased transition-colors duration-300 dark:from-slate-950 dark:via-zinc-900 dark:to-emerald-950 dark:text-zinc-100">
        {children}

        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            duration: 4000,
            style: { fontSize: '14px' },
          }}
        />
      </body>
    </html>
  );
}