import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "ProjectPilot Supplier Portal",
  description: "Supplier Registration and Management Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-HK">
      <body className="antialiased bg-gray-50">
        <Header />
        <main className="pt-24">
          {children}
        </main>
      </body>
    </html>
  );
}
