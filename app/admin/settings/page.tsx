"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { MUNICIPAL_SERVICES } from "@/lib/demo/services";
import type { MunicipalService } from "@/lib/types";
import {
  Settings,
  Server,
  Bot,
  RotateCcw,
  Check,
  Shield,
  Sliders,
  Mail,
  Building2,
  Loader2,
} from "lucide-react";

export default function AdminSettingsPage() {
  const { t, language } = useI18n();
  const { resetDemoData } = useDemo();

  const [services, setServices] = useState<MunicipalService[]>(MUNICIPAL_SERVICES);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const [minConfidence, setMinConfidence] = useState(85);
  const [duplicateRadius, setDuplicateRadius] = useState(80);
  const [agingBoost, setAgingBoost] = useState(10);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadServices() {
      setIsLoadingServices(true);
      try {
        const res = await fetch("/api/services");
        if (res.ok) {
          const data = await res.json();
          if (data.services && Array.isArray(data.services) && isMounted) {
            setServices(data.services);
          }
        }
      } catch (err: any) {
        console.warn("[AdminSettings] Error loading services:", err.message);
      } finally {
        if (isMounted) setIsLoadingServices(false);
      }
    }
    loadServices();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          {t("admin.settingsTitle")}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Configuration des règles opérationnelles, routage municipal et calibration du modèle IA
        </p>
      </div>

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300">
          <Check className="w-4 h-4" />
          <span>Paramètres sauvegardés avec succès.</span>
        </div>
      )}

      {/* Service Routing Matrix */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="border-b border-slate-100 pb-3 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-brand-teal-600" />
              <span>{t("admin.routingMatrixTitle")}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Affectation automatique des courriels officiels selon la classification
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {isLoadingServices ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-brand-teal-600 mb-2" />
              <p className="text-xs font-medium">Chargement des services municipaux...</p>
            </div>
          ) : (
            services.map((srv) => (
            <div
              key={srv.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40 text-xs"
            >
              <div className="space-y-1">
                <span className="font-mono text-[10px] font-bold text-slate-400">
                  {srv.code}
                </span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {language === "ar" ? srv.name.ar : srv.name.fr}
                </p>
                <p className="text-slate-500">{srv.department} • Responsable : {srv.headOfService}</p>
              </div>

              <div className="flex flex-col sm:items-end text-slate-600 dark:text-slate-300 space-y-1">
                <div className="flex items-center gap-1 font-mono text-[11px] bg-white px-2 py-1 rounded border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                  <Mail className="w-3.5 h-3.5 text-brand-teal-600" />
                  <span>{srv.contactEmail}</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Délai SLA moyen : {srv.averageResponseTimeDays} jours
                </span>
              </div>
            </div>
          )))}
        </div>
      </div>

      {/* AI Triage Parameters */}
      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="border-b border-slate-100 pb-3 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600" />
              <span>{t("admin.aiThresholdsTitle")}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pondération et critères de déclenchement des alertes pour les agents municipaux
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t("admin.aiMinConfidence")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={50}
                max={99}
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 font-mono font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="text-xs font-bold text-slate-500">%</span>
            </div>
            <p className="text-[11px] text-slate-400">
              En dessous de ce seuil, le dossier est marqué en &quot;Revue Prioritaire Manuelle&quot;.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t("admin.duplicateDistanceRadius")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={20}
                max={500}
                value={duplicateRadius}
                onChange={(e) => setDuplicateRadius(Number(e.target.value))}
                className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 font-mono font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="text-xs font-bold text-slate-500">mètres</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Périmètre de regroupement automatique des photos d&apos;un même nid-de-poule ou d&apos;une panne.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t("admin.agingPriorityBoost")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={30}
                value={agingBoost}
                onChange={(e) => setAgingBoost(Number(e.target.value))}
                className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 font-mono font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="text-xs font-bold text-slate-500">pts / 24h</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Pénalité positive sur le score de priorité pour éviter l&apos;oubli des dossiers anciens.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-navy-900 hover:bg-brand-teal-600 text-white px-5 py-2.5 text-xs font-bold shadow-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Mettre à jour les seuils IA</span>
          </button>
        </div>
      </form>

      {/* Reset Demo Environment Card */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 shadow-xs dark:border-rose-900/50 dark:bg-rose-950/20 space-y-3">
        <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-rose-600" />
          <span>Réinitialisation de la Démonstration (Phase 1)</span>
        </h3>
        <p className="text-xs text-rose-800 dark:text-rose-300">
          Remet tous les signalements de test, validations d&apos;agents et courriels simulés à leur état initial pour une nouvelle séance de test.
        </p>
        <button
          type="button"
          onClick={() => {
            if (confirm("Réinitialiser les données de test à leur état initial ?")) {
              resetDemoData();
              window.location.reload();
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold shadow-2xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Réinitialiser les dossiers de démo</span>
        </button>
      </div>
    </div>
  );
}
