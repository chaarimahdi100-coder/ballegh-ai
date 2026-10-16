"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { KPICard } from "@/components/common/KPICard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { formatDate } from "@/lib/utils";
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  ListOrdered,
  ArrowRight,
  MapPin,
  Calendar,
  AlertCircle,
} from "lucide-react";

export default function CitizenDashboardPage() {
  const { t, language } = useI18n();
  const { reports, activeUser } = useDemo();

  const myReports = reports.filter(
    (r) => r.submittedBy.id === activeUser.id || r.submittedBy.name.includes("Yassine")
  );

  const activeReportsCount = myReports.filter((r) => r.status !== "resolved" && r.status !== "rejected").length;
  const resolvedReportsCount = myReports.filter((r) => r.status === "resolved").length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-navy-900 to-brand-navy-800 p-6 sm:p-8 text-white shadow-md">
        <div>
          <span className="text-xs font-semibold text-brand-teal-400 uppercase tracking-wider">
            {t("citizen.welcome")}
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">
            {activeUser.name}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-xl">
            {t("citizen.subtitle")}
          </p>
        </div>

        <Link
          href="/citizen/reports/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-teal-500 px-5 py-3 text-sm font-bold text-brand-navy-950 shadow-md hover:bg-brand-teal-400 focus:outline-none focus:ring-2 focus:ring-brand-teal-400 transition-all shrink-0"
        >
          <PlusCircle className="h-5 w-5" />
          <span>{t("citizen.submitReportCta")}</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <KPICard
          title={t("citizen.activeReports")}
          value={activeReportsCount}
          subtitle="En cours de traitement municipal"
          icon={Clock}
          colorScheme="amber"
        />
        <KPICard
          title={t("citizen.resolvedReports")}
          value={resolvedReportsCount}
          subtitle="Interventions clôturées avec succès"
          icon={CheckCircle2}
          colorScheme="emerald"
        />
        <KPICard
          title={t("citizen.totalContributions")}
          value={myReports.length}
          subtitle="Signalements enregistrés à Tunis"
          icon={ListOrdered}
          colorScheme="teal"
        />
      </div>

      {/* Recent Reports List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("citizen.recentReportsTitle")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Arrondissement de Tunis • Suivi en temps réel
            </p>
          </div>
          <Link
            href="/citizen/reports"
            className="text-xs font-bold text-brand-teal-600 hover:text-brand-teal-700 dark:text-brand-teal-400 flex items-center gap-1"
          >
            <span>{t("common.viewAll")}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>

        <div className="mt-6 space-y-4">
          {myReports.length === 0 ? (
            <EmptyState
              title={t("citizen.noReportsYet")}
              description="Signalez votre premier nid-de-poule, lampadaire défaillant ou problème d'eau pluviale."
              actionText={t("citizen.submitReportCta")}
              actionHref="/citizen/reports/new"
            />
          ) : (
            myReports.slice(0, 4).map((report) => (
              <div
                key={report.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {report.referenceNumber}
                    </span>
                    <CategoryBadge category={report.category} />
                    <StatusBadge status={report.status} size="sm" />
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-teal-600 dark:group-hover:text-brand-teal-400 transition-colors">
                    {language === "ar" ? report.title.ar : report.title.fr}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
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
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shrink-0 transition-colors"
                >
                  <span>{t("citizen.viewTimeline")}</span>
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
