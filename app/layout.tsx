import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./admin/analytics.css";
import "./customer-qr.css";
import "./signup.css";

export const metadata: Metadata = {
  title: "Prime IV Rewards",
  description: "Your Prime IV Hydration & Wellness loyalty rewards.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f9fc",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
