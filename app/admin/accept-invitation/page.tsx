"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import {
  Shield,
  Lock,
  Mail,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
} from "lucide-react";

interface InvitationData {
  valid: boolean;
  email?: string;
  fullName?: string;
  department?: string;
  expiresAt?: string;
  error?: string;
}

function AcceptInvitationForm() {
  const { language } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isVerifying, setIsVerifying] = useState(true);
  const [invData, setInvData] = useState<InvitationData | null>(null);
  const [tokenInput, setTokenInput] = useState(token || "");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("+216 71 890 123");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const verifyToken = async (tokenToVerify: string) => {
    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/accept-invitation?token=${encodeURIComponent(tokenToVerify.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setInvData({
          valid: false,
          error: data.error || "Jeton d'invitation invalide ou expiré.",
        });
      } else {
        setInvData(data);
      }
    } catch {
      setInvData({
        valid: false,
        error: "Erreur lors de la vérification de l'invitation.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (token) {
      verifyToken(token);
    } else {
      setIsVerifying(false);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const effectiveToken = (token || tokenInput).trim();
    if (!effectiveToken) {
      setErrorMessage(
        language === "ar" ? "يرجى إدخال رمز الدعوة التشفيري." : "Le jeton d'invitation est requis."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(
        language === "ar" ? "كلمتا المرور غير متطابقتين." : "Les mots de passe ne correspondent pas."
      );
      return;
    }

    if (password.length < 8) {
      setErrorMessage(
        language === "ar"
          ? "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل."
          : "Le mot de passe doit comporter au moins 8 caractères."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/accept-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: effectiveToken,
          password,
          phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Échec de l'activation du compte");
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur de traitement");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="py-12 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
        <p className="text-xs text-slate-500 font-medium">
          {language === "ar" ? "جاري التحقق من صلاحية رابط الدعوة..." : "Vérification cryptographique de l'invitation..."}
        </p>
      </div>
    );
  }

  // Token missing state: Allow manual input
  if (!token && !invData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {language === "ar" ? "تفعيل دعوة المشرف" : "Activer une invitation"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === "ar" ? "أدخل رمز الدعوة التشفيري الممنوح لك" : "Saisissez le jeton d'invitation administrateur"}
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (tokenInput.trim()) verifyToken(tokenInput.trim());
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === "ar" ? "رمز الدعوة التشفيري *" : "Jeton d'invitation (Token) *"}
            </label>
            <input
              type="text"
              required
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Ex: 8a7f9b2c3d4e5f60..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 shadow-sm transition-colors cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>{language === "ar" ? "التحقق من الدعوة" : "Valider le jeton"}</span>
          </button>
        </form>
      </div>
    );
  }

  // Token invalid or expired state
  if (invData && !invData.valid) {
    return (
      <div className="py-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto dark:bg-rose-950/60 dark:text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {language === "ar" ? "رابط الدعوة غير صالح أو منتهي" : "Invitation invalide ou expirée"}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          {invData.error ||
            (language === "ar"
              ? "انتهت صلاحية هذا الرمز أو تم استخدامه مسبقاً. يرجى التواصل مع المسؤول الرئيسي لطلب رابط جديد."
              : "Ce jeton d'invitation est invalide, a expiré ou a déjà été utilisé.")}
        </p>

        <div className="pt-2">
          <Link
            href="/login?portal=admin"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>{language === "ar" ? "العودة لبوابة الإدارة" : "Retour au portail d'administration"}</span>
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto dark:bg-emerald-950/60 dark:text-emerald-400">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {language === "ar" ? "تم تفعيل حسابك بنجاح !" : "Compte Administrateur activé avec succès !"}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          {language === "ar"
            ? "تم إنشاء الجلسة المؤمنة. جاري تحويلك تلقائياً إلى لوحة القيادة المركزية..."
            : "Votre session sécurisée est établie. Redirection en cours vers le tableau de bord d'administration..."}
        </p>
        <div className="pt-2">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition-colors"
          >
            <span>{language === "ar" ? "لوحة القيادة الآن" : "Accéder à l'administration"}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    );
  }

  // Active form state with verified invitation
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {language === "ar" ? "تفعيل حساب مدير المنظومة" : "Finalisation du compte Administrateur"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === "ar" ? "دعوة رسمية معتمدة من إدارة بلّغ AI" : "Invitation habilitée par la Direction Municipale"}
          </p>
        </div>
      </div>

      {/* Verified Details Card */}
      <div className="rounded-xl bg-purple-50/70 border border-purple-200 p-4 text-xs text-purple-950 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-200 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-500 dark:text-slate-400">
            {language === "ar" ? "البريد الإلكتروني المعتمد :" : "E-mail invité :"}
          </span>
          <span className="font-mono font-bold text-purple-700 dark:text-purple-300">{invData?.email}</span>
        </div>
        {invData?.fullName && (
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              {language === "ar" ? "الاسم المعين :" : "Nom désigné :"}
            </span>
            <span className="font-bold">{invData.fullName}</span>
          </div>
        )}
        {invData?.department && (
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              {language === "ar" ? "الإدارة / المصلحة :" : "Direction :"}
            </span>
            <span className="font-bold">{invData.department}</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Password Setup Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            {language === "ar" ? "رقم الهاتف المهني" : "Numéro de téléphone"}
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 rtl:left-auto rtl:right-3" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white rtl:pl-3 rtl:pr-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === "ar" ? "كلمة المرور (8 أحرف على الأقل) *" : "Mot de passe (min 8 car.) *"}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 rtl:left-auto rtl:right-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white rtl:pl-3 rtl:pr-9"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === "ar" ? "تأكيد كلمة المرور *" : "Confirmer le mot de passe *"}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 rtl:left-auto rtl:right-3" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white rtl:pl-3 rtl:pr-9"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg py-3 px-4 text-sm font-bold text-white bg-purple-700 hover:bg-purple-800 shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          <span>{language === "ar" ? "تفعيل الحساب والدخول للمنظومة" : "Activer mon compte et me connecter"}</span>
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-8">
          <Logo href="/" size="md" />
          <LanguageSwitcher />
        </div>

        {/* Card */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 sm:px-10">
          <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Chargement...</div>}>
            <AcceptInvitationForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
