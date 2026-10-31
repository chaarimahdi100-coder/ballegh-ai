"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import {
  Building2,
  User,
  Mail,
  Phone,
  Briefcase,
  Lock,
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MUNICIPALITIES = [
  "Commune de Tunis",
  "Commune de Carthage",
  "Commune de La Marsa",
  "Commune de Sidi Bou Saïd",
  "Commune du Bardo",
  "Commune de La Goulette",
  "Commune de La Manouba",
  "Autre municipalité",
];

const DEPARTMENTS = [
  "Direction de la Voirie et Travaux (DVRD)",
  "Service Éclairage Public (DEP-ECL)",
  "Service Assainissement et Eaux Pluviales (DAEP)",
  "Direction des Systèmes d'Information (DSI)",
  "Cellule de Crise et Sécurité Urbaine",
  "Direction de l'Hygiène et Environnement",
  "Direction Générale des Services Techniques",
];

export default function MunicipalRequestAccessPage() {
  const { t, language } = useI18n();
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    municipality: "Commune de Tunis",
    department: "Direction de la Voirie et Travaux (DVRD)",
    jobTitle: "",
    password: "",
    confirmPassword: "",
    notes: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage(
        language === "ar"
          ? "كلمتا المرور غير متطابقتين."
          : "Les deux mots de passe ne correspondent pas."
      );
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage(
        language === "ar"
          ? "يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل."
          : "Le mot de passe doit comporter au moins 8 caractères."
      );
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/municipal/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          municipality: formData.municipality,
          department: formData.department,
          jobTitle: formData.jobTitle,
          password: formData.password,
          notes: formData.notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Échec de l'envoi de la demande d'accès");
      }

      setIsSuccess(true);
      setRequestId(data.request?.id || null);
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur de connexion au serveur");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl px-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-8">
          <Logo href="/" size="md" />
          <LanguageSwitcher />
        </div>

        {/* Card */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 sm:px-10">
          {/* Back link */}
          <Link
            href="/login?portal=municipal"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>{language === "ar" ? "العودة لتسجيل الدخول البلدي" : "Retour à la connexion municipale"}</span>
          </Link>

          {!isSuccess ? (
            <>
              {/* Title Section */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                    {language === "ar" ? "طلب تصريح وصول — الفضاء البلدي" : "Demande d'accès Espace Municipal"}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === "ar"
                      ? "استمارة انضمام للأعوان والإطارات الفنية للبلديات التونسية"
                      : "Réservé aux agents habilités et cadres techniques des communes"}
                  </p>
                </div>
              </div>

              {/* Informational Banner */}
              <div className="mb-6 rounded-xl bg-blue-50/80 border border-blue-200 p-4 text-xs text-blue-900 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {language === "ar" ? "إجراءات اعتماد محكمة" : "Procédure d'habilitation municipale"}
                  </p>
                  <p className="mt-1 opacity-90 leading-relaxed">
                    {language === "ar"
                      ? "تسجل الطلبات الجديدة بصفة «قيد المراجعة». لا يتم تفعيل الحساب أو منح الصلاحيات البلدية إلا بعد مراجعة وموافقة إدارة المنظومة."
                      : "Toute nouvelle demande est enregistrée avec le statut « En attente ». L'accès effectif aux dossiers d'incidents n'est activé qu'après vérification et approbation par l'administration."}
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="mb-6 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === "ar" ? "الاسم واللقب *" : "Nom et prénom *"}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 rtl:left-auto rtl:right-3" />
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder={language === "ar" ? "مثال: م. سميرة الطرابلسي" : "Ex: Ing. Samira Trabelsi"}
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white rtl:pl-3 rtl:pr-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === "ar" ? "البريد الإلكتروني المهني *" : "E-mail professionnel *"}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 rtl:left-auto rtl:right-3" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="agent@commune-tunis.gov.tn"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white rtl:pl-3 rtl:pr-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Phone & Municipality */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === "ar" ? "رقم الهاتف المهني (+216) *" : "Téléphone professionnel (+216) *"}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 rtl:left-auto rtl:right-3" />
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+216 71 345 678"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white rtl:pl-3 rtl:pr-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === "ar" ? "البلدية *" : "Municipalité *"}
                    </label>
                    <select
                      value={formData.municipality}
                      onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {MUNICIPALITIES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Department & Job Title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === "ar" ? "المصلحة / الإدارة الفنية *" : "Service / Direction technique *"}
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === "ar" ? "الخطة الوظيفية / المنصب *" : "Fonction / Poste occupé *"}
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 rtl:left-auto rtl:right-3" />
                      <input
                        type="text"
                        required
                        value={formData.jobTitle}
                        onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                        placeholder={language === "ar" ? "مثال: مهندس أول رئيس مصلحة" : "Ex: Ingénieur principal voirie"}
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white rtl:pl-3 rtl:pr-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Password & Confirm */}
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
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white rtl:pl-3 rtl:pr-9"
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
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white rtl:pl-3 rtl:pr-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "ar" ? "ملاحظات أو مبررات الانضمام (اختياري)" : "Remarques complémentaires / Justificatif (optionnel)"}
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 rtl:left-auto rtl:right-3" />
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder={
                        language === "ar"
                          ? "بيان المهام الميدانية أو الرقم التعريفي البلدي..."
                          : "Numéro de matricule ou mission technique spécifique..."
                      }
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white rtl:pl-3 rtl:pr-9"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg py-3 px-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                  <span>{language === "ar" ? "إرسال طلب الانضمام" : "Soumettre ma demande d'accès"}</span>
                </button>
              </form>
            </>
          ) : (
            /* Success confirmation screen */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {language === "ar" ? "تم إرسال طلبك بنجاح !" : "Demande d'accès soumise avec succès !"}
              </h2>
              <div className="max-w-md mx-auto text-xs text-slate-600 dark:text-slate-300 space-y-2 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <p>
                  {language === "ar" ? (
                    <>
                      تم تسجيل طلبك بعنوان البريد الإلكتروني <strong className="text-blue-600">{formData.email}</strong> تحت
                      المراجعة الفنية (حالة: <strong>قيد الانتظار</strong>).
                    </>
                  ) : (
                    <>
                      Votre demande pour l'adresse <strong className="text-blue-600">{formData.email}</strong> a été enregistrée
                      avec le statut <strong>EN ATTENTE</strong>.
                    </>
                  )}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  {language === "ar"
                    ? "سيتولى مدير المنظومة دراسة بياناتك الوظيفية وتفعيل حسابك. ستتمكن من تسجيل الدخول مباشرة فور الموافقة."
                    : "La Direction Municipale examinera vos habilitations. Dès validation, vous pourrez vous connecter immédiatement avec votre mot de passe."}
                </p>
                {requestId && (
                  <p className="text-[10px] text-slate-400 pt-1 font-mono">
                    Réf. Demande: {requestId}
                  </p>
                )}
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/login?portal=municipal")}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  {language === "ar" ? "الانتقال إلى صفحة الدخول" : "Retour à la page de connexion"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  {language === "ar" ? "الصفحة الرئيسية" : "Accueil Ballegh AI"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
