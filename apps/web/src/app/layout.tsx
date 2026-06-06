import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Flyer Ping — Vancouver grocery deal alerts",
  description:
    "Watch Loblaws, No Frills, Metro, Sobeys, Walmart, Whole Foods, and Sungiven. Get an email when a net-new watched item appears on sale."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
