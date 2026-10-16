"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "pill" | "minimal";
}

export function LanguageSwitcher({ className, variant = "pill" }: LanguageSwitcherProps) {
  const { language, setLanguage } = useI18n();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900",
        className
      )}
      role="group"
      aria-label="Language Selector"
    >
      <div className="flex items-center px-1.5 text-slate-400">
        <Globe className="h-4 w-4" />
      </div>
      <button
        type="button"
        onClick={() => setLanguage("fr")}
        className={cn(
          "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal-500",
          language === "fr"
            ? "bg-brand-navy-900 text-white shadow-sm"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        )}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLanguage("ar")}
        className={cn(
          "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal-500",
          language === "ar"
            ? "bg-brand-navy-900 text-white shadow-sm font-arabic"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-arabic"
        )}
      >
        العربية
      </button>
    </div>
  );
}
