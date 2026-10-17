"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { PriorityIndicator } from "@/components/common/PriorityIndicator";
import { EmptyState } from "@/components/common/EmptyState";
import { formatDate } from "@/lib/utils";
import {
  Search,
  Filter,
  ArrowRight,
  Bot,
  AlertTriangle,
  Building2,
  Calendar,
  MapPin,
  Loader2,
} from "lucide-react";

export default function MunicipalReportsQueuePage() {
  const { t, language } = useI18n();
  const { reports, isLoading } = useDemo();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const filtered = reports.filter((r) => {
    const searchMatch =
      r.title.fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.title.ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location.streetAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location.district.toLowerCase().includes(searchQuery.toLowerCase());

    const catMatch = selectedCategory === "all" || r.category === selectedCategory;
    const statMatch = selectedStatus === "all" || r.status === selectedStatus;

    let prioMatch = true;
    if (selectedPriority === "critical") prioMatch = r.aiAnalysis.priorityScore >= 85;
    else if (selectedPriority === "high") prioMatch = r.aiAnalysis.priorityScore >= 70 && r.aiAnalysis.priorityScore < 85;
    else if (selectedPriority === "medium") prioMatch = r.aiAnalysis.priorityScore >= 45 && r.aiAnalysis.priorityScore < 70;
    else if (selectedPriority === "low") prioMatch = r.aiAnalysis.priorityScore < 45;

    return searchMatch && catMatch && statMatch && prioMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          {t("nav.reportsQueue")}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          File consolidée des signalements urbains soumis à validation municipale • Commune de Tunis
        </p>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("common.search")}
            className="w-full rounded-lg border border-slate-300 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 text-xs text-slate-900 focus:border-brand-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-brand-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">{t("municipal.filterByCategory")}</option>
            <option value="pothole">{t("categories.pothole")}</option>
            <option value="lighting">{t("categories.lighting")}</option>
            <option value="flooding">{t("categories.flooding")}</option>
          </select>
        </div>

        <div>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-brand-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">{t("municipal.filterByPriority")}</option>
            <option value="critical">{t("priorities.critical")} (&ge; 85)</option>
            <option value="high">{t("priorities.high")} (70-84)</option>
            <option value="medium">{t("priorities.medium")} (45-69)</option>
            <option value="low">{t("priorities.low")} (&lt; 45)</option>
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-brand-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">{t("municipal.filterByStatus")}</option>
            <option value="received">{t("statuses.received")}</option>
            <option value="ai_analyzed">{t("statuses.ai_analyzed")}</option>
            <option value="human_validated">{t("statuses.human_validated")}</option>
            <option value="forwarded">{t("statuses.forwarded")}</option>
            <option value="in_progress">{t("statuses.in_progress")}</option>
            <option value="resolved">{t("statuses.resolved")}</option>
            <option value="rejected">{t("statuses.rejected")}</option>
          </select>
        </div>
      </div>

      {/* Queue Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60">
                <th className="py-3.5 px-4">Référence</th>
                <th className="py-3.5 px-4">Incident</th>
                <th className="py-3.5 px-4">Localisation</th>
                <th className="py-3.5 px-4">Priorité IA</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-right rtl:text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {isLoading && reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-teal-600" />
                      <span>Chargement de la file des signalements...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Aucun dossier trouvé selon ces critères.
                  </td>
                </tr>
              ) : (
                filtered.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                      {report.referenceNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CategoryBadge category={report.category} />
                          {report.aiAnalysis.duplicateDetection.isLikelyDuplicate && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded dark:bg-amber-950 dark:text-amber-300">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Doublon</span>
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white max-w-sm truncate">
                          {language === "ar" ? report.title.ar : report.title.fr}
                        </p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <p className="font-semibold">{report.location.district}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-xs">
                        {report.location.streetAddress}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <PriorityIndicator score={report.aiAnalysis.priorityScore} urgency={report.urgency} />
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={report.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 text-right rtl:text-left">
                      <Link
                        href={`/municipal/reports/${report.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-navy-900 hover:bg-brand-teal-600 px-3 py-1.5 text-xs font-bold text-white transition-colors"
                      >
                        <span>Examiner</span>
                        <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
