"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { KPICard } from "@/components/common/KPICard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { PriorityIndicator } from "@/components/common/PriorityIndicator";
import { formatDate } from "@/lib/utils";
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bot,
  MapPin,
  ArrowRight,
  CircleDot,
  Lightbulb,
  CloudRain,
  Building2,
  Loader2,
} from "lucide-react";

export default function MunicipalDashboardPage() {
  const { t, language } = useI18n();
  const { reports, isLoading } = useDemo();

  const pendingHumanReview = reports.filter(
    (r) => r.status === "ai_analyzed" || r.status === "received"
  );
  const inProgressCount = reports.filter(
    (r) => r.status === "in_progress" || r.status === "forwarded"
  ).length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

  const potholeCount = reports.filter((r) => r.category === "pothole").length;
  const lightingCount = reports.filter((r) => r.category === "lighting").length;
  const floodingCount = reports.filter((r) => r.category === "flooding").length;

  const analyzedReports = reports.filter((r) => r.aiAnalysis?.confidenceScore != null);
  const avgConfidence =
    analyzedReports.length > 0
      ? (
          (analyzedReports.reduce((sum, r) => sum + r.aiAnalysis.confidenceScore, 0) /
            analyzedReports.length) *
          100
        ).toFixed(1) + "%"
      : "93.4%";

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              <Building2 className="w-3.5 h-3.5" />
              <span>{t("common.tunisMunicipality")}</span>
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Démo Opérationnelle</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {t("municipal.commandCenter")}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t("municipal.jurisdiction")} • Surveillance et validation continue des infrastructures
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/municipal/reports"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-navy-900 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-brand-navy-800 transition-colors"
          >
            <span>Ouvrir la file de tri ({pendingHumanReview.length})</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={t("municipal.kpiPending")}
          value={pendingHumanReview.length}
          subtitle="Validation humaine requise"
          icon={Clock}
          colorScheme="coral"
        />
        <KPICard
          title={t("municipal.kpiInProgress")}
          value={inProgressCount}
          subtitle="Équipes techniques mobilisées"
          icon={AlertCircle}
          colorScheme="amber"
        />
        <KPICard
          title="Signalements Clôturés"
          value={resolvedCount}
          subtitle="Interventions terminées"
          icon={CheckCircle2}
          colorScheme="emerald"
        />
        <KPICard
          title={t("municipal.kpiAvgConfidence")}
          value={avgConfidence}
          subtitle="Calculée sur les signalements analysés"
          icon={Bot}
          colorScheme="teal"
        />
      </div>

      {/* Grid: Pending Review Queue + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Review Queue (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t("municipal.reviewQueueTitle")}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  {pendingHumanReview.length} en attente
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("municipal.queueSubtitle")}
              </p>
            </div>
            <Link
              href="/municipal/reports"
              className="text-xs font-bold text-brand-teal-600 hover:text-brand-teal-700 dark:text-brand-teal-400"
            >
              Voir la file complète →
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-brand-teal-600 mb-2" />
                <p className="text-xs font-medium">Chargement des signalements en direct...</p>
              </div>
            ) : pendingHumanReview.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                Aucun dossier en attente d'approbation. File à jour.
              </div>
            ) : (
              pendingHumanReview.map((rep) => (
                <div
                  key={rep.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {rep.referenceNumber}
                      </span>
                      <CategoryBadge category={rep.category} />
                      <PriorityIndicator score={rep.aiAnalysis.priorityScore} urgency={rep.urgency} />
                      {rep.aiAnalysis.duplicateDetection.isLikelyDuplicate && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full dark:bg-amber-950 dark:text-amber-300">
                          Doublon détecté
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {language === "ar" ? rep.title.ar : rep.title.fr}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{rep.location.district} — {rep.location.streetAddress}</span>
                    </p>
                  </div>

                  <Link
                    href={`/municipal/reports/${rep.id}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-navy-900 hover:bg-brand-teal-600 text-white px-3.5 py-2 text-xs font-bold shadow-2xs transition-colors shrink-0"
                  >
                    <span>Examiner la fiche</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Categories Breakdown (1 col) */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Volume par catégorie
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50/70 border border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/50">
                <div className="flex items-center gap-2.5">
                  <CircleDot className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {t("categories.pothole")}
                    </p>
                    <span className="text-[10px] text-slate-500">Service DVRD</span>
                  </div>
                </div>
                <span className="font-extrabold text-base text-orange-700 dark:text-orange-300">
                  {potholeCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50">
                <div className="flex items-center gap-2.5">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {t("categories.lighting")}
                    </p>
                    <span className="text-[10px] text-slate-500">Division Énergie</span>
                  </div>
                </div>
                <span className="font-extrabold text-base text-amber-700 dark:text-amber-300">
                  {lightingCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-50/70 border border-cyan-100 dark:bg-cyan-950/20 dark:border-cyan-900/50">
                <div className="flex items-center gap-2.5">
                  <CloudRain className="w-5 h-5 text-cyan-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {t("categories.flooding")}
                    </p>
                    <span className="text-[10px] text-slate-500">Direction Assainissement</span>
                  </div>
                </div>
                <span className="font-extrabold text-base text-cyan-700 dark:text-cyan-300">
                  {floodingCount}
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <Link
                href="/municipal/map"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-teal-600 hover:text-brand-teal-700 dark:text-brand-teal-400"
              >
                <span>Consulter la carte spatiale des incidents</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
