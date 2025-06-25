
"use client";

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppThemeProvider } from '@/components/providers/AppThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { FullscreenProvider } from '@/contexts/FullscreenContext';
// Removed useState, useEffect, useRef, cn for footer logic

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Removed showFooter, mounted states and mainElementRef
  // Removed useEffect for footer logic

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <title>N Group Products</title>
        <meta name="description" content="Point of Sale system for milk products." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased h-full" suppressHydrationWarning>
        <AppThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <FullscreenProvider>
              <div className="flex flex-col h-full">
                <main
                  className="flex-grow overflow-y-auto" // Removed pb-16
                >
                  {children}
                </main>
                {/* Footer element removed from here */}
              </div>
              <Toaster />
            </FullscreenProvider>
          </AuthProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
