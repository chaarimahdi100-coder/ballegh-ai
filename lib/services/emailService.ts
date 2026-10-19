/**
 * BALLEGH AI — Service de Transmission Officielle & Notifications
 *
 * Ce service gère l'acheminement des courriels officiels validés par les agents municipaux.
 * Aucune transmission n'est autorisée sans approbation humaine préalable.
 *
 * Fournisseurs pris en charge :
 * 1. Resend (via RESEND_API_KEY et EMAIL_FROM)
 * 2. Serveur SMTP standard (via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
 *
 * En l'absence d'identifiants de transport, le système fonctionne en mode SIMULATION / BROUILLON
 * avec le statut PENDING_SMTP_CONFIG consigné de manière transparente dans la piste d'audit.
 */

import nodemailer from "nodemailer";
import { z } from "zod";
import type { Report } from "@/lib/types";

export interface EmailDispatchResult {
  success: boolean;
  messageId: string;
  recipientEmail: string;
  subject: string;
  deliveredAt: string;
  isSimulated: boolean;
  provider: "resend" | "smtp" | "simulated";
  transportStatus: "SENT" | "PENDING_SMTP_CONFIG" | "DUPLICATE_BLOCKED" | "FAILED";
  notes: string;
  error?: string;
}

const emailRecipientSchema = z.string().email("Adresse email de destination invalide");

// Mock hook for isolated regression testing without sending real emails
let mockEmailTransport: ((params: {
  to: string;
  subject: string;
  body: string;
}) => Promise<{ messageId: string } | null>) | null = null;

export function _setMockEmailTransport(
  mock: ((params: { to: string; subject: string; body: string }) => Promise<{ messageId: string } | null>) | null
): void {
  mockEmailTransport = mock;
}

export function _resetMockEmailTransport(): void {
  mockEmailTransport = null;
}

