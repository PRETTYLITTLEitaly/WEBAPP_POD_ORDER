import type { Metadata } from "next";
import "./globals.css";
import ShopifyLayout from "@/components/ShopifyLayout";

export const metadata: Metadata = {
  title: "Shopify POD Operational Center",
  description: "Dashboard per la gestione ordini, metafield e stampe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full antialiased bg-[#f1f2f4] text-gray-900">
      <body className="min-h-full font-sans bg-[#f1f2f4]">
        <ShopifyLayout>{children}</ShopifyLayout>
      </body>
    </html>
  );
}
