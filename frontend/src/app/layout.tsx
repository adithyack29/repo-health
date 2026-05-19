import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Repo Health Intelligence",
  description: "Track how software systems evolve.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.className} min-h-screen bg-background text-foreground selection:bg-indigo-500/10 selection:text-indigo-900`}>
        {children}
      </body>
    </html>
  );
}
