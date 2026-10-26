"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { UserPlus, AlertCircle, CheckCircle2, Loader2, Phone, Mail, Lock, User, MapPin } from "lucide-react";
import { normalizeTunisianPhone } from "@/lib/auth/validation";

export default function RegisterPage() {
  const { t, language } = useI18n();
  const { setActiveRole } = useDemo();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("Bab Souika");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const validateFormClient = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      errors.name =
        language === "ar"
          ? "يجب أن يتكون الاسم من حرفين على الأقل."
          : "Le nom doit comporter au moins 2 caractères.";
    }

    const phoneCheck = normalizeTunisianPhone(phone);
    if (!phoneCheck.isValid) {
      errors.phone =
        language === "ar"
          ? phoneCheck.errorAr || "رقم هاتف تونسي غير صالح (8 أرقام)."
          : phoneCheck.error || "Numéro tunisien invalide (8 chiffres attendus).";
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email =
        language === "ar"
          ? "الرجاء إدخال بريد إلكتروني صالح."
          : "Format d'adresse e-mail invalide.";
    }

    if (!password || password.length < 6) {
      errors.password =
        language === "ar"
          ? "كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل."
          : "Le mot de passe doit comporter au moins 6 caractères.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation préalable côté client
    if (!validateFormClient()) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name.trim(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          district,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Traitement granulaire des erreurs renvoyées par l'API
        if (data.fieldErrors) {
          const apiFieldErrors: Record<string, string> = {};
          if (data.fieldErrors.fullName) apiFieldErrors.name = data.fieldErrors.fullName[0];
          if (data.fieldErrors.name) apiFieldErrors.name = data.fieldErrors.name[0];
          if (data.fieldErrors.phone) apiFieldErrors.phone = data.fieldErrors.phone[0];
          if (data.fieldErrors.email) apiFieldErrors.email = data.fieldErrors.email[0];
          if (data.fieldErrors.password) apiFieldErrors.password = data.fieldErrors.password[0];
          setFieldErrors(apiFieldErrors);
        }

        const msg =
          data.message ||
          data.error ||
          (language === "ar"
            ? "تعذر تسجيل الحساب، يرجى التحقق من صحة المعطيات."
            : "Erreur lors de la création du compte.");
        setErrorMessage(msg);
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        language === "ar"
          ? "تم إنشاء الحساب بنجاح! جاري التوجيه..."
          : "Compte créé avec succès ! Redirection en cours..."
      );

      // Si le store démo local est actif, synchroniser le rôle
      if (typeof setActiveRole === "function") {
        try {
          await setActiveRole("citizen");
        } catch {
          // non-bloquant
        }
      }

      // Redirection immédiate vers le dashboard citoyen
      setTimeout(() => {
        router.push("/citizen/dashboard");
        router.refresh();
      }, 700);
    } catch {
      setErrorMessage(
        language === "ar"
          ? "تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً."
          : "Erreur réseau lors de la communication avec le serveur."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-slate-950">
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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 sm:px-10">
          {/* Bannière d'erreur explicite */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Bannière de succès */}
          {successMessage && (
            <div
              role="status"
              className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Nom & Prénom */}
            <div>
              <label
                htmlFor="register-name"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
              >
                {t("auth.fullName")} *
              </label>
              <div className="relative">
                <input
                  id="register-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: "" });
                  }}
                  placeholder="Ex: Yassine Ben Amor"
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-2xs focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white transition-colors ${
                    fieldErrors.name
                      ? "border-rose-500 focus:ring-rose-400"
                      : "border-slate-300 focus:border-brand-teal-500 focus:ring-brand-teal-500 dark:border-slate-700"
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.name}</p>
              )}
            </div>

            {/* Téléphone Tunisien */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="register-phone"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {t("auth.phone")} *
                </label>
                <span className="text-[11px] text-slate-400">8 chiffres (ex: 98 123 456)</span>
              </div>
              <div className="relative">
                <input
                  id="register-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: "" });
                  }}
                  placeholder="98 123 456 ou +216 98 123 456"
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-2xs focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white transition-colors ${
                    fieldErrors.phone
                      ? "border-rose-500 focus:ring-rose-400"
                      : "border-slate-300 focus:border-brand-teal-500 focus:ring-brand-teal-500 dark:border-slate-700"
                  }`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.phone}</p>
              )}
            </div>

            {/* Arrondissement */}
            <div>
              <label
                htmlFor="register-district"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
              >
                {t("auth.district")} *
              </label>
              <select
                id="register-district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-brand-teal-500 focus:outline-none focus:ring-2 focus:ring-brand-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {tunisDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="register-email"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
              >
                {t("auth.email")} *
              </label>
              <input
                id="register-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" });
                }}
                placeholder="citoyen@tunis.tn"
                className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-2xs focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white transition-colors ${
                  fieldErrors.email
                    ? "border-rose-500 focus:ring-rose-400"
                    : "border-slate-300 focus:border-brand-teal-500 focus:ring-brand-teal-500 dark:border-slate-700"
                }`}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.email}</p>
              )}
            </div>

            {/* Mot de passe */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="register-password"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {t("auth.password")} *
                </label>
                <span className="text-[11px] text-slate-400">Min. 6 caractères</span>
              </div>
              <input
                id="register-password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: "" });
                }}
                placeholder="••••••••"
                className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-2xs focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white transition-colors ${
                  fieldErrors.password
                    ? "border-rose-500 focus:ring-rose-400"
                    : "border-slate-300 focus:border-brand-teal-500 focus:ring-brand-teal-500 dark:border-slate-700"
                }`}
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-teal-600 py-2.5 px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-teal-700 focus:outline-none focus:ring-2 focus:ring-brand-teal-500 transition-colors mt-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>{isLoading ? "Création en cours..." : t("auth.signUpBtn")}</span>
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
