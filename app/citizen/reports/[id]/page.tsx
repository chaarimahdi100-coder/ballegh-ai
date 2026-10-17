"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { StatusTimeline } from "@/components/citizen/StatusTimeline";
import { formatDate } from "@/lib/utils";
import type { Report } from "@/lib/types";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Building2,
  User,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Bot,
} from "lucide-react";

export default function CitizenReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, language } = useI18n();
  const { getReportById, confirmCitizenResolution } = useDemo();

  const [report, setReport] = useState<Report | null>(getReportById(id) || null);
  const [isLoading, setIsLoading] = useState<boolean>(!report);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadReport() {
      try {
        const res = await fetch(`/api/reports/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.report && isMounted) {
            setReport(data.report);
          }
        }
      } catch (err: any) {
        console.warn(`[CitizenReportDetail] Error loading report ${id}:`, err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadReport();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleConfirmResolution = async () => {
    if (!report) return;
    setIsConfirming(true);
    setConfirmError(null);
    try {
      const updated = await confirmCitizenResolution(report.id);
      if (updated) {
        setReport(updated);
      }
    } catch (err: any) {
      setConfirmError(err.message || (language === "ar" ? "تعذر تأكيد الإنجاز" : "Impossible de confirmer la résolution."));
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-8 h-8 text-brand-teal-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">
          {language === "ar" ? "جاري تحميل تفاصيل البلاغ من قاعدة البيانات..." : "Chargement du dossier depuis la base de données..."}
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-16 space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 dark:bg-slate-800">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {language === "ar" ? "البلاغ غير موجود" : "Signalement non trouvé"}
        </h2>
        <p className="text-xs text-slate-500">
          {language === "ar" ? "تعذر العثور على هذا البلاغ في المنظومة." : "Ce dossier n'existe pas ou vous n'avez pas l'autorisation d'y accéder."}
        </p>
        <Link href="/citizen/reports" className="inline-block rounded-xl bg-brand-teal-600 text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-brand-teal-700 transition-colors">
          {t("common.back")}
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

          <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4 rtl:sm:border-l-0 rtl:sm:border-r rtl:sm:pl-0 rtl:sm:pr-4 dark:border-slate-700">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
              Gouvernorat & Commune
            </span>
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-semibold">
              <Building2 className="w-4 h-4 text-brand-teal-600 shrink-0" />
              <span>{report.location.municipality} • {report.location.governorate}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Coordonnées GPS : {report.location.latitude.toFixed(4)}, {report.location.longitude.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Attached Photo Evidence */}
        {report.photos && report.photos.length > 0 && (
          <div className="space-y-2">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
              Photo du constat
            </span>
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-80 bg-slate-950 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={report.photos[0].url}
                alt={report.title.fr}
                className="w-full h-auto max-h-80 object-cover"
              />
              {report.photos[0].caption && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white text-xs">
                  {report.photos[0].caption}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Transparency Badge */}
        {report.aiAnalysis && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-800/40 dark:border-slate-700 flex items-start gap-2.5 text-xs">
            <Bot className="w-4 h-4 text-brand-teal-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Diagnostic préliminaire assisté par IA
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                {language === "ar" ? report.aiAnalysis.severityRationale.ar : report.aiAnalysis.severityRationale.fr}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Citizen Field Confirmation Action Box */}
      {report.status === "resolved" && (
        <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 p-6 shadow-sm dark:bg-emerald-950/20 dark:border-emerald-600 space-y-4">
          {confirmError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{confirmError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-200">
                  {report.resolutionConfirmedByCitizen
                    ? language === "ar"
                      ? "تم تأكيد حل المشكل من طرفكم بنجاح"
                      : "Résolution confirmée par le citoyen"
                    : language === "ar"
                    ? "المصالح البلدية تشير إلى إتمام التدخل الميداني"
                    : "Les équipes municipales indiquent avoir résolu l'incident"}
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {report.resolutionConfirmedByCitizen
                    ? language === "ar"
                      ? "شكراً لمساهمتكم الفعالة في تحسين البنية التحتية لمدينة تونس."
                      : "Merci pour votre civisme et votre contribution active à l'amélioration de la Ville de Tunis."
                    : language === "ar"
                    ? "هل تم إصلاح الخلل فعلياً على أرض الواقع؟ يرجى تأكيد الحل لغلق الملف نهائياً."
                    : "Les travaux ont-ils bien été constatés sur place ? Veuillez confirmer la résolution pour clore définitivement le dossier."}
                </p>
              </div>
            </div>

            {!report.resolutionConfirmedByCitizen && (
              <button
                type="button"
                onClick={handleConfirmResolution}
                disabled={isConfirming}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-colors shrink-0 disabled:opacity-50"
              >
                {isConfirming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {language === "ar" ? "نعم، أؤكد إصلاح المشكل" : "Confirmer la résolution"}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

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
