// frontend/app/layout.tsx — REPLACE

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "../components/Navbar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI-Powered IDS · Analyst Dashboard",
  description: "Real-time-like network attack detection with Random Forest, SHAP XAI, and FedAvg federated learning.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f0f4f8] text-slate-900">
        <Navbar />
        <div className="flex-1 relative z-10">{children}</div>
      </body>
    </html>
  );
}
