import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DroneOps",
  description: "ドローン業務管理アプリ",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DroneOps",
  },
  icons: {
    apple: "/icons/icon-192x192.png",
  },
} as any;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
