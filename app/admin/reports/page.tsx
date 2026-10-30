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
  Building2,
  Calendar,
  MapPin,
  Loader2,
  Shield,
  Layers,
} from "lucide-react";

export default function AdminReportsPage() {
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
    else if (selectedPriority === "high")
      prioMatch = r.aiAnalysis.priorityScore >= 70 && r.aiAnalysis.priorityScore < 85;
    else if (selectedPriority === "medium")
      prioMatch = r.aiAnalysis.priorityScore >= 45 && r.aiAnalysis.priorityScore < 70;
    else if (selectedPriority === "low") prioMatch = r.aiAnalysis.priorityScore < 45;

    return searchMatch && catMatch && statMatch && prioMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
              <Shield className="w-3.5 h-3.5" />
              <span>Supervision Globale</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {language === "ar" ? "كافة البلاغات البلدية" : "Supervision de tous les signalements"}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {language === "ar"
              ? "إشراف شامل ومتابعة موحدة لجميع البلاغات الواردة عبر الدوائر البلدية"
              : "Vue consolidée des signalements citoyens sur l'ensemble des arrondissements de Tunis"}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("common.search")}
            className="w-full rounded-xl border border-slate-200 ps-9 pe-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-brand-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-brand-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
          >
            <option value="all">Toutes les catégories</option>
            <option value="pothole">{t("categories.pothole")}</option>
            <option value="lighting">{t("categories.lighting")}</option>
            <option value="flooding">{t("categories.flooding")}</option>
          </select>
        </div>

        <div>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-brand-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
          >
            <option value="all">Toutes les priorités</option>
            <option value="critical">{t("priorities.critical")}</option>
            <option value="high">{t("priorities.high")}</option>
            <option value="medium">{t("priorities.medium")}</option>
            <option value="low">{t("priorities.low")}</option>
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-brand-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
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

      {/* Reports Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-2 text-brand-teal-600" />
          <span className="text-xs">{t("common.loading")}</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={language === "ar" ? "لا توجد بلاغات تطابق البحث" : "Aucun signalement trouvé"}
          description={
            language === "ar"
              ? "جرّب تعديل معايير البحث أو تصفية الفئات"
              : "Essayez de modifier vos critères de recherche ou de filtre."
          }
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold dark:bg-slate-800/60 dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4">Réf & Titre</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Arrondissement</th>
                  <th className="py-3 px-4">Priorité IA</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-slate-400">
                          {report.referenceNumber}
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                          {language === "ar" ? report.title.ar : report.title.fr}
                        </p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <CategoryBadge category={report.category} />
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{report.location.district}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <PriorityIndicator score={report.aiAnalysis?.priorityScore || 50} />
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={report.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/municipal/reports/${report.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-navy-900 hover:text-brand-teal-600 dark:text-white dark:hover:text-brand-teal-400"
                      >
                        <span>{t("common.details")}</span>
                        <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
