import React from "react";
import { Toaster } from "sonner";
import { auth } from "@/lib/auth";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { EdgeStoreProvider } from '@/lib/edgestore';
import { GeneralContextProvider } from "@/context/GeneralContextProvider";
import { ReduxProvider } from "@/stores/ReduxProvider";
import { ShopifyProvider } from '@/providers/ShopifyProvider';
import { JoyrideProvider } from '@/context/JoyrideContextProvider';
import SessionProvider from '@/providers/SessionProvider';
import { NextUIProvider } from "@nextui-org/react";
import localFont from "next/font/local";
import Head from "next/head";
import Script from "next/script";
import "./globals.css";

const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "OptiWrite",
  description: "The connected workspace where better, faster work happens.",
  icons: {
    icon: [
      { url: "/global/app_logos/favicon.ico", media: "(prefers-color-scheme: light)" },
      { url: "/global/app_logos/favicon.ico", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/global/app_logos/apple-icon.jpg",
    shortcut: "/global/app_logos/icon.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://your-domain.com/" />
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content="https://your-domain.com/og-image.jpg" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://your-domain.com/" />
        <meta property="twitter:title" content={metadata.title} />
        <meta property="twitter:description" content={metadata.description} />
        <meta property="twitter:image" content="https://your-domain.com/twitter-image.jpg" />
        <link rel="icon" href={metadata.icons.icon[0].url} />
        <link rel="apple-touch-icon" href={metadata.icons.apple} />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="canonical" href="https://your-domain.com/" />
      </Head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <React.StrictMode>
          <GeneralContextProvider>
            <ShopifyProvider>
              <ReduxProvider>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
                  disableTransitionOnChange
                  storageKey="telamonix-theme-2"
                >
                  <Toaster position="bottom-center" />
                    <JoyrideProvider>
                      {children}
                    </JoyrideProvider>
                </ThemeProvider>
              </ReduxProvider>
            </ShopifyProvider>
          </GeneralContextProvider>
        </React.StrictMode>
      </body>
    </html>
  );
}