export async function dispatchOfficialEmail(params: {
  report: Report;
  agentName: string;
  agentRole: string;
  customSubject?: string;
  customBody?: string;
  forceResend?: boolean;
}): Promise<EmailDispatchResult> {
  const now = new Date().toISOString();
  // 1. Contrôle d'éligibilité et approbation humaine obligatoire
  const isAgent = params.agentRole === "municipal_agent" || params.agentRole === "admin";
  if (!isAgent) {
    throw new Error("Sécurité : Seul un agent municipal habilité ou un administrateur peut autoriser une transmission officielle.");
  }

  const isApproved =
    params.report.status === "human_validated" ||
    params.report.status === "forwarded" ||
    params.report.status === "in_progress" ||
    params.report.status === "resolved";

  if (!isApproved) {
    throw new Error("Gating : Transmission impossible sans validation humaine préalable par un agent municipal.");
  }

  const draft = params.report.aiAnalysis?.generatedEmailDraft;
  if (!draft) {
    throw new Error("Le signalement ne comporte pas de projet de courriel technique généré.");
  }

  // 2. Validation du destinataire et du contenu
  const recipient = draft.recipientEmail?.trim() || "";
  const parsedEmail = emailRecipientSchema.safeParse(recipient);
  if (!parsedEmail.success) {
    throw new Error(`Adresse de destination invalide pour le service technique : "${recipient}"`);
  }

  const subject = (params.customSubject || draft.subject).trim();
  if (subject.length < 5) {
    throw new Error("L'objet du message officiel doit comporter au moins 5 caractères.");
  }

  const body = (params.customBody || draft.body).trim();
  if (body.length < 10) {
    throw new Error("Le corps du message officiel doit comporter au moins 10 caractères.");
  }

  // 3. Détection du mode de transport
  const hasSmtp = Boolean(
    (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("placeholder") && process.env.RESEND_API_KEY.trim().length > 0) ||
    (process.env.SMTP_HOST && !process.env.SMTP_HOST.includes("placeholder") && process.env.SMTP_HOST.trim().length > 0)
  );

  // Si aucun serveur SMTP ni transport de test n'est configuré, rester en mode simulation transparent
  if (!hasSmtp && !mockEmailTransport) {
    return {
      success: true,
      messageId: `msg-sim-${Date.now()}`,
      recipientEmail: recipient,
      subject,
      deliveredAt: now,
      isSimulated: true,
      provider: "simulated",
      transportStatus: "PENDING_SMTP_CONFIG",
      notes: `Transmission officielle approuvée par ${params.agentName} (${params.agentRole}). Enregistrée en piste d'audit (Serveur SMTP non configuré dans .env.local).`,
    };
  }

  // 4. Prévention des envois dupliqués (Idempotence pour expédition réelle)
  if (params.report.officialEmailSent && !params.forceResend) {
    return {
      success: false,
      messageId: `dup-${params.report.id}`,
      recipientEmail: recipient,
      subject,
      deliveredAt: now,
      isSimulated: false,
      provider: mockEmailTransport ? "resend" : process.env.RESEND_API_KEY ? "resend" : "smtp",
      transportStatus: "DUPLICATE_BLOCKED",
      notes: "Transmission officielle déjà effectuée pour ce signalement. Réexpédition bloquée par mesure d'idempotence.",
    };
  }

  // 4. Test Mock Transport Override (pour tests unitaires et intégration sans coûts externes)
  if (mockEmailTransport) {
    try {
      const mockResult = await mockEmailTransport({ to: recipient, subject, body });
      if (mockResult) {
        return {
          success: true,
          messageId: mockResult.messageId,
          recipientEmail: recipient,
          subject,
          deliveredAt: now,
          isSimulated: false,
          provider: "resend",
          transportStatus: "SENT",
          notes: `Courriel officiel transmis avec succès au service technique (${draft.recipientDepartment}) [Mock Verified].`,
        };
      }
    } catch (mockErr: any) {
      return {
        success: false,
        messageId: `err-${Date.now()}`,
        recipientEmail: recipient,
        subject,
        deliveredAt: now,
        isSimulated: false,
        provider: "resend",
        transportStatus: "FAILED",
        notes: `Échec du transport : ${mockErr.message}`,
        error: mockErr.message,
      };
    }
  }

  // 5. Option A : Expédition via Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && !resendApiKey.includes("placeholder") && resendApiKey.trim().length > 0) {
    const fromAddress = process.env.EMAIL_FROM || "Ballegh AI <notifications@ballegh.tn>";
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipient],
          subject,
          text: body,
          html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
            <div style="background-color: #059669; color: white; padding: 12px 20px; border-radius: 6px 6px 0 0;">
              <h2 style="margin: 0; font-size: 18px;">بلّغ AI — Transmission Municipale Officielle</h2>
            </div>
            <div style="border: 1px solid #e2e8f0; border-top: none; padding: 20px; border-radius: 0 0 6px 6px;">
              <p><strong>Dossier N° :</strong> ${params.report.referenceNumber}</p>
              <p><strong>Arrondissement :</strong> ${params.report.location.district}</p>
              <p><strong>Agent validateur :</strong> ${params.agentName} (${params.agentRole})</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
              <div style="white-space: pre-wrap;">${body}</div>
            </div>
          </div>`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errMessage = errorData.message || `HTTP ${res.status}`;
        console.error("[emailService] Erreur Resend API:", errMessage);
        return {
          success: false,
          messageId: `err-${Date.now()}`,
          recipientEmail: recipient,
          subject,
          deliveredAt: now,
          isSimulated: false,
          provider: "resend",
          transportStatus: "FAILED",
          notes: `Échec d'expédition Resend API: ${errMessage}`,
          error: errMessage,
        };
      }

      const resendData = await res.json();
      return {
        success: true,
        messageId: resendData.id || `re_${Date.now()}`,
        recipientEmail: recipient,
        subject,
        deliveredAt: now,
        isSimulated: false,
        provider: "resend",
        transportStatus: "SENT",
        notes: `Courriel officiel transmis via Resend API au service (${draft.recipientDepartment}).`,
      };
    } catch (err: any) {
      console.error("[emailService] Erreur réseau Resend:", err.message);
      return {
        success: false,
        messageId: `err-${Date.now()}`,
        recipientEmail: recipient,
        subject,
        deliveredAt: now,
        isSimulated: false,
        provider: "resend",
        transportStatus: "FAILED",
        notes: `Erreur de connexion Resend: ${err.message}`,
        error: err.message,
      };
    }
  }

  // 6. Option B : Expédition via Serveur SMTP (Nodemailer)
  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost && !smtpHost.includes("placeholder") && smtpHost.trim().length > 0) {
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || "Ballegh AI <notifications@ballegh.tn>";

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
        connectionTimeout: 8000,
      });

      const info = await transporter.sendMail({
        from: fromAddress,
        to: recipient,
        subject,
        text: body,
      });

      return {
        success: true,
        messageId: info.messageId,
        recipientEmail: recipient,
        subject,
        deliveredAt: now,
        isSimulated: false,
        provider: "smtp",
        transportStatus: "SENT",
        notes: `Courriel officiel transmis via SMTP (${smtpHost}) au service (${draft.recipientDepartment}).`,
      };
    } catch (err: any) {
      console.error("[emailService] Erreur SMTP:", err.message);
      return {
        success: false,
        messageId: `err-${Date.now()}`,
        recipientEmail: recipient,
        subject,
        deliveredAt: now,
        isSimulated: false,
        provider: "smtp",
        transportStatus: "FAILED",
        notes: `Échec d'expédition SMTP (${smtpHost}): ${err.message}`,
        error: err.message,
      };
    }
  }

  // 7. Mode Démo / Simulation transparente quand aucun fournisseur n'est configuré
  return {
    success: true,
    messageId: `msg-sim-${Date.now()}`,
    recipientEmail: recipient,
    subject,
    deliveredAt: now,
    isSimulated: true,
    provider: "simulated",
    transportStatus: "PENDING_SMTP_CONFIG",
    notes: `Transmission officielle approuvée par ${params.agentName} (${params.agentRole}). Enregistrée en piste d'audit (Serveur SMTP non configuré dans .env.local).`,
  };
}
