"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nContext";
import { Header } from "@/components/common/Header";
import { Logo } from "@/components/brand/Logo";
import {
  PlusCircle,
  ShieldCheck,
  Bot,
  UserCheck,
  Send,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  CloudRain,
  CircleDot,
  MapPin,
  Clock,
  ArrowRight,
  Eye,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const { t, language } = useI18n();

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <Header roleMode="public" />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-navy-950 via-brand-navy-900 to-brand-navy-950 text-white py-16 sm:py-24">
        {/* Background decorative grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1C254115_1px,transparent_1px),linear-gradient(to_bottom,#1C254115_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-teal-500/30 bg-brand-teal-950/60 px-3.5 py-1.5 text-xs font-semibold text-brand-teal-300 backdrop-blur mb-6 shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-brand-teal-400 animate-pulse" />
            <span>{t("landing.badge")}</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            {t("landing.heroTitle")}
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t("landing.heroSubtitle")}
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/citizen/reports/new"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-teal-500 px-6 py-3.5 text-sm sm:text-base font-bold text-brand-navy-950 shadow-lg shadow-brand-teal-500/20 hover:bg-brand-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal-300 transition-all transform hover:-translate-y-0.5"
            >
              <PlusCircle className="h-5 w-5" />
              <span>{t("landing.ctaReport")}</span>
            </Link>
            <Link
              href="/municipal/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-brand-navy-800/80 px-6 py-3.5 text-sm sm:text-base font-semibold text-white hover:bg-brand-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-all"
            >
              <ShieldCheck className="h-5 w-5 text-brand-teal-400" />
              <span>{t("landing.ctaMunicipal")}</span>
            </Link>
          </div>

          {/* KPI Mini-bar */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-slate-800 pt-8 text-left">
            <div className="p-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">100%</span>
              <p className="text-xs text-slate-400 mt-1">{t("landing.statAccuracy")}</p>
            </div>
            <div className="p-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-brand-teal-400">&lt; 3 min</span>
              <p className="text-xs text-slate-400 mt-1">{t("landing.statTime")}</p>
            </div>
            <div className="p-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">3</span>
              <p className="text-xs text-slate-400 mt-1">Urgences d'infrastructure ciblées</p>
            </div>
            <div className="p-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-brand-teal-400">Tunis</span>
              <p className="text-xs text-slate-400 mt-1">Périmètre d'action pilote</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Infrastructure Categories */}
      <section id="categories" className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              {t("landing.categoriesTitle")}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {t("landing.categoriesSubtitle")}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 1. Potholes */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center dark:bg-orange-950/60 dark:text-orange-400 mb-5">
                  <CircleDot className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t("landing.catPotholeTitle")}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t("landing.catPotholeDesc")}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Service responsable :</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Voirie (DVRD)</span>
              </div>
            </div>

            {/* 2. Public Lighting */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center dark:bg-amber-950/60 dark:text-amber-400 mb-5">
                  <Lightbulb className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t("landing.catLightingTitle")}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t("landing.catLightingDesc")}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Service responsable :</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Éclairage Public</span>
              </div>
            </div>

            {/* 3. Flooding */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center dark:bg-cyan-950/60 dark:text-cyan-400 mb-5">
                  <CloudRain className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t("landing.catFloodingTitle")}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t("landing.catFloodingDesc")}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Service responsable :</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Assainissement</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI + Human Workflow (Golden Rule) */}
      <section id="workflow" className="py-16 sm:py-24 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-teal-600 dark:text-brand-teal-400">
              L'Approche Éthique & E-Business
            </span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              {t("landing.workflowTitle")}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {t("landing.workflowSubtitle")}
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t("landing.step1Title")}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t("landing.step1Desc")}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-brand-navy-600 dark:text-brand-teal-400 font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                <span>Mobile-first & GPS</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-2xl border border-indigo-200 bg-indigo-50/30 p-6 dark:border-indigo-900/50 dark:bg-indigo-950/20">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t("landing.step2Title")}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t("landing.step2Desc")}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-400 font-semibold">
                <Bot className="w-3.5 h-3.5" />
                <span>Tri & Détection doublons</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-2xl border border-teal-300 bg-teal-50/40 p-6 dark:border-teal-900/60 dark:bg-teal-950/30 ring-2 ring-teal-500/20">
              <div className="w-10 h-10 rounded-lg bg-brand-teal-600 text-white flex items-center justify-center font-bold text-sm mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t("landing.step3Title")}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t("landing.step3Desc")}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-brand-teal-700 dark:text-brand-teal-300 font-semibold">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Point de contrôle nommé</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm mb-4">
                4
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t("landing.step4Title")}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t("landing.step4Desc")}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Suivi de bout en bout</span>
              </div>
            </div>
          </div>

          {/* Ethics Pledge Box */}
          <div className="mt-12 rounded-2xl bg-brand-navy-900 text-white p-6 sm:p-8">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-teal-400" />
              <span>{t("landing.ethicsTitle")}</span>
            </h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-teal-400 shrink-0 mt-0.5" />
                <span>{t("landing.ethics1")}</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-teal-400 shrink-0 mt-0.5" />
                <span>{t("landing.ethics2")}</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-teal-400 shrink-0 mt-0.5" />
                <span>{t("landing.ethics3")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-slate-50 py-10 dark:border-slate-800 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo href="/" />
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-right">
            {t("landing.footerRights")}
          </p>
        </div>
      </footer>
    </div>
  );
}
