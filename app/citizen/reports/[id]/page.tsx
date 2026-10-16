"use client";

import React, { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { StatusTimeline } from "@/components/citizen/StatusTimeline";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Building2,
  User,
  ShieldCheck,
} from "lucide-react";

export default function CitizenReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, language } = useI18n();
  const { getReportById } = useDemo();

  const report = getReportById(id);

  if (!report) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold">Signalement non trouvé</h2>
        <Link href="/citizen/reports" className="mt-4 inline-block text-brand-teal-600 font-semibold">
          Retour aux signalements
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/citizen/reports"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t("common.back")}</span>
        </Link>
      </div>

      {/* Main Dossier Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
              {report.referenceNumber}
            </span>
            <CategoryBadge category={report.category} />
            <StatusBadge status={report.status} />
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(report.createdAt, language)}</span>
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {language === "ar" ? report.title.ar : report.title.fr}
          </h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {language === "ar" ? report.description.ar : report.description.fr}
          </p>
        </div>

        {/* Location & Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
              Emplacement précis
            </span>
            <div className="flex items-start gap-1.5 text-slate-800 dark:text-slate-200 font-semibold">
              <MapPin className="w-4 h-4 text-brand-teal-600 shrink-0 mt-0.5" />
              <span>{report.location.streetAddress}, {report.location.district}</span>
            </div>
            {report.location.landmark && (
              <p className="text-[11px] text-slate-500 pl-5 rtl:pl-0 rtl:pr-5">
                Repère : {report.location.landmark}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
              Collectivité territoriale
            </span>
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-semibold">
              <Building2 className="w-4 h-4 text-brand-navy-600 shrink-0" />
              <span>{report.location.municipality} (Gouvernorat de {report.location.governorate})</span>
            </div>
          </div>
        </div>

        {/* Photo Gallery */}
        {report.photos.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Photo enregistrée avec le signalement
            </h3>
            <div className="relative rounded-xl overflow-hidden border border-slate-200 max-w-md bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={report.photos[0].url}
                alt="Cliché du signalement"
                className="w-full h-56 object-cover"
              />
              {report.photos[0].caption && (
                <div className="p-2 text-[11px] text-slate-500 bg-white border-t border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                  {report.photos[0].caption}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progressive Timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-teal-600" />
          <span>{t("citizen.timelineTitle")}</span>
        </h2>

        <StatusTimeline timeline={report.timeline} />
      </div>
    </div>
  );
}
