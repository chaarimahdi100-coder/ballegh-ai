"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import type { IssueCategory } from "@/lib/types";
import {
  Camera,
  MapPin,
  CircleDot,
  Lightbulb,
  CloudRain,
  Upload,
  Bot,
  Sparkles,
  Check,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function NewReportPage() {
  const { t, language } = useI18n();
  const { createReport } = useDemo();
  const router = useRouter();

  const [category, setCategory] = useState<IssueCategory>("pothole");
  const [district, setDistrict] = useState("Bab Souika");
  const [streetAddress, setStreetAddress] = useState("");
  const [description, setDescription] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string>(
    "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedStorage, setUploadedStorage] = useState<{
    storagePath: string;
    mimeType: string;
    fileSizeBytes: number;
  } | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const tunisDistricts = [
    "Bab Souika",
    "Bab El Khadhra",
    "Centre-Ville (Avenue Habib Bourguiba)",
    "Montplaisir",
    "El Menzah 1",
    "El Manar",
    "Carthage Dermech",
    "La Marsa",
    "Sidi Bou Said",
  ];

  const categoryPresets = {
    pothole: {
      photo: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
      aiTag: "Nid-de-poule détecté (94% certitude)",
      aiTagAr: "تم رصد حفرة طريق (نسبة يقين 94%)",
    },
    lighting: {
      photo: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80",
      aiTag: "Éclairage défaillant détecté (91% certitude)",
      aiTagAr: "تم رصد عطب إنارة (نسبة يقين 91%)",
    },
    flooding: {
      photo: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
      aiTag: "Nappe d'eau pluviale détectée (96% certitude)",
      aiTagAr: "تم رصد تجمع مياه أمطار (نسبة يقين 96%)",
    },
  };

  const handleCategorySelect = (cat: IssueCategory) => {
    setCategory(cat);
    if (!uploadedStorage) {
      setPhotoPreview(categoryPresets[cat].photo);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Format de fichier non supporté. Veuillez sélectionner une image (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image trop volumineuse. La taille maximale autorisée est de 5 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoPreview(reader.result);
        setError(null);
      }
    };
    reader.onerror = () => {
      setError("Erreur lors de la lecture du fichier image.");
    };
    reader.readAsDataURL(file);

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const body = await res.json();
        if (body.photo) {
          setUploadedStorage(body.photo);
          setError(null);
        }
      } else {
        const errBody = await res.json().catch(() => ({}));
        setError(errBody.error || "Échec du téléversement de la photo vers le stockage sécurisé.");
      }
    } catch {
      setError("Erreur réseau lors du téléversement de la photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const titleText =
      category === "pothole"
        ? language === "ar" ? "حفرة بالشارع تحتاج تعبيد" : "Nid-de-poule sur voirie"
        : category === "lighting"
        ? language === "ar" ? "انقطاع الإنارة بالحي" : "Panne d'éclairage public"
        : language === "ar" ? "تجمع مياه أمطار" : "Accumulation d'eau pluviale";

    try {
      const newId = await createReport({
        category,
        title: titleText,
        description: description || (language === "ar" ? "بلاغ فوري مسجل عبر التطبيق." : "Signalement citoyen enregistré via l'application."),
        district,
        streetAddress: streetAddress || "Rue principale, Tunis",
        photoStorage: uploadedStorage || undefined,
        photoUrl: uploadedStorage ? undefined : photoPreview,
      });

      router.push(`/citizen/reports/${newId}`);
    } catch (err: any) {
      setError(err.message || (language === "ar" ? "تعذر إرسال البلاغ للخادم" : "Erreur lors de la transmission du signalement."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4 px-1 sm:px-0">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t("citizen.newReportTitle")}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
          {t("citizen.newReportSubtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm font-semibold text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Category Picker */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <label className="block text-xs font-bold uppercase tracking-wider text-brand-teal-700 dark:text-brand-teal-400 mb-3">
            {t("citizen.categoryStep")}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <button
              type="button"
              onClick={() => handleCategorySelect("pothole")}
              className={cn(
                "flex items-center gap-3.5 p-4 rounded-xl border-2 text-start transition-all cursor-pointer",
                category === "pothole"
                  ? "border-brand-teal-600 bg-brand-teal-50/70 text-slate-900 font-bold dark:bg-brand-teal-950/40 dark:text-white dark:border-brand-teal-400 shadow-sm ring-2 ring-brand-teal-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 dark:bg-orange-900/60 dark:text-orange-300">
                <CircleDot className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm sm:text-base font-bold block text-slate-900 dark:text-white leading-tight">
                  {t("categories.pothole")}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                  Voirie & Chaussée
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleCategorySelect("lighting")}
              className={cn(
                "flex items-center gap-3.5 p-4 rounded-xl border-2 text-start transition-all cursor-pointer",
                category === "lighting"
                  ? "border-brand-teal-600 bg-brand-teal-50/70 text-slate-900 font-bold dark:bg-brand-teal-950/40 dark:text-white dark:border-brand-teal-400 shadow-sm ring-2 ring-brand-teal-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 dark:bg-amber-900/60 dark:text-amber-300">
                <Lightbulb className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm sm:text-base font-bold block text-slate-900 dark:text-white leading-tight">
                  {t("categories.lighting")}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                  Lampadaires & Câbles
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleCategorySelect("flooding")}
              className={cn(
                "flex items-center gap-3.5 p-4 rounded-xl border-2 text-start transition-all cursor-pointer",
                category === "flooding"
                  ? "border-brand-teal-600 bg-brand-teal-50/70 text-slate-900 font-bold dark:bg-brand-teal-950/40 dark:text-white dark:border-brand-teal-400 shadow-sm ring-2 ring-brand-teal-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0 dark:bg-cyan-900/60 dark:text-cyan-300">
                <CloudRain className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm sm:text-base font-bold block text-slate-900 dark:text-white leading-tight">
                  {t("categories.flooding")}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                  Égouts & Caniveaux
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Photo Upload */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <label className="block text-xs font-bold uppercase tracking-wider text-brand-teal-700 dark:text-brand-teal-400 mb-1">
            {t("citizen.photoStep")}
          </label>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            {t("citizen.photoHelp")}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative w-full sm:w-56 h-40 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 shrink-0 shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Aperçu du signalement"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 rtl:right-auto rtl:left-2 bg-black/70 backdrop-blur-xs text-white text-xs px-2 py-0.5 rounded-md font-mono font-medium">
                GPS Exif
              </div>
            </div>

            <div className="flex-1 space-y-3 w-full">
              <label
                htmlFor="photo-upload-input"
                className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-teal-500 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 p-5 text-center block transition-all group"
              >
                <input
                  id="photo-upload-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Camera className="w-8 h-8 text-brand-teal-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm text-slate-900 dark:text-white font-bold block">
                  {isUploadingPhoto
                    ? (language === "ar" ? "جاري الرفع الآمن إلى السحابة..." : "Téléversement sécurisé vers Supabase Storage...")
                    : uploadedStorage
                    ? (language === "ar" ? "✓ تم حفظ الصورة في التخزين الآمن" : "✓ Photo enregistrée dans le stockage sécurisé")
                    : (language === "ar" ? "اختيار صورة البلاغ أو التقاطها" : "Choisir une photo de l'incident ou photographier")}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
                  {uploadedStorage
                    ? `${(uploadedStorage.fileSizeBytes / 1024).toFixed(0)} Ko • Stockage privé chiffré`
                    : "Fichiers acceptés : JPG, PNG, WebP (Max 5 Mo)"}
                </span>
              </label>

              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-brand-teal-600 shrink-0" />
                <span>
                  {language === "ar"
                    ? "حماية الخصوصية: يتم حجب الوجوه ولوحات تسجيل السيارات آلياً."
                    : "Protection vie privée : floutage automatique des visages et plaques."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Location */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-brand-teal-700 dark:text-brand-teal-400">
            {t("citizen.locationStep")}
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Arrondissement (Tunis)
              </span>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm sm:text-base text-slate-900 shadow-sm focus:border-brand-teal-500 focus:outline-none focus:ring-2 focus:ring-brand-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all"
              >
                {tunisDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Rue / Point de repère
              </span>
              <input
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="Ex: Rue Halfaouine, devant la pharmacie"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm sm:text-base text-slate-900 shadow-sm focus:border-brand-teal-500 focus:outline-none focus:ring-2 focus:ring-brand-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Step 4: Description */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <label className="block text-xs font-bold uppercase tracking-wider text-brand-teal-700 dark:text-brand-teal-400 mb-1.5">
            {t("citizen.descriptionStep")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder={t("citizen.descriptionPlaceholder")}
            className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm sm:text-base text-slate-900 shadow-sm focus:border-brand-teal-500 focus:outline-none focus:ring-2 focus:ring-brand-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all resize-y min-h-[110px]"
          />
        </div>

        {/* Live AI Pre-triage simulation indicator */}
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-white to-teal-50/40 p-4.5 dark:border-indigo-900/60 dark:bg-indigo-950/20 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-950 dark:text-indigo-200">
              <Bot className="w-5 h-5 text-indigo-600" />
              <span>Aperçu du diagnostic assisté :</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/80 dark:text-indigo-300">
              Ballegh AI v1.2
            </span>
          </div>
          <p className="mt-2 text-sm text-indigo-900 dark:text-indigo-200 font-medium leading-relaxed">
            {language === "ar"
              ? categoryPresets[category].aiTagAr
              : categoryPresets[category].aiTag}
            . Le dossier complet sera transmis en temps réel à l'agent municipal dès validation.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-brand-teal-600 hover:bg-brand-teal-700 active:scale-[0.99] py-4 px-6 text-base font-bold text-white shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-teal-500 focus:ring-offset-2 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <span>Traitement et géoréférencement...</span>
          ) : (
            <>
              <Check className="w-5 h-5" />
              <span>Transmettre le signalement</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
