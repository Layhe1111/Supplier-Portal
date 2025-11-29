import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
