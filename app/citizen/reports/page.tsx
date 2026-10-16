"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { formatDate } from "@/lib/utils";
import type { IssueCategory, ReportStatus } from "@/lib/types";
import { Search, Filter, MapPin, Calendar, PlusCircle, ArrowRight } from "lucide-react";

export default function CitizenReportsHistoryPage() {
  const { t, language } = useI18n();
  const { reports, activeUser } = useDemo();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const filtered = reports.filter((report) => {
    // Search query match
    const titleMatch =
      report.title.fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.title.ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.location.streetAddress.toLowerCase().includes(searchQuery.toLowerCase());

    const categoryMatch = selectedCategory === "all" || report.category === selectedCategory;
    const statusMatch = selectedStatus === "all" || report.status === selectedStatus;

    return titleMatch && categoryMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {t("nav.myReports")}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Historique complet et progression des interventions sur Tunis
          </p>
        </div>

        <Link
          href="/citizen/reports/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-teal-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-brand-teal-700 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t("citizen.submitReportCta")}</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("common.search")}
            className="w-full rounded-lg border border-slate-300 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-brand-teal-500 focus:outline-none focus:ring-1 focus:ring-brand-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-brand-teal-500 focus:outline-none focus:ring-1 focus:ring-brand-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">{t("municipal.filterByCategory")}</option>
            <option value="pothole">{t("categories.pothole")}</option>
            <option value="lighting">{t("categories.lighting")}</option>
            <option value="flooding">{t("categories.flooding")}</option>
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-brand-teal-500 focus:outline-none focus:ring-1 focus:ring-brand-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">{t("municipal.filterByStatus")}</option>
            <option value="received">{t("statuses.received")}</option>
            <option value="ai_analyzed">{t("statuses.ai_analyzed")}</option>
            <option value="human_validated">{t("statuses.human_validated")}</option>
            <option value="forwarded">{t("statuses.forwarded")}</option>
            <option value="in_progress">{t("statuses.in_progress")}</option>
            <option value="resolved">{t("statuses.resolved")}</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <EmptyState
            title="Aucun signalement correspondant"
            description="Essayez de modifier vos filtres ou effectuez une nouvelle recherche."
            actionText={t("common.reset")}
            onAction={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedStatus("all");
            }}
          />
        ) : (
          filtered.map((report) => (
            <div
              key={report.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-brand-teal-300 dark:border-slate-800 dark:bg-slate-900 transition-all"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {report.referenceNumber}
                  </span>
                  <CategoryBadge category={report.category} />
                  <StatusBadge status={report.status} size="sm" />
                </div>

                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === "ar" ? report.title.ar : report.title.fr}
                </h2>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 max-w-3xl">
                  {language === "ar" ? report.description.ar : report.description.fr}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{report.location.district} — {report.location.streetAddress}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(report.createdAt, language)}</span>
                  </span>
                </div>
              </div>

              <Link
                href={`/citizen/reports/${report.id}`}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-brand-teal-50 hover:text-brand-teal-800 dark:bg-slate-800 dark:hover:bg-brand-teal-950 dark:hover:text-brand-teal-300 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors shrink-0"
              >
                <span>{t("common.details")}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
