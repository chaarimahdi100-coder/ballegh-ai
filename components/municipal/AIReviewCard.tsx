"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { Report } from "@/lib/types";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { PriorityIndicator } from "@/components/common/PriorityIndicator";
import { Bot, Sparkles, AlertTriangle, ShieldCheck, CopyCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIReviewCardProps {
  report: Report;
  className?: string;
}

export function AIReviewCard({ report, className }: AIReviewCardProps) {
  const { t, language } = useI18n();
  const ai = report.aiAnalysis;

  const confidencePct = Math.round(ai.confidenceScore * 100);

  return (
    <div
      className={cn(
        "rounded-xl border border-indigo-200 bg-gradient-to-b from-indigo-50/50 via-white to-white p-5 shadow-sm dark:border-indigo-900/60 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-indigo-100 pb-3 dark:border-indigo-900/50">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{t("municipal.aiAnalysisCard")}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full dark:bg-indigo-900/50 dark:text-indigo-300">
                <Sparkles className="w-3 h-3" />
                <span>Modèle Heuristique</span>
              </span>
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
              Analyse locale déterministe (Simulation validée • Prêt pour clé GEMINI_API_KEY)
            </span>
          </div>
        </div>

        {/* Confidence Gauge */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span>{t("municipal.aiConfidence")}:</span>
          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
            {confidencePct}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        {/* Category Classification */}
        <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-xs dark:bg-slate-800/80 dark:border-slate-700">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {t("municipal.aiPredictedType")}
          </span>
          <div className="mt-1.5">
            <CategoryBadge category={ai.predictedCategory} />
          </div>
        </div>

        {/* Severity 1 to 3 */}
        <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-xs dark:bg-slate-800/80 dark:border-slate-700">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {t("municipal.aiSeverity")}
          </span>
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="flex gap-1">
              {[1, 2, 3].map((num) => (
                <div
                  key={num}
                  className={cn(
                    "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-black",
                    num <= ai.estimatedSeverity
                      ? ai.estimatedSeverity === 3
                        ? "bg-rose-500 text-white"
                        : ai.estimatedSeverity === 2
                        ? "bg-amber-500 text-white"
                        : "bg-blue-500 text-white"
                      : "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                  )}
                >
                  {num}
                </div>
              ))}
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-1">
              {ai.estimatedSeverity === 3
                ? language === "ar" ? "3 (خطيرة)" : "3 (Critique)"
                : ai.estimatedSeverity === 2
                ? language === "ar" ? "2 (متوسطة)" : "2 (Moyenne)"
                : language === "ar" ? "1 (بسيطة)" : "1 (Faible)"}
            </span>
          </div>
        </div>

        {/* Priority Score */}
        <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-xs dark:bg-slate-800/80 dark:border-slate-700">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {t("municipal.aiPriorityScore")}
          </span>
          <div className="mt-1.5">
            <PriorityIndicator score={ai.priorityScore} urgency={report.urgency} />
          </div>
        </div>
      </div>

      {/* AI Rationale */}
      <div className="mt-4 rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs text-slate-700 dark:bg-slate-800/50 dark:border-slate-700/80 dark:text-slate-300">
        <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
          {language === "ar" ? "موجبات التقدير والتحليل الآلي:" : "Justification de l'analyse automatique :"}
        </span>
        <p className="leading-relaxed">
          {language === "ar" ? ai.severityRationale.ar : ai.severityRationale.fr}
        </p>
      </div>

      {/* Duplicate Detection Notice */}
      <div className="mt-3">
        {ai.duplicateDetection.isLikelyDuplicate ? (
          <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">
                {t("municipal.aiDuplicateWarning")}
              </span>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                {language === "ar"
                  ? ai.duplicateDetection.explanation.ar
                  : ai.duplicateDetection.explanation.fr}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/30 dark:border-slate-800 dark:text-slate-400">
            <CopyCheck className="h-4 w-4 text-teal-600" />
            <span>{t("municipal.aiNoDuplicate")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
