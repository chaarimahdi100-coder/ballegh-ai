"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { Flame, AlertTriangle, ArrowDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriorityIndicatorProps {
  score: number; // 0 to 100
  urgency?: "low" | "medium" | "high" | "critical";
  showScore?: boolean;
  className?: string;
}

export function PriorityIndicator({
  score,
  urgency,
  showScore = true,
  className,
}: PriorityIndicatorProps) {
  const { t } = useI18n();

  // Determine urgency from score if not provided
  const level: "low" | "medium" | "high" | "critical" =
    urgency || (score >= 85 ? "critical" : score >= 70 ? "high" : score >= 45 ? "medium" : "low");

  const config = {
    critical: {
      label: "priorities.critical",
      bg: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900",
      barColor: "bg-red-500",
      icon: Flame,
    },
    high: {
      label: "priorities.high",
      bg: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
      barColor: "bg-amber-500",
      icon: AlertTriangle,
    },
    medium: {
      label: "priorities.medium",
      bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900",
      barColor: "bg-blue-500",
      icon: Activity,
    },
    low: {
      label: "priorities.low",
      bg: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
      barColor: "bg-slate-400",
      icon: ArrowDown,
    },
  }[level];

  const Icon = config.icon;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
          config.bg
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{t(config.label)}</span>
        {showScore && (
          <span className="font-mono font-bold border-l pl-1.5 ml-0.5 border-current/20">
            {score}/100
          </span>
        )}
      </span>
    </div>
  );
}
