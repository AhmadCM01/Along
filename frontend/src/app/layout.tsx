import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { AlongTripProvider } from "@/context/AlongTripContext";

export const metadata: Metadata = {
  title: "Along: AI-Orchestrated Shared Corridor Transit for Abuja",
  description:
    "Book shared 4-seat corridor rides in Abuja by voice or text in English, Pidgin, or Hausa. Safe filling-station forecourts, double-entry escrow, and live trip tracking.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('along-theme');
                  var theme = stored || 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <AlongTripProvider>{children}</AlongTripProvider>
      </body>
    </html>
  );
}
