"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { Header } from "@/components/common/Header";
import {
  User,
  Building2,
  Shield,
  ArrowRight,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  Lightbulb,
  CloudRain,
  CircleDot,
  MapPin,
  Clock,
  Eye,
  FileCheck,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const { t, language } = useI18n();
  const { activeUser } = useDemo();

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <Header roleMode="public" />

      {/* Hero & 3-Portal Selection Section */}
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
            {language === "ar"
              ? "بلّغ AI — بوابة العمل المدني والبلدي الذكي"
              : "Ballegh AI — Plateforme Civique et Municipale"}
          </h1>

          <p className="mt-5 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            {language === "ar"
              ? "منظومة موحدة بثلاثة فضاءات مستقلة ومحمية، تُمكّن المواطن من التبليغ، والأعوان من المعالجة، والإدارة من المتابعة والإشراف."
              : "Une plateforme unifiée structurée en 3 espaces distincts et sécurisés pour les citoyens, les équipes municipales et l'administration."}
          </p>

          {/* 3 Separate Portal Cards */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 text-start max-w-6xl mx-auto">
            {/* Card 1: Espace Citoyen */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-brand-teal-500/30 bg-gradient-to-b from-brand-navy-900/90 to-brand-navy-950/90 p-6 sm:p-8 shadow-xl backdrop-blur hover:border-brand-teal-400 transition-all hover:-translate-y-1 group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-brand-teal-500/20 text-brand-teal-300 flex items-center justify-center border border-brand-teal-500/40 group-hover:scale-110 transition-transform">
                    <User className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-teal-950/80 text-brand-teal-300 border border-brand-teal-500/30">
                    {language === "ar" ? "فضاء المواطن" : "Espace Citoyen"}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-white group-hover:text-brand-teal-300 transition-colors">
                    {language === "ar" ? "فضاء المواطن" : "Espace Citoyen"}
                  </h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {language === "ar"
                      ? "إنشاء ومتابعة البلاغات البلدية في تونس (حفر، إنارة، مياه) مع التشخيص الآلي بالذكاء الاصطناعي."
                      : "Créer et suivre les signalements d'incidents urbains (chaussée, éclairage, eaux) avec géolocalisation et diagnostic IA."}
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal-400 shrink-0" />
                    <span>{language === "ar" ? "التبليغ المصور مع تحديد الموقع" : "Signalement photo géolocalisé"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal-400 shrink-0" />
                    <span>{language === "ar" ? "متابعة شفافة لحالة المعالجة" : "Suivi en direct de l'intervention"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal-400 shrink-0" />
                    <span>{language === "ar" ? "تأكيد المواطن لإنهاء الأشغال" : "Confirmation citoyenne de résolution"}</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 space-y-3">
                <Link
                  href="/login?portal=citizen"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-teal-500 px-5 py-3 text-sm font-bold text-brand-navy-950 shadow-lg shadow-brand-teal-500/20 hover:bg-brand-teal-400 transition-all cursor-pointer"
                >
                  <span>{language === "ar" ? "الدخول إلى فضاء المواطن" : "Accéder à l'espace citoyen"}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>

                <div className="text-center">
                  <Link
                    href="/register"
                    className="text-[11px] font-semibold text-brand-teal-400 hover:text-brand-teal-300 transition-colors"
                  >
                    {language === "ar" ? "مواطن جديد؟ فتح حساب مجاني" : "Nouveau citoyen ? Créer un compte"}
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 2: Espace Municipal */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-blue-500/30 bg-gradient-to-b from-brand-navy-900/90 to-brand-navy-950/90 p-6 sm:p-8 shadow-xl backdrop-blur hover:border-blue-400 transition-all hover:-translate-y-1 group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-500/40 group-hover:scale-110 transition-transform">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-950/80 text-blue-300 border border-blue-500/30">
                    {language === "ar" ? "الفضاء البلدي" : "Espace Municipal"}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-white group-hover:text-blue-300 transition-colors">
                    {language === "ar" ? "الفضاء البلدي" : "Espace Municipal"}
                  </h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {language === "ar"
                      ? "إدارة ومعالجة البلاغات البلدية. الفرز الذكي، المصادقة البشرية الإلزامية وتوجيه الفرق الفنية."
                      : "Gérer et traiter les signalements municipaux. Contrôle humain systématique des analyses IA et suivi des interventions."}
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{language === "ar" ? "قائمة البلاغات مرتبة حسب الأولوية" : "File de tri et priorisation par sévérité"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{language === "ar" ? "خريطة جغرافية تفاعلية للتدخلات" : "Carte interactive des incidents urbains"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{language === "ar" ? "المصادقة والمراسلة الرسمية للمصالح" : "Validation humaine et transmission"}</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 space-y-3">
                <Link
                  href="/login?portal=municipal"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all cursor-pointer"
                >
                  <span>{language === "ar" ? "الدخول إلى الفضاء البلدي" : "Accéder à l'espace municipal"}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>

                <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>{language === "ar" ? "مخصص لأعوان وإطارات بلدية تونس" : "Habilité • Commune de Tunis"}</span>
                </p>
              </div>
            </div>

            {/* Card 3: Espace Administration */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-purple-500/30 bg-gradient-to-b from-brand-navy-900/90 to-brand-navy-950/90 p-6 sm:p-8 shadow-xl backdrop-blur hover:border-purple-400 transition-all hover:-translate-y-1 group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/40 group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/30">
                    {language === "ar" ? "فضاء الإدارة" : "Espace Administration"}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-white group-hover:text-purple-300 transition-colors">
                    {language === "ar" ? "فضاء الإدارة" : "Espace Administration"}
                  </h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {language === "ar"
                      ? "إدارة المنظومة الشاملة، تهيئة حسابات الأعوان، ضبط إعدادات نماذج الذكاء الاصطناعي والإحصائيات."
                      : "Administration et gestion globale de la plateforme, gestion des comptes utilisateurs, cartographie et statistiques."}
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>{language === "ar" ? "إدارة المستخدمين والأذونات (RBAC)" : "Gestion sécurisée des utilisateurs & rôles"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>{language === "ar" ? "ضبط معايير وخوارزميات الذكاء الاصطناعي" : "Paramétrage des seuils d'analyse IA"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>{language === "ar" ? "مؤشرات الأداء والتقارير البلدية" : "Indicateurs de performance communale"}</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 space-y-3">
                <Link
                  href="/login?portal=admin"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-700/20 hover:bg-purple-600 transition-all cursor-pointer"
                >
                  <span>{language === "ar" ? "الدخول إلى فضاء الإدارة" : "Accéder à l'administration"}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>

                <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>{language === "ar" ? "ولوج مشفر وخاص بالإدارة المركزية" : "Accès sécurisé haute autorité"}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-slate-800 pt-8 text-start">
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
              <p className="text-xs text-slate-400 mt-1">
                {language === "ar" ? "أصناف بنية تحتية مستهدفة" : "Urgences d'infrastructure ciblées"}
              </p>
            </div>
            <div className="p-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-brand-teal-400">Tunis</span>
              <p className="text-xs text-slate-400 mt-1">
                {language === "ar" ? "بلدية تونس — نطاق العمل النموذجي" : "Périmètre pilote — Ville de Tunis"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Categories Section */}
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
            {/* Pothole */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 dark:bg-amber-950/50 dark:text-amber-400">
                <CircleDot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("landing.catPotholeTitle")}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t("landing.catPotholeDesc")}
              </p>
            </div>

            {/* Lighting */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900">
              <div className="w-12 h-12 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center mb-4 dark:bg-yellow-950/50 dark:text-yellow-400">
                <Lightbulb className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("landing.catLightingTitle")}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t("landing.catLightingDesc")}
              </p>
            </div>

            {/* Flooding */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 dark:bg-blue-950/50 dark:text-blue-400">
                <CloudRain className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("landing.catFloodingTitle")}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t("landing.catFloodingDesc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI + Human Workflow Section */}
      <section id="workflow" className="py-16 sm:py-24 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              {t("landing.workflowTitle")}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {t("landing.workflowSubtitle")}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="text-brand-teal-600 font-extrabold text-xs mb-2 uppercase tracking-wider">
                Étape 1
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-1.5">{t("landing.step1Title")}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">{t("landing.step1Desc")}</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="text-blue-600 font-extrabold text-xs mb-2 uppercase tracking-wider">
                Étape 2
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-1.5">{t("landing.step2Title")}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">{t("landing.step2Desc")}</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="text-emerald-600 font-extrabold text-xs mb-2 uppercase tracking-wider">
                Étape 3
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-1.5">{t("landing.step3Title")}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">{t("landing.step3Desc")}</p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="text-purple-600 font-extrabold text-xs mb-2 uppercase tracking-wider">
                Étape 4
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-1.5">{t("landing.step4Title")}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">{t("landing.step4Desc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-12 dark:border-slate-800 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>© 2026 Ballegh AI. Commune de Tunis — Civic-Tech & IA Responsable.</p>
          <div className="flex items-center gap-4">
            <Link href="/login?portal=citizen" className="hover:text-slate-900 dark:hover:text-white">
              Espace Citoyen
            </Link>
            <Link href="/login?portal=municipal" className="hover:text-slate-900 dark:hover:text-white">
              Espace Municipal
            </Link>
            <Link href="/login?portal=admin" className="hover:text-slate-900 dark:hover:text-white">
              Espace Administration
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
