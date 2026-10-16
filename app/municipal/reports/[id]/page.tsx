"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/lib/demo/DemoStore";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { PriorityIndicator } from "@/components/common/PriorityIndicator";
import { AIReviewCard } from "@/components/municipal/AIReviewCard";
import { EmailDraftModal } from "@/components/municipal/EmailDraftModal";
import { StatusTimeline } from "@/components/citizen/StatusTimeline";
import { formatDate } from "@/lib/utils";
import type { IssueCategory, SeverityLevel } from "@/lib/types";
import {
  ArrowLeft,
  Check,
  Edit,
  XCircle,
  Mail,
  MapPin,
  Calendar,
  User,
  ShieldAlert,
  Send,
  Building2,
  Clock,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MunicipalReportReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, language } = useI18n();
  const { getReportById, updateHumanReview, sendOfficialEmail, updateReportStatus, activeUser } = useDemo();

  const report = getReportById(id);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedCategory, setEditedCategory] = useState<IssueCategory>(
    report ? report.category : "pothole"
  );
  const [editedSeverity, setEditedSeverity] = useState<SeverityLevel>(
    report ? report.aiAnalysis.estimatedSeverity : 2
  );
  const [decisionNotes, setDecisionNotes] = useState("");
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  if (!report) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold">Dossier introuvable</h2>
        <Link href="/municipal/reports" className="mt-4 inline-block text-brand-teal-600 font-semibold">
          Retour à la file des signalements
        </Link>
      </div>
    );
  }

  const handleAccept = () => {
    updateHumanReview(report.id, "accepted", "Validation conforme aux recommandations du modèle IA.");
    setActionSuccessMessage("Recommandation acceptée. Dossier validé pour transmission.");
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handleReject = () => {
    if (confirm("Confirmer le rejet de ce signalement ?")) {
      updateHumanReview(report.id, "rejected", "Signalement jugé non recevable ou hors périmètre municipal.");
      setActionSuccessMessage("Signalement rejeté.");
      setTimeout(() => setActionSuccessMessage(null), 4000);
    }
  };

  const handleSaveModification = (e: React.FormEvent) => {
    e.preventDefault();
    updateHumanReview(report.id, "modified", decisionNotes, {
      category: editedCategory,
      severity: editedSeverity,
    });
    setIsEditModalOpen(false);
    setActionSuccessMessage("Diagnostic modifié manuellement et validé.");
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar with Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/municipal/reports"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>Retour à la file</span>
        </Link>

        {/* Quick Email button if validated */}
        {(report.status === "human_validated" || report.status === "forwarded") && (
          <button
            type="button"
            onClick={() => setIsEmailModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span>
              {report.officialEmailSent ? "Revoir le courriel transmis" : "Rédiger & Transmettre le courriel"}
            </span>
          </button>
        )}
      </div>

      {actionSuccessMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300">
          <Check className="w-4 h-4" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Main Review Layout: Dossier (Left 2 cols) & Human Review (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dossier Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Info Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-300">
                  {report.referenceNumber}
                </span>
                <CategoryBadge category={report.category} />
                <StatusBadge status={report.status} />
              </div>
              <time className="text-xs text-slate-400">
                {formatDate(report.createdAt, language)}
              </time>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {language === "ar" ? report.title.ar : report.title.fr}
            </h1>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {language === "ar" ? report.description.ar : report.description.fr}
            </p>

            {/* Location & GPS Info */}
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-brand-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {report.location.streetAddress}, {report.location.district}
                  </span>
                  <div className="flex items-center gap-3 text-slate-500 text-[11px] mt-0.5 font-mono">
                    <span>GPS: {report.location.latitude} N, {report.location.longitude} E</span>
                    {report.location.landmark && <span>• {report.location.landmark}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Photo Evidence */}
            {report.photos.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Cliché photographique vérifié
                </span>
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 dark:border-slate-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.photos[0].url}
                    alt="Photo du signalement"
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                    Géoréférencé • Floutage automatique actif
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Decision-Aid Card */}
          <AIReviewCard report={report} />
        </div>

        {/* Human Oversight & Controls Column */}
        <div className="space-y-6">
          {/* Human Decision Box */}
          <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm dark:border-teal-900/60 dark:bg-slate-900 space-y-4">
            <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-brand-teal-600" />
                <span>{t("municipal.humanControls")}</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t("municipal.humanApprovalHelp")}
              </p>
            </div>

            {/* Decision Status */}
            {report.humanReview ? (
              <div className="rounded-xl bg-teal-50 p-3 border border-teal-200 text-xs dark:bg-teal-950/40 dark:border-teal-900 text-teal-900 dark:text-teal-200 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Dossier approuvé par {report.humanReview.reviewedBy}</span>
                </span>
                <p className="text-[11px] text-teal-800 dark:text-teal-300">
                  {report.humanReview.decisionNotes || "Recommandation confirmée sans réserve."}
                </p>
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {(report.status === "ai_analyzed" || report.status === "received") && (
                <>
                  <button
                    type="button"
                    onClick={handleAccept}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-teal-600 hover:bg-brand-teal-700 text-white p-3 text-xs font-bold shadow-sm transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>{t("municipal.btnAcceptRecommendation")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 p-2.5 text-xs font-semibold shadow-2xs transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>{t("municipal.btnModifyRecommendation")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReject}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 p-2.5 text-xs font-semibold transition-colors dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{t("municipal.btnRejectReport")}</span>
                  </button>
                </>
              )}

              {report.status === "human_validated" && !report.officialEmailSent && (
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white p-3 text-xs font-bold shadow-sm transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Transmettre le courriel au service technique</span>
                </button>
              )}

              {report.status === "forwarded" && (
                <button
                  type="button"
                  onClick={() => {
                    updateReportStatus(report.id, "in_progress", {
                      fr: "Équipe technique dépêchée sur le terrain à Tunis.",
                      ar: "تم توجيه الفريق الفني الميداني للموقع في تونس.",
                    });
                    setActionSuccessMessage("Intervention terrain marquée en cours.");
                    setTimeout(() => setActionSuccessMessage(null), 3000);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white p-3 text-xs font-bold shadow-sm transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  <span>Déclarer l'intervention terrain en cours</span>
                </button>
              )}

              {report.status === "in_progress" && (
                <button
                  type="button"
                  onClick={() => {
                    updateReportStatus(report.id, "resolved", {
                      fr: "Travaux terminés avec succès par le service municipal.",
                      ar: "تم إنهاء الأشغال بنجاح من طرف المصلحة البلدية.",
                    });
                    setActionSuccessMessage("Dossier clôturé. Statut mis à jour à : Résolu.");
                    setTimeout(() => setActionSuccessMessage(null), 3000);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white p-3 text-xs font-bold shadow-sm transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Clôturer le signalement (Travaux achevés)</span>
                </button>
              )}

              {report.status === "resolved" && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Intervention clôturée avec succès</span>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Technical Service Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Service Technique Destinataire
            </h3>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs dark:bg-slate-800/60 dark:border-slate-700 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">
                {report.aiAnalysis.generatedEmailDraft.recipientDepartment}
              </p>
              <p className="text-[11px] font-mono text-slate-500">
                {report.aiAnalysis.generatedEmailDraft.recipientEmail}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsEmailModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 py-2 text-xs font-semibold transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Mail className="w-3.5 h-3.5 text-brand-teal-600" />
              <span>Consulter le modèle de courriel</span>
            </button>
          </div>

          {/* Status Timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Historique d'audit</span>
            </h3>
            <StatusTimeline timeline={report.timeline} />
          </div>
        </div>
      </div>

      {/* Email Preview Modal */}
      <EmailDraftModal
        report={report}
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onConfirmSend={() => {
          sendOfficialEmail(report.id);
          setActionSuccessMessage("Courriel officiel approuvé et enregistré dans l'historique.");
          setTimeout(() => setActionSuccessMessage(null), 4000);
        }}
      />

      {/* Manual Modification Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Modifier le diagnostic d'intervention
            </h3>

            <form onSubmit={handleSaveModification} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catégorie d'infrastructure
                </label>
                <select
                  value={editedCategory}
                  onChange={(e) => setEditedCategory(e.target.value as IssueCategory)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="pothole">Nid-de-poule & Chaussée (DVRD)</option>
                  <option value="lighting">Éclairage Public</option>
                  <option value="flooding">Inondations & Eaux Pluviales</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Gravité réévaluée
                </label>
                <select
                  value={editedSeverity}
                  onChange={(e) => setEditedSeverity(Number(e.target.value) as SeverityLevel)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value={1}>1 - Faible (Gêne mineure)</option>
                  <option value={2}>2 - Moyenne (Sécurité à moyen terme)</option>
                  <option value={3}>3 - Critique (Urgence immédiate)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motif de l'ajustement humain
                </label>
                <textarea
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  required
                  placeholder="Ex: Constat terrain montrant une profondeur supérieure à la photo..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-teal-700"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
