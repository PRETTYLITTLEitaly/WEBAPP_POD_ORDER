import type { Metadata } from "next";
import "./globals.css";
import ShopifyLayout from "@/components/ShopifyLayout";

export const metadata: Metadata = {
  title: "Shopify POD Operational Center",
  description: "Dashboard per la gestione ordini, metafield e stampe",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "PLI Ops",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/apple-touch-icon.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full antialiased bg-[#f1f2f4] text-gray-900">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
        <link rel="icon" href="/apple-touch-icon.png" type="image/png" sizes="180x180" />
        <link rel="shortcut icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PLI Ops" />
        <meta name="theme-color" content="#ef4444" />
      </head>
      <body className="min-h-full font-sans bg-[#f1f2f4]">
        <ShopifyLayout>{children}</ShopifyLayout>
      </body>
    </html>
  );
}
