"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import {
  User,
  Building2,
  Shield,
  Mail,
  Phone,
  MapPin,
  Lock,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileViewProps {
  portalRole: "citizen" | "municipal_agent" | "admin";
  backHref: string;
}

export function ProfileView({ portalRole, backHref }: ProfileViewProps) {
  const { t, language } = useI18n();
  const { activeUser } = useDemo();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout failed:", err);
    }
    localStorage.removeItem("ballegh_active_role");
    window.location.href = "/login";
  };

  const roleTheme =
    portalRole === "citizen"
      ? {
          badgeClass: "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800",
          iconBg: "bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300",
          icon: User,
          label: language === "ar" ? "فضاء المواطن" : "Espace Citoyen",
          desc: language === "ar" ? "حساب مواطن مخول للتبليغ والمتابعة" : "Compte citoyen habilité pour la soumission et le suivi de signalements.",
        }
      : portalRole === "municipal_agent"
      ? {
          badgeClass: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
          iconBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
          icon: Building2,
          label: language === "ar" ? "الفضاء البلدي" : "Espace Municipal",
          desc: language === "ar" ? "عون بلدي معتمد للمصادقة والمتابعة الميدانية" : "Agent municipal habilité pour la revue technique et le suivi des interventions.",
        }
      : {
          badgeClass: "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
          iconBg: "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300",
          icon: Shield,
          label: language === "ar" ? "فضاء الإدارة" : "Espace Administration",
          desc: language === "ar" ? "مدير المنظومة مع صلاحيات كاملة لإدارة المستخدمين" : "Administrateur système avec droits de gestion globale de la plateforme.",
        };

  const RoleIcon = roleTheme.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Back button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>{language === "ar" ? "العودة للوحة القيادة" : "Retour au tableau de bord"}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {t("profile.title")}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t("profile.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 px-4 py-2 text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>{t("nav.logout")}</span>
        </button>
      </div>

      {/* Profile Overview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shrink-0", roleTheme.iconBg)}>
            <RoleIcon className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {activeUser.name}
              </h2>
              <span className={cn("inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold border", roleTheme.badgeClass)}>
                <RoleIcon className="w-3.5 h-3.5" />
                <span>{roleTheme.label}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {activeUser.email}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {roleTheme.desc}
            </p>
          </div>
        </div>

        {/* User Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-700/60">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {t("profile.email")}
            </span>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{activeUser.email}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-700/60">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {t("profile.phone")}
            </span>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{activeUser.phone || "+216 -- --- ---"}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-700/60">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {t("profile.district")}
            </span>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{activeUser.district || "Arrondissement Central, Tunis"}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-700/60">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {t("profile.organization")}
            </span>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>{activeUser.organization || "Commune de Tunis"}</span>
            </div>
          </div>
        </div>

        {/* Security & Authentication Info */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t("profile.sessionActive")}</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
            {language === "ar"
              ? "جلسة العمل مشفرة ومحمية ببروتوكول HS256 وملفات تعريف ارتباط آمنة (HTTP-Only)."
              : "Session sécurisée par jeton signé HS256 et cookie HTTP-Only avec restriction de domaine."}
          </p>
        </div>
      </div>
    </div>
  );
}
