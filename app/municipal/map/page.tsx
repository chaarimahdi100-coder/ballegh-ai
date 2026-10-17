"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { PriorityIndicator } from "@/components/common/PriorityIndicator";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { IssueCategory, Report } from "@/lib/types";
import {
  MapPin,
  Layers,
  CircleDot,
  Lightbulb,
  CloudRain,
  Eye,
  ArrowRight,
  Info,
  Maximize2,
  Navigation,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MunicipalMapPage() {
  const { t, language } = useI18n();
  const { reports, isLoading } = useDemo();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(reports[0] || null);

  useEffect(() => {
    if (!selectedReport && reports.length > 0) {
      setSelectedReport(reports[0]);
    }
  }, [reports, selectedReport]);

  const filtered = reports.filter((r) => {
    return selectedCategory === "all" || r.category === selectedCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {t("municipal.mapViewTitle")}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t("municipal.mapSubtitle")}
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border",
              selectedCategory === "all"
                ? "bg-brand-navy-900 text-white border-brand-navy-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
            )}
          >
            Tous ({reports.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("pothole")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border flex items-center gap-1.5",
              selectedCategory === "pothole"
                ? "bg-orange-600 text-white border-orange-600"
                : "bg-white text-orange-700 border-orange-200 hover:bg-orange-50 dark:bg-slate-900 dark:border-slate-800"
            )}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>Nids-de-poule</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("lighting")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border flex items-center gap-1.5",
              selectedCategory === "lighting"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50 dark:bg-slate-900 dark:border-slate-800"
            )}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Éclairage</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("flooding")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border flex items-center gap-1.5",
              selectedCategory === "flooding"
                ? "bg-cyan-600 text-white border-cyan-600"
                : "bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50 dark:bg-slate-900 dark:border-slate-800"
            )}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>Inondations</span>
          </button>
        </div>
      </div>

      {/* Map Layout: Interactive Cartography Display + Selected Incident Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Canvas (2 cols) */}
        <div className="lg:col-span-2 relative h-[500px] rounded-2xl border border-slate-200 bg-slate-900 overflow-hidden shadow-md flex items-center justify-center">
          {/* Simulated Vector Map Background */}
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#3A506B_1px,transparent_1px)] [background-size:24px_24px]" />

          {/* District Outline Labels */}
          <div className="absolute top-8 left-12 text-slate-500 font-mono text-[11px] select-none tracking-widest uppercase">
            [ Bab Souika ]
          </div>
          <div className="absolute top-28 right-16 text-slate-500 font-mono text-[11px] select-none tracking-widest uppercase">
            [ Montplaisir ]
          </div>
          <div className="absolute bottom-16 left-20 text-slate-500 font-mono text-[11px] select-none tracking-widest uppercase">
            [ Centre-Ville / Barcelone ]
          </div>
          <div className="absolute top-6 right-8 text-slate-500 font-mono text-[11px] select-none tracking-widest uppercase">
            [ El Menzah 1 ]
          </div>

          {/* Map HUD Overlay */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-950/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg text-white text-xs font-mono">
            <Navigation className="w-3.5 h-3.5 text-brand-teal-400" />
            <span>Tunis (36.8065° N, 10.1815° E)</span>
          </div>

          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 bg-slate-950/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300 text-xs">
            <Info className="w-3.5 h-3.5 text-brand-teal-400" />
            <span>Cliquez sur un repère pour afficher le dossier</span>
          </div>

          {/* Pins for each report */}
          {filtered.map((rep, idx) => {
            // Compute deterministic relative layout coordinates for visual map
            const positions = [
              { top: "60%", left: "45%" },
              { top: "35%", left: "30%" },
              { top: "45%", left: "40%" },
              { top: "50%", left: "65%" },
              { top: "20%", left: "80%" },
              { top: "25%", left: "55%" },
            ];

            const pos = positions[idx % positions.length];
            const isSelected = selectedReport?.id === rep.id;

            const pinColor =
              rep.category === "pothole"
                ? "bg-orange-500 ring-orange-400"
                : rep.category === "lighting"
                ? "bg-amber-500 ring-amber-400"
                : "bg-cyan-500 ring-cyan-400";

            return (
              <button
                key={rep.id}
                type="button"
                onClick={() => setSelectedReport(rep)}
                style={{ top: pos.top, left: pos.left }}
                className={cn(
                  "absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-transform focus:outline-none",
                  isSelected ? "scale-125 z-30" : "hover:scale-110"
                )}
              >
                {/* Pin Badge */}
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-white shadow-lg ring-4 transition-all",
                    pinColor,
                    isSelected ? "ring-white" : "ring-slate-900/60"
                  )}
                >
                  {rep.category === "pothole" && <CircleDot className="w-4 h-4" />}
                  {rep.category === "lighting" && <Lightbulb className="w-4 h-4" />}
                  {rep.category === "flooding" && <CloudRain className="w-4 h-4" />}
                </div>

                <div className="mt-1 bg-slate-950/90 text-white font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-700 shadow-sm whitespace-nowrap">
                  {rep.referenceNumber.split("-").pop()} • {rep.aiAnalysis.priorityScore}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Incident Drawer (1 col) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          {selectedReport ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <span className="font-mono text-xs font-bold text-slate-500">
                  {selectedReport.referenceNumber}
                </span>
                <StatusBadge status={selectedReport.status} size="sm" />
              </div>

              <div>
                <CategoryBadge category={selectedReport.category} />
                <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                  {language === "ar" ? selectedReport.title.ar : selectedReport.title.fr}
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                  {language === "ar" ? selectedReport.description.ar : selectedReport.description.fr}
                </p>
              </div>

              {/* Photo Preview */}
              {selectedReport.photos.length > 0 && (
                <div className="rounded-xl overflow-hidden border border-slate-200 h-32 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedReport.photos[0].url}
                    alt="Incident"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Location & Priority */}
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 text-xs space-y-2">
                <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-brand-teal-600 shrink-0 mt-0.5" />
                  <span>
                    {selectedReport.location.district} — {selectedReport.location.streetAddress}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Priorité calculée :</span>
                  <PriorityIndicator
                    score={selectedReport.aiAnalysis.priorityScore}
                    urgency={selectedReport.urgency}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/municipal/reports/${selectedReport.id}`}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-brand-navy-900 hover:bg-brand-teal-600 text-white py-2.5 px-4 text-xs font-bold shadow-sm transition-colors"
                >
                  <span>Ouvrir la fiche d'instruction</span>
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Sélectionnez un point sur la carte pour consulter son dossier.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
