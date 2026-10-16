"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorScheme?: "teal" | "navy" | "amber" | "emerald" | "coral";
  className?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorScheme = "teal",
  className,
}: KPICardProps) {
  const colorMap = {
    teal: {
      bg: "bg-teal-50 dark:bg-teal-950/30",
      iconBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
      border: "border-teal-100 dark:border-teal-900/50",
    },
    navy: {
      bg: "bg-slate-50 dark:bg-slate-900/40",
      iconBg: "bg-brand-navy-900/10 text-brand-navy-800 dark:text-brand-navy-300",
      border: "border-slate-200 dark:border-slate-800",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      border: "border-amber-100 dark:border-amber-900/50",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-100 dark:border-emerald-900/50",
    },
    coral: {
      bg: "bg-rose-50 dark:bg-rose-950/30",
      iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      border: "border-rose-100 dark:border-rose-900/50",
    },
  }[colorScheme];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-slate-900",
        colorMap.border,
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  "text-xs font-semibold",
                  trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-lg shrink-0", colorMap.iconBg)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
