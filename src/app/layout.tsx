import type { Metadata } from "next";
import "./globals.css";
import ShopifyLayout from "@/components/ShopifyLayout";

export const metadata: Metadata = {
  title: "Shopify POD Operational Center",
  description: "Dashboard per la gestione ordini, metafield e stampe",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/apple-icon.svg",
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
        <link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
        <link rel="shortcut icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-icon.svg" />
      </head>
      <body className="min-h-full font-sans bg-[#f1f2f4]">
        <ShopifyLayout>{children}</ShopifyLayout>
      </body>
    </html>
  );
}
