"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { IssueCategory } from "@/lib/types";
import { CircleDot, Lightbulb, CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryBadgeProps {
  category: IssueCategory;
  className?: string;
  showIcon?: boolean;
}

export function CategoryBadge({ category, className, showIcon = true }: CategoryBadgeProps) {
  const { t } = useI18n();

  const configs = {
    pothole: {
      label: "categories.pothole",
      icon: CircleDot,
      bg: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900",
    },
    lighting: {
      label: "categories.lighting",
      icon: Lightbulb,
      bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    },
    flooding: {
      label: "categories.flooding",
      icon: CloudRain,
      bg: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900",
    },
  }[category];

  const Icon = configs.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        configs.bg,
        className
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{t(configs.label)}</span>
    </span>
  );
}
