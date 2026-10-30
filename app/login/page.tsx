"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import {
  LogIn,
  User,
  Building2,
  Shield,
  ArrowRight,
  AlertCircle,
  Loader2,
  Lock,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

type PortalType = "citizen" | "municipal" | "admin";

function LoginForm() {
  const { t, language } = useI18n();
  const { setActiveRole } = useDemo();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPortalParam = searchParams.get("portal") as PortalType | null;
  const callbackUrl = searchParams.get("callbackUrl");

  const [selectedPortal, setSelectedPortal] = useState<PortalType>(
    initialPortalParam === "admin"
      ? "admin"
      : initialPortalParam === "municipal"
      ? "municipal"
      : "citizen"
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Access denied state when authenticated user's role does not match requested portal
  const [mismatchState, setMismatchState] = useState<{
    actualRole: UserRole;
    legitimateDashboard: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (initialPortalParam && ["citizen", "municipal", "admin"].includes(initialPortalParam)) {
      setSelectedPortal(initialPortalParam);
    }
  }, [initialPortalParam]);

  const handlePortalSwitch = (portal: PortalType) => {
    setSelectedPortal(portal);
    setErrorMessage(null);
    setMismatchState(null);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("portal", portal);
    router.replace(`/login?${newParams.toString()}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setMismatchState(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(
          data.error ||
            (language === "ar"
              ? "بيانات الدخول غير صحيحة. يرجى التثبت من البريد وكلمة المرور."
              : "Identifiants invalides (e-mail ou mot de passe incorrect).")
        );
        setIsLoading(false);
        return;
      }

      const userRole = data.user.role as UserRole;
      setActiveRole(userRole);

      // Check role authorization against selected portal
      const isRoleAllowed =
        (selectedPortal === "citizen" && userRole === "citizen") ||
        (selectedPortal === "municipal" && (userRole === "municipal_agent" || userRole === "admin")) ||
        (selectedPortal === "admin" && userRole === "admin");

      if (!isRoleAllowed) {
        setIsLoading(false);
        let legitDash = "/citizen/dashboard";
        let mismatchMsg = "";

        if (userRole === "citizen") {
          legitDash = "/citizen/dashboard";
          mismatchMsg =
            language === "ar"
              ? "تم رفض الدخول: هذا الحساب مسجل كحساب مواطن، ولا يملك الصلاحيات الكافية لدخول هذا الفضاء."
              : `Accès refusé : Ce compte est un compte Citoyen. Il ne dispose pas des privilèges requis pour accéder à l'${
                  selectedPortal === "admin" ? "Espace Administration" : "Espace Municipal"
                }.`;
        } else if (userRole === "municipal_agent") {
          legitDash = "/municipal/dashboard";
          mismatchMsg =
            language === "ar"
              ? "تم رفض الدخول: هذا الحساب مسجل كعون بلدي ولا يملك صلاحيات مدير المنظومة."
              : "Accès refusé : Ce compte est un compte Agent Municipal. Droits d'administrateur requis pour ce portail.";
        }

        setMismatchState({
          actualRole: userRole,
          legitimateDashboard: legitDash,
          message: mismatchMsg,
        });
        return;
      }

      // Successful matching redirection
      if (callbackUrl) {
        router.push(callbackUrl);
      } else {
        const dest =
          userRole === "admin"
            ? selectedPortal === "municipal"
              ? "/municipal/dashboard"
              : "/admin/dashboard"
            : userRole === "municipal_agent"
            ? "/municipal/dashboard"
            : "/citizen/dashboard";
        router.push(dest);
      }
      router.refresh();
    } catch {
      setErrorMessage(
        language === "ar"
          ? "تعذر الاتصال بخادم المصادقة. يرجى المحاولة لاحقاً."
          : "Erreur réseau lors de la tentative de connexion."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 sm:px-10 transition-all">
      {/* 3-Portal Pill Selector */}
      <div className="mb-6">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400 mb-2">
          {language === "ar" ? "اختر الفضاء المستهدف :" : "Sélectionnez votre espace :"}
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl dark:bg-slate-800">
          <button
            type="button"
            onClick={() => handlePortalSwitch("citizen")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
              selectedPortal === "citizen"
                ? "bg-white text-brand-teal-700 shadow-xs dark:bg-slate-700 dark:text-brand-teal-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            <User className="w-3.5 h-3.5" />
            <span className="truncate">{language === "ar" ? "المواطن" : "Citoyen"}</span>
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch("municipal")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
              selectedPortal === "municipal"
                ? "bg-white text-blue-700 shadow-xs dark:bg-slate-700 dark:text-blue-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="truncate">{language === "ar" ? "البلدي" : "Municipal"}</span>
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch("admin")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
              selectedPortal === "admin"
                ? "bg-white text-purple-700 shadow-xs dark:bg-slate-700 dark:text-purple-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="truncate">{language === "ar" ? "الإدارة" : "Admin"}</span>
          </button>
        </div>
      </div>

      {/* Portal Active Banner */}
      <div
        className={cn(
          "mb-6 p-4 rounded-xl border flex items-start gap-3 transition-colors",
          selectedPortal === "citizen" &&
            "bg-brand-teal-50/70 border-brand-teal-200 text-brand-teal-950 dark:bg-brand-teal-950/30 dark:border-brand-teal-800 dark:text-brand-teal-200",
          selectedPortal === "municipal" &&
            "bg-blue-50/70 border-blue-200 text-blue-950 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200",
          selectedPortal === "admin" &&
            "bg-purple-50/70 border-purple-200 text-purple-950 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-200"
        )}
      >
        <div
          className={cn(
            "p-2 rounded-lg shrink-0 mt-0.5",
            selectedPortal === "citizen" && "bg-brand-teal-100 text-brand-teal-700 dark:bg-brand-teal-900/60 dark:text-brand-teal-300",
            selectedPortal === "municipal" && "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
            selectedPortal === "admin" && "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
          )}
        >
          {selectedPortal === "citizen" && <User className="w-4 h-4" />}
          {selectedPortal === "municipal" && <Building2 className="w-4 h-4" />}
          {selectedPortal === "admin" && <Shield className="w-4 h-4" />}
        </div>
        <div>
          <h3 className="text-sm font-bold">
            {selectedPortal === "citizen" && (language === "ar" ? "دخول فضاء المواطن" : "Connexion Espace Citoyen")}
            {selectedPortal === "municipal" && (language === "ar" ? "دخول الفضاء البلدي" : "Connexion Espace Municipal")}
            {selectedPortal === "admin" && (language === "ar" ? "دخول فضاء الإدارة" : "Connexion Espace Administration")}
          </h3>
          <p className="text-xs opacity-90 mt-0.5">
            {selectedPortal === "citizen" &&
              (language === "ar"
                ? "سجّل دخولك لإنشاء ومتابعة بلاغاتك البلدية في تونس"
                : "Créez et suivez vos signalements d'incidents urbains en temps réel.")}
            {selectedPortal === "municipal" &&
              (language === "ar"
                ? "فضاء مخصص للأعوان والإطارات الفنية لمتابعة ومعالجة البلاغات"
                : "Réservé aux agents techniques habilités de la Commune de Tunis.")}
            {selectedPortal === "admin" &&
              (language === "ar"
                ? "بوابة مؤمنة لإدارة المنظومة ومستخدمي النظام والإعدادات"
                : "Portail sécurisé d'administration et de supervision système.")}
          </p>
        </div>
      </div>

      {/* Role Mismatch Access-Denied Box */}
      {mismatchState && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-300 p-4 text-xs dark:bg-amber-950/40 dark:border-amber-700">
          <div className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="space-y-2">
              <p className="font-bold">{mismatchState.message}</p>
              <button
                type="button"
                onClick={() => router.push(mismatchState.legitimateDashboard)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs transition-colors cursor-pointer"
              >
                <span>{language === "ar" ? "الانتقال إلى فضائي المخول" : "Accéder à mon espace légitime"}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            {t("auth.email")}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={
              selectedPortal === "citizen"
                ? "citoyen@tunis.tn"
                : selectedPortal === "municipal"
                ? "agent@commune-tunis.gov.tn"
                : "admin@ballegh.tn"
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-brand-teal-500 focus:outline-none focus:ring-1 focus:ring-brand-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            {t("auth.password")}
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-brand-teal-500 focus:outline-none focus:ring-1 focus:ring-brand-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-60 cursor-pointer",
            selectedPortal === "citizen" && "bg-brand-teal-600 hover:bg-brand-teal-700 focus:ring-brand-teal-500",
            selectedPortal === "municipal" && "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
            selectedPortal === "admin" && "bg-purple-700 hover:bg-purple-800 focus:ring-purple-600"
          )}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          <span>{t("auth.signInBtn")}</span>
        </button>
      </form>

      {/* Sub-Actions based on portal */}
      <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 dark:border-slate-800 space-y-3">
        {selectedPortal === "citizen" ? (
          <div className="flex items-center justify-between">
            <span>{t("auth.noAccount")}</span>
            <Link
              href="/register"
              className="font-bold text-brand-teal-600 hover:text-brand-teal-700 dark:text-brand-teal-400"
            >
              {t("auth.signUpBtn")}
            </Link>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 text-center">
            {language === "ar"
              ? "يتم تزويد حسابات الأعوان وإدارة المنظومة حصرياً من قِبل المصالح المركزية لبلدية تونس."
              : "Les comptes municipaux et administrateurs sont provisionnés par la Direction Municipale."}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="w-3 h-3 rtl:rotate-180" />
            <span>{language === "ar" ? "العودة لاختيار الفضاء" : "Retour à la sélection des espaces"}</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { language } = useI18n();

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <Logo href="/" size="lg" />
        </div>
        <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          {language === "ar" ? "بوابة بلّغ AI — تسجيل الدخول" : "Ballegh AI — Authentification"}
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {language === "ar"
            ? "منظومة موحدة بثلاثة فضاءات مستقلة ومحمية"
            : "Plateforme civique et municipale unifiée • 3 espaces dédiés"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Chargement...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
