"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { LogIn, User, Building2, Shield, ArrowRight } from "lucide-react";
import type { UserRole } from "@/lib/types";

export default function LoginPage() {
  const { t, language } = useI18n();
  const { setActiveRole } = useDemo();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleQuickLogin = (role: UserRole, targetPath: string) => {
    setActiveRole(role);
    router.push(targetPath);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Default demo fallback: citizen
    setActiveRole("citizen");
    router.push("/citizen/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <Logo href="/" size="lg" />
        </div>
        <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          {t("auth.loginTitle")}
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {t("auth.loginSubtitle")}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 sm:px-10">
          {/* Quick Demo Login Box */}
          <div className="mb-6 rounded-xl bg-slate-50 p-4 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5">
              {t("auth.demoQuickLogin")}
            </span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("citizen", "/citizen/dashboard")}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-800 hover:bg-brand-teal-50 hover:border-brand-teal-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-teal-600" />
                  <span>{t("auth.loginAsCitizen")}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("municipal_agent", "/municipal/dashboard")}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-800 hover:bg-blue-50 hover:border-blue-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>{t("auth.loginAsMunicipal")}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("admin", "/admin/dashboard")}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-800 hover:bg-purple-50 hover:border-purple-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>{t("auth.loginAsAdmin")}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 dark:bg-slate-900 font-bold">
                {language === "ar" ? "أو التسجيل العادي" : "Ou saisie manuelle"}
              </span>
            </div>
          </div>

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
                placeholder="citoyen@tunis.tn"
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
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-brand-teal-500 focus:outline-none focus:ring-1 focus:ring-brand-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-navy-900 py-2.5 px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-navy-800 focus:outline-none focus:ring-2 focus:ring-brand-navy-500 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>{t("auth.signInBtn")}</span>
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t("auth.noAccount")}</span>
            <Link
              href="/register"
              className="font-bold text-brand-teal-600 hover:text-brand-teal-700 dark:text-brand-teal-400"
            >
              {t("auth.signUpBtn")}
            </Link>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-center dark:border-slate-800">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
}
