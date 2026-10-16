"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { ReportTimelineEvent } from "@/lib/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/utils";
import { Check, Clock, Bot, UserCheck, Send, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusTimelineProps {
  timeline: ReportTimelineEvent[];
  className?: string;
}

export function StatusTimeline({ timeline, className }: StatusTimelineProps) {
  const { language } = useI18n();

  return (
    <div className={cn("relative pl-6 rtl:pl-0 rtl:pr-6 space-y-6", className)}>
      {/* Vertical Track */}
      <div className="absolute top-2 bottom-2 left-2.5 rtl:left-auto rtl:right-2.5 w-0.5 bg-slate-200 dark:bg-slate-800" />

      {timeline.map((event, idx) => {
        const isLatest = idx === timeline.length - 1;

        return (
          <div key={event.id} className="relative group">
            {/* Step Marker Dot */}
            <div
              className={cn(
                "absolute -left-6 rtl:-left-auto rtl:-right-6 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white transition-all shadow-xs dark:bg-slate-900",
                isLatest
                  ? "border-brand-teal-500 bg-brand-teal-500 text-white"
                  : "border-slate-300 text-slate-400 dark:border-slate-700"
              )}
            >
              {isLatest ? (
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
              )}
            </div>

            {/* Event Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge status={event.status} size="sm" />
                <time className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  {formatDate(event.timestamp, language)}
                </time>
              </div>

              <div className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>{event.author}</span>
                <span className="text-[10px] font-normal text-slate-400 border-l rtl:border-l-0 rtl:border-r border-slate-200 rtl:pl-0 rtl:pr-1.5 pl-1.5 dark:border-slate-700">
                  {event.authorRole === "system_ai"
                    ? "IA Assistante"
                    : event.authorRole === "citizen"
                    ? "Citoyen"
                    : "Agent Municipal"}
                </span>
              </div>

              {event.comment && (
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
                  {language === "ar" ? event.comment.ar : event.comment.fr}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
