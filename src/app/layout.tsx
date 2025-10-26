import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import AuthProvider from "@/lib/auth-provider";
import { FirebaseClientProvider } from "@/firebase";
import { QueryProvider } from "@/providers/query-client-provider";
import { NotificationProvider } from "@/lib/notification-provider";

export const metadata: Metadata = {
  title: "V3 Fitness",
  description: "The ultimate gym management system.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "V3 Fitness",
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="application-name" content="V3 Fitness" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="V3 Fitness" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Space+Grotesk:wght@300..700&display=swap"
          rel="stylesheet"
        />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <QueryProvider>
            <AuthProvider>
              <NotificationProvider>
                {children}
                <Toaster />
              </NotificationProvider>
            </AuthProvider>
          </QueryProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
