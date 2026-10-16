import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "Free, open-source trading journal & analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          <div className="flex min-h-screen flex-col md:flex-row">
            <Suspense fallback={<aside className="md:w-56" />}>
              <Nav />
            </Suspense>
            <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-8 md:px-7 lg:px-10">
              <div className="mx-auto max-w-7xl">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
