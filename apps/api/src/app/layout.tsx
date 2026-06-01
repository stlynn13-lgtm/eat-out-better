import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Eat Out Better",
  description: "Smart choices for a healthier heart. Photograph any restaurant menu and get every dish ranked for your heart health in under 30 seconds.",
  keywords: ["high cholesterol", "heart health", "restaurant menu", "healthy eating", "diet"],
  authors: [{ name: "Eat Out Better" }],
  // Open Graph (for sharing links)
  openGraph: {
    title: "Eat Out Better",
    description: "Smart choices for a healthier heart.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents accidental zoom on double-tap
  userScalable: false,
  themeColor: "#1b4332",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}
