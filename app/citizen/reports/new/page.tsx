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
    <div className="max-w-3xl mx-auto py-2">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          {t("citizen.newReportTitle")}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {t("citizen.newReportSubtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Category Picker */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            {t("citizen.categoryStep")}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleCategorySelect("pothole")}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all",
                category === "pothole"
                  ? "border-orange-500 bg-orange-50/50 text-orange-950 font-bold dark:bg-orange-950/40 dark:text-orange-200 ring-2 ring-orange-400/20"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:text-slate-200"
              )}
            >
              <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 dark:bg-orange-900/60 dark:text-orange-300">
                <CircleDot className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs sm:text-sm block">{t("categories.pothole")}</span>
                <span className="text-[10px] text-slate-500 font-normal">Voirie & Chaussée</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleCategorySelect("lighting")}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all",
                category === "lighting"
                  ? "border-amber-500 bg-amber-50/50 text-amber-950 font-bold dark:bg-amber-950/40 dark:text-amber-200 ring-2 ring-amber-400/20"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:text-slate-200"
              )}
            >
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 dark:bg-amber-900/60 dark:text-amber-300">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs sm:text-sm block">{t("categories.lighting")}</span>
                <span className="text-[10px] text-slate-500 font-normal">Lampadaires & Câbles</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleCategorySelect("flooding")}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all",
                category === "flooding"
                  ? "border-cyan-500 bg-cyan-50/50 text-cyan-950 font-bold dark:bg-cyan-950/40 dark:text-cyan-200 ring-2 ring-cyan-400/20"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:text-slate-200"
              )}
            >
              <div className="w-9 h-9 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0 dark:bg-cyan-900/60 dark:text-cyan-300">
                <CloudRain className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs sm:text-sm block">{t("categories.flooding")}</span>
                <span className="text-[10px] text-slate-500 font-normal">Égouts & Caniveaux</span>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Photo Upload */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            {t("citizen.photoStep")}
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {t("citizen.photoHelp")}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-48 h-36 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Aperçu du signalement"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                GPS Exif
              </div>
            </div>

            <div className="flex-1 space-y-2 w-full">
              <label
                htmlFor="photo-upload-input"
                className="cursor-pointer rounded-lg border border-dashed border-slate-300 p-4 text-center dark:border-slate-700 block hover:border-brand-teal-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <input
                  id="photo-upload-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Camera className="w-6 h-6 text-brand-teal-600 mx-auto mb-1" />
                <span className="text-xs text-slate-800 dark:text-slate-200 font-bold block">
                  {isUploadingPhoto
                    ? (language === "ar" ? "جاري الرفع الآمن إلى السحابة..." : "Téléversement sécurisé vers Supabase Storage...")
                    : uploadedStorage
                    ? (language === "ar" ? "✓ تم حفظ الصورة في التخزين الآمن" : "✓ Photo enregistrée dans le stockage sécurisé")
                    : (language === "ar" ? "اختيار صورة البلاغ أو التقاطها" : "Choisir une photo de l'incident ou photographier")}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {uploadedStorage
                    ? `${(uploadedStorage.fileSizeBytes / 1024).toFixed(0)} Ko • Stockage privé chiffré`
                    : "Fichiers acceptés : JPG, PNG, WebP (Max 5 Mo)"}
                </span>
              </label>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            {t("citizen.locationStep")}
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Arrondissement (Tunis)
              </span>
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
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Rue / Point de repère
              </span>
              <input
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="Ex: Rue Halfaouine, devant la pharmacie"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-brand-teal-500 focus:outline-none focus:ring-1 focus:ring-brand-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Step 4: Description */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            {t("citizen.descriptionStep")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder={t("citizen.descriptionPlaceholder")}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 shadow-2xs focus:border-brand-teal-500 focus:outline-none focus:ring-1 focus:ring-brand-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* Live AI Pre-triage simulation indicator */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">
            <Bot className="w-4 h-4 text-indigo-600" />
            <span>Aperçu de l'analyse assistée Ballegh AI :</span>
          </div>
          <p className="mt-1 text-xs text-indigo-800 dark:text-indigo-200">
            {language === "ar"
              ? categoryPresets[category].aiTagAr
              : categoryPresets[category].aiTag}
            . Fiche transmise à l'agent municipal de garde dès soumission.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-teal-600 py-3.5 px-6 text-sm font-bold text-white shadow-md hover:bg-brand-teal-700 focus:outline-none focus:ring-2 focus:ring-brand-teal-500 transition-all disabled:opacity-50"
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
