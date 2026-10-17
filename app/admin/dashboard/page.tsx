"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { KPICard } from "@/components/common/KPICard";
import { DEMO_USERS } from "@/lib/demo/users";
import { MUNICIPAL_SERVICES } from "@/lib/demo/services";
import type { User } from "@/lib/types";
import {
  Users,
  Shield,
  Building2,
  Settings,
  Bot,
  Activity,
  ArrowRight,
  CheckCircle2,
  Server,
  Layers,
  Loader2,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const { reports } = useDemo();

  const [users, setUsers] = useState<User[]>(DEMO_USERS);
  const [servicesCount, setServicesCount] = useState<number>(MUNICIPAL_SERVICES.length);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [usersRes, servicesRes] = await Promise.allSettled([
          fetch("/api/users"),
          fetch("/api/services"),
        ]);

        if (usersRes.status === "fulfilled" && usersRes.value.ok) {
          const uData = await usersRes.value.json();
          if (uData.users && Array.isArray(uData.users) && isMounted) {
            setUsers(uData.users);
          }
        }

        if (servicesRes.status === "fulfilled" && servicesRes.value.ok) {
          const sData = await servicesRes.value.json();
          if (sData.services && Array.isArray(sData.services) && isMounted) {
            setServicesCount(sData.services.length);
          }
        }
      } catch (err: any) {
        console.warn("[AdminDashboard] Error loading live metrics:", err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalUsers = users.length;
  const citizensCount = users.filter((u) => u.role === "citizen").length;
  const agentsCount = users.filter((u) => u.role === "municipal_agent").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
              <Shield className="w-3.5 h-3.5" />
              <span>{t("nav.adminPortal")}</span>
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Supervision Système</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {t("admin.dashboardTitle")}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t("admin.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-colors"
          >
            <Settings className="w-4 h-4 text-brand-teal-600" />
            <span>Paramètres de routage</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={t("admin.kpiTotalUsers")}
          value={totalUsers}
          subtitle="Comptes enregistrés"
          icon={Users}
          colorScheme="navy"
        />
        <KPICard
          title={t("admin.kpiCitizens")}
          value={citizensCount}
          subtitle="Citoyens enregistrés"
          icon={CheckCircle2}
          colorScheme="teal"
        />
        <KPICard
          title={t("admin.kpiAgents")}
          value={agentsCount}
          subtitle="Régulateurs municipaux"
          icon={Building2}
          colorScheme="amber"
        />
        <KPICard
          title={t("admin.kpiRoutingServices")}
          value={servicesCount}
          subtitle="Directions techniques connectées"
          icon={Server}
          colorScheme="emerald"
        />
      </div>

      {/* System Status & Rules Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Scope Card (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-teal-600" />
              <span>Contraintes d'or & Périmètre actif (Phase 1)</span>
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Conforme au Brief
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-800/40 dark:border-slate-700">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
                01 • Un Module Unique
              </span>
              <p className="mt-1 font-bold text-slate-900 dark:text-white text-sm">
                Infrastructure Urbaine
              </p>
              <p className="text-slate-500 mt-0.5">
                Voirie, éclairage et assainissement (pas de super-app généraliste).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-800/40 dark:border-slate-700">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
                02 • Un Lieu Unique
              </span>
              <p className="mt-1 font-bold text-slate-900 dark:text-white text-sm">
                Ville de Tunis
              </p>
              <p className="text-slate-500 mt-0.5">
                Quartiers cibles : Bab Souika, Bab El Khadhra, Centre-Ville, Montplaisir.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-800/40 dark:border-slate-700">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
                03 • Une Solution Ciblée
              </span>
              <p className="mt-1 font-bold text-slate-900 dark:text-white text-sm">
                Triage IA + Validation Humaine
              </p>
              <p className="text-slate-500 mt-0.5">
                Classification, gravité 1-3, doublons, priorité, projet de courriel.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-800/40 dark:border-slate-700">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
                04 • Utilisateur Principal
              </span>
              <p className="mt-1 font-bold text-slate-900 dark:text-white text-sm">
                Agent / Responsable Municipal
              </p>
              <p className="text-slate-500 mt-0.5">
                Point de contrôle obligatoire avant toute action opérationnelle.
              </p>
            </div>
          </div>
        </div>

        {/* AI Health & Model Params (1 col) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-4 h-4 text-indigo-600" />
            <span>Moteur d'Inférence IA</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-600 dark:text-slate-300">Modèle de vision :</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">Gemini 2.5 Vision</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-600 dark:text-slate-300">Seuil confiance :</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">85% minimum</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-600 dark:text-slate-300">Rayon doublons :</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">80 mètres</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-600 dark:text-slate-300">Floutage vie privée :</span>
              <span className="font-bold text-emerald-600">Actif (IA Edge)</span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/admin/users"
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 py-2.5 text-xs font-bold transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Gérer les comptes utilisateurs</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
