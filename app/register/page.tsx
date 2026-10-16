"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { UserPlus, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const { t, language } = useI18n();
  const { setActiveRole } = useDemo();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("Bab Souika");
  const [password, setPassword] = useState("");

  const tunisDistricts = [
    "Bab Souika",
    "Bab El Khadhra",
    "Centre-Ville (Médina / Avenue)",
    "Montplaisir",
    "El Menzah 1",
    "El Manar",
    "Carthage",
    "La Marsa",
    "Sidi Bou Said",
    "El Kram",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
          {t("auth.registerTitle")}
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {t("auth.registerSubtitle")}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t("auth.fullName")}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Yassine Ben Amor"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-brand-teal-500 focus:outline-none focus:ring-1 focus:ring-brand-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t("auth.phone")}
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98 123 456"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-brand-teal-500 focus:outline-none focus:ring-1 focus:ring-brand-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t("auth.district")}
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-brand-teal-500 focus:outline-none focus:ring-1 focus:ring-brand-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {tunisDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t("auth.email")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yassine@example.tn"
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
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-teal-600 py-2.5 px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-teal-700 focus:outline-none focus:ring-2 focus:ring-brand-teal-500 transition-colors mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t("auth.signUpBtn")}</span>
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t("auth.haveAccount")}</span>
            <Link
              href="/login"
              className="font-bold text-brand-navy-900 hover:text-brand-teal-600 dark:text-brand-teal-400"
            >
              {t("auth.signInBtn")}
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
