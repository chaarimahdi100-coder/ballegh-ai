"use client";

import React, { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { useRouter } from "next/navigation";
import { Info, UserCheck, RotateCcw, ChevronDown } from "lucide-react";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DemoBanner() {
  const { t, language } = useI18n();
  const { activeUser, setActiveRole, resetDemoData } = useDemo();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const roles: { role: UserRole; labelFr: string; labelAr: string; path: string }[] = [
    { role: "citizen", labelFr: "Citoyen (Yassine)", labelAr: "مواطن (ياسين)", path: "/citizen/dashboard" },
    { role: "municipal_agent", labelFr: "Agent Municipal (Ing. Samira)", labelAr: "عون بلدي (م. سميرة)", path: "/municipal/dashboard" },
    { role: "admin", labelFr: "Administrateur (Karim)", labelAr: "مدير المنظومة (كريم)", path: "/admin/dashboard" },
  ];

  const handleSelectRole = async (r: (typeof roles)[0]) => {
    setActiveRole(r.role);
    setIsOpen(false);
    try {
      await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: r.role }),
      });
    } catch {
      // fallback
    }
    router.push(r.path);
    router.refresh();
  };

  return (
    <aside
      aria-label={t("common.demoBanner")}
      className="bg-brand-navy-950 border-b border-brand-teal-900/50 text-white text-xs px-3 py-1.5 relative z-30 shadow-sm"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Banner Notice */}
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px]">
            !
          </span>
          <span className="font-semibold text-brand-teal-300">
            {t("common.demoBanner")}
          </span>
          <span className="hidden md:inline text-slate-400 text-[11px] border-l border-slate-700 pl-2 ml-1">
            {t("common.demoBannerSub")}
          </span>
        </div>

        {/* Quick Role Switcher & Reset */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1.5 bg-brand-navy-800 hover:bg-brand-navy-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-brand-teal-400" />
              <span>
                {language === "ar"
                  ? roles.find((r) => r.role === activeUser.role)?.labelAr
                  : roles.find((r) => r.role === activeUser.role)?.labelFr}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isOpen && (
              <div
                className="absolute right-0 mt-1 w-60 bg-white text-slate-900 rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                role="menu"
              >
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {t("common.switchRole")}
                </div>
                {roles.map((r) => (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => handleSelectRole(r)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                      activeUser.role === r.role && "bg-brand-teal-50 text-brand-teal-900 font-semibold dark:bg-brand-teal-950 dark:text-brand-teal-300"
                    )}
                  >
                    <span>{language === "ar" ? r.labelAr : r.labelFr}</span>
                    {activeUser.role === r.role && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-teal-500"></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (confirm(language === "ar" ? "هل تريد إعادة ضبط بيانات العرض التجريبي؟" : "Réinitialiser toutes les données de démo ?")) {
                resetDemoData();
                window.location.reload();
              }
            }}
            title={t("common.reset")}
            className="flex items-center gap-1 text-slate-400 hover:text-white px-1.5 py-1 rounded hover:bg-slate-800 text-[11px] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">{t("common.reset")}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
