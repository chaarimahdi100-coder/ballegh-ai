"use client";

import React from "react";
import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: React.ElementType;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionText,
  actionHref,
  onAction,
  icon: Icon = FolderOpen,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 sm:p-12 text-center dark:border-slate-800 dark:bg-slate-900/30",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
      {actionText && (
        <div className="mt-6">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center justify-center rounded-lg bg-brand-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal-500 transition-colors"
            >
              {actionText}
            </Link>
          ) : onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center justify-center rounded-lg bg-brand-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal-500 transition-colors"
            >
              {actionText}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
