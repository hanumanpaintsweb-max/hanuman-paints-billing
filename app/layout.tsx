import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hanuman Paints Billing",
  description: "Retail POS Terminal for Hanuman Paints",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.variable} antialiased h-screen overflow-hidden flex bg-surface-bg text-text-main font-inter`}>
        {children}
      </body>
    </html>
  );
}
