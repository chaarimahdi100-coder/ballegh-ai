"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { ReportStatus } from "@/lib/types";
import { CheckCircle2, Clock, Bot, UserCheck, Send, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: ReportStatus;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const { t } = useI18n();

  const configs: Record<
    ReportStatus,
    { labelKey: string; icon: React.ElementType; bg: string; text: string; border: string }
  > = {
    received: {
      labelKey: "statuses.received",
      icon: Clock,
      bg: "bg-slate-100 dark:bg-slate-800",
      text: "text-slate-700 dark:text-slate-300",
      border: "border-slate-200 dark:border-slate-700",
    },
    ai_analyzed: {
      labelKey: "statuses.ai_analyzed",
      icon: Bot,
      bg: "bg-indigo-50 dark:bg-indigo-950/60",
      text: "text-indigo-700 dark:text-indigo-300",
      border: "border-indigo-200 dark:border-indigo-800",
    },
    human_validated: {
      labelKey: "statuses.human_validated",
      icon: UserCheck,
      bg: "bg-teal-50 dark:bg-teal-950/60",
      text: "text-teal-700 dark:text-teal-300",
      border: "border-teal-200 dark:border-teal-800",
    },
    forwarded: {
      labelKey: "statuses.forwarded",
      icon: Send,
      bg: "bg-blue-50 dark:bg-blue-950/60",
      text: "text-blue-700 dark:text-blue-300",
      border: "border-blue-200 dark:border-blue-800",
    },
    in_progress: {
      labelKey: "statuses.in_progress",
      icon: AlertCircle,
      bg: "bg-amber-50 dark:bg-amber-950/60",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-800",
    },
    resolved: {
      labelKey: "statuses.resolved",
      icon: CheckCircle2,
      bg: "bg-emerald-50 dark:bg-emerald-950/60",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-800",
    },
    rejected: {
      labelKey: "statuses.rejected",
      icon: XCircle,
      bg: "bg-rose-50 dark:bg-rose-950/60",
      text: "text-rose-700 dark:text-rose-300",
      border: "border-rose-200 dark:border-rose-800",
    },
  };

  const config = configs[status] || configs.received;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors",
        config.bg,
        config.text,
        config.border,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs sm:text-sm",
        className
      )}
    >
      <Icon className={cn(size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")} />
      <span>{t(config.labelKey)}</span>
    </span>
  );
}
