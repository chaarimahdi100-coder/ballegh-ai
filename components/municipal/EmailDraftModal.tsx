"use client";

import React, { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { Report } from "@/lib/types";
import { Mail, Check, X, Send, AlertCircle, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailDraftModalProps {
  report: Report;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSend: () => void;
}

export function EmailDraftModal({
  report,
  isOpen,
  onClose,
  onConfirmSend,
}: EmailDraftModalProps) {
  const { t, language } = useI18n();
  const draft = report.aiAnalysis.generatedEmailDraft;

  const [bodyText, setBodyText] = useState(draft.body);
  const [isEditing, setIsEditing] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSend = () => {
    setIsSent(true);
    setTimeout(() => {
      onConfirmSend();
      onClose();
      setIsSent(false);
    }, 900);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-draft-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-teal-600 text-white">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h3 id="email-draft-title" className="text-sm font-bold text-slate-900 dark:text-white">
                {t("municipal.emailPreviewTitle")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("municipal.emailPreviewDesc")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2 text-xs dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 w-24">
                {t("municipal.emailDepartment")}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {draft.recipientDepartment}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 w-24">
                {t("municipal.emailTo")}
              </span>
              <span className="font-mono text-slate-800 dark:text-slate-200 bg-white px-2 py-0.5 rounded border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                {draft.recipientEmail}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 w-24">
                {t("municipal.emailSubject")}
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {draft.subject}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === "ar" ? "نص المراسلة الرسمية :" : "Corps du message officiel :"}
              </label>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-teal-600 hover:text-brand-teal-700 dark:text-brand-teal-400"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? (language === "ar" ? "معاينة" : "Aperçu") : (language === "ar" ? "تعديل النص" : "Éditer le texte")}</span>
              </button>
            </div>

            {isEditing ? (
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={8}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-900 shadow-xs focus:border-brand-teal-500 focus:outline-none focus:ring-1 focus:ring-brand-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs font-mono whitespace-pre-line leading-relaxed text-slate-800 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                {bodyText}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-teal-50 p-2.5 text-xs text-teal-800 border border-teal-200 dark:bg-teal-950/40 dark:border-teal-900 dark:text-teal-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
            <span>
              {language === "ar"
                ? "في بيئة العرض هذه، يتم حفظ الإجراء وإشعار المواطن بتحديث مسار التدخل دون إرسال رسائل حقيقية."
                : "Dans cet environnement de démonstration, l'action est enregistrée dans le flux sans envoi SMTP externe."}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSent}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-teal-700 focus:outline-none focus:ring-2 focus:ring-brand-teal-500 transition-all disabled:opacity-50"
          >
            {isSent ? (
              <>
                <Check className="h-4 w-4" />
                <span>{language === "ar" ? "تم الإرسال بنجاح..." : "Transmission effectuée..."}</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>{t("municipal.btnSendEmail")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
