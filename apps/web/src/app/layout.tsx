import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flyer Watch",
  description: "Watch Vancouver supermarket flyers for sale items"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
