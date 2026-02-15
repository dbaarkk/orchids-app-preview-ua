import type { Metadata, Viewport } from "next";
import "./globals.css";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
import { AuthProvider } from "@/lib/auth-context";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "sonner";
import { VisualEditsMessenger as VisualEditsMessengerComponent } from "orchids-visual-edits";

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Urban Auto | Premium Car Care in Raipur",
  description: "Raipur's premier modern mechanized car care brand. Professional car cleaning, detailing, and auto services.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Urban Auto",
  },
  formatDetection: {
    telephone: true,
  },
  applicationName: "Urban Auto",
    other: {
      "msapplication-TileColor": "#1e3a8a",
      "msapplication-tap-highlight": "no"
    }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Script
          id="orchids-browser-logs"
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts/orchids-browser-logs.js"
          strategy="afterInteractive"
          data-orchids-project-id="95f0b210-6c16-41b5-8de6-4fad9412ab9c"
        />
        <ErrorReporter />
        <Script
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
          strategy="afterInteractive"
          data-target-origin="*"
          data-message-type="ROUTE_CHANGE"
          data-include-search-params="true"
          data-only-in-iframe="true"
          data-debug="true"
          data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
        />
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
          <AuthProvider>
            {children}
            <BottomNav />
            <Toaster position="top-center" richColors closeButton />
          </AuthProvider>
          <VisualEditsMessengerComponent />
        </body>
    </html>
  );
}