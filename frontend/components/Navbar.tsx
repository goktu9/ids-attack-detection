// frontend/components/Navbar.tsx — REPLACE

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Activity, Brain, Network } from "lucide-react";

const NAV = [
  { href: "/",               label: "Dashboard",    icon: Activity },
  { href: "/explainability", label: "XAI Explorer", icon: Brain    },
  { href: "/federated",      label: "Federated",    icon: Network  },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#0c4c8f]/10 rounded-lg border border-[#0c4c8f]/20">
            <Shield size={16} className="text-[#0c4c8f]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#0c4c8f] tracking-wide leading-tight">
              Intrusion Detection System
            </p>
            <p className="text-[10px] text-slate-400">
              CIC-IDS2017 · Random Forest · SHAP XAI · FedAvg
            </p>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? "bg-white text-[#0c4c8f] shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-[#0c4c8f]"
                }`}
              >
                <Icon size={13} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right side — Biruni branding */}
        <div className="text-right">
          <p className="text-[11px] font-semibold text-[#0c4c8f]">Biruni University</p>
          <p className="text-[10px] text-slate-400">Computer Engineering · 2025–2026</p>
        </div>
      </div>
    </header>
  );
}
